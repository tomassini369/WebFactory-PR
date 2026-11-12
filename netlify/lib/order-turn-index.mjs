import crypto from 'node:crypto';

const DAY_MS = 86_400_000;
const ordersPattern = /^([^/]+)\/orders\/[^/]+\.json$/;
const json = {type: 'json'};
const version = 1;

export const orderTurnIndexStateKey = siteId => `${siteId}/state-v1.json`;

function branchKey(locationId) {
  return crypto.createHash('sha256')
    .update(JSON.stringify([typeof locationId, locationId]))
    .digest('hex');
}

function dateKey(day) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function indexPrefix(siteId, locationId, utcDay) {
  return `${siteId}/turns-v1/${branchKey(locationId)}/${dateKey(utcDay)}/`;
}

async function* listKeys(store, prefix) {
  const pages = store.list({prefix, paginate: true});
  for await (const page of pages[Symbol.asyncIterator] ? pages : [await pages]) {
    for (const blob of page.blobs || []) yield blob.key;
  }
}

export async function writeOrderTurnReference(getIndex, orderKey, row) {
  const match = ordersPattern.exec(orderKey);
  if (!match || !row?.queueNumber || row.paymentStatus === 'due') return;
  const paid = Date.parse(row.paidAt || row.createdAt);
  if (!Number.isFinite(paid)) return;
  const siteId = match[1];
  if (row.siteId && row.siteId !== siteId) throw new Error('Order tenant mismatch.');
  const prefix = indexPrefix(siteId, row.locationId, Math.floor(paid / DAY_MS));
  const reference = Buffer.from(orderKey).toString('base64url');
  await getIndex().setJSON(prefix + reference, {version}, {onlyIfNew: true});
}

export function withOrderTurnIndex(store, getIndex) {
  return new Proxy(store, {
    get(target, property) {
      if (property === 'setJSON') {
        return async (key, row, options) => {
          // Write the reference first. Readers verify the canonical row, so abandoned references are harmless.
          await writeOrderTurnReference(getIndex, key, row);
          return target.setJSON(key, row, options);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export async function indexedOrderTurnKeys(index, siteId, locationId, paidAt) {
  const state = await index.get(orderTurnIndexStateKey(siteId), json);
  if (state?.version !== version || state.siteId !== siteId || state.status !== 'ready') return null;
  const paid = Date.parse(paidAt);
  if (!Number.isFinite(paid)) return null;
  const utcDay = Math.floor(paid / DAY_MS);
  const keys = new Set();
  // Adjacent UTC buckets include the whole local date, even on a longer DST day.
  const offsets = [-2, -1, 0, 1, 2];
  for (const offset of offsets) {
    const prefix = indexPrefix(siteId, locationId, utcDay + offset);
    for await (const ref of listKeys(index, prefix)) {
      const key = Buffer.from(ref.slice(prefix.length), 'base64url').toString();
      if (!key.startsWith(`${siteId}/orders/`) || !ordersPattern.test(key)) return null;
      keys.add(key);
    }
  }
  return [...keys];
}

export async function buildOrderTurnIndexPage(commerce, index, siteId, {limit = 100, clock = Date.now} = {}) {
  const stateKey = orderTurnIndexStateKey(siteId);
  const saved = await index.get(stateKey, json);
  if (saved?.version === version && saved.siteId === siteId && saved.status === 'ready') return saved;
  const valid = saved?.version === version && saved.siteId === siteId;
  const state = {version, siteId, status: 'building', after: valid ? saved.after : '', processed: valid ? saved.processed : 0};
  const started = clock();
  const keys = [];
  for await (const key of listKeys(commerce, `${siteId}/orders/`)) {
    if (key > state.after) keys.push(key);
  }
  keys.sort();
  for (const key of keys.slice(0, limit)) {
    const row = await commerce.get(key, json);
    if (row) await writeOrderTurnReference(() => index, key, row);
    state.after = key;
    state.processed++;
    if (clock() - started > 15_000) break;
  }
  if (!keys.length || state.after === keys.at(-1)) state.status = 'ready';
  await index.setJSON(stateKey, state);
  return state;
}
