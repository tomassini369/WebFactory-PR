import crypto from 'node:crypto';

const DAY_MS = 86_400_000;
const ordersPattern = /^([^/]+)\/orders\/[^/]+\.json$/;
const json = {type: 'json'};
const version = 2;

export const orderTurnIndexStateKey = siteId => `${siteId}/state-v${version}.json`;

function branchKey(locationId) {
  return crypto.createHash('sha256')
    .update(JSON.stringify([typeof locationId, locationId]))
    .digest('hex');
}

function dateKey(day) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function indexPrefix(siteId, utcDay, fallback = false) {
  const namespace = fallback ? 'turn-fallback' : 'turns';
  return `${siteId}/${namespace}-v${version}/${dateKey(utcDay)}/`;
}

async function* listKeys(store, prefix) {
  const pages = store.list({prefix, paginate: true});
  for await (const page of pages[Symbol.asyncIterator] ? pages : [await pages]) {
    for (const blob of page.blobs || []) yield blob.key;
  }
}

function orderTurnReference(orderKey, row) {
  const match = ordersPattern.exec(orderKey);
  if (!match || !row?.queueNumber || row.paymentStatus === 'due') return null;
  const paid = Date.parse(row.paidAt || row.createdAt);
  if (!Number.isFinite(paid)) return null;
  const siteId = match[1];
  if (row.siteId && row.siteId !== siteId) throw new Error('Order tenant mismatch.');
  const utcDay = Math.floor(paid / DAY_MS);
  const suffix = `${branchKey(row.locationId)}/${Buffer.from(orderKey).toString('base64url')}`;
  return {
    key: indexPrefix(siteId, utcDay) + suffix,
    fallbackKey: indexPrefix(siteId, utcDay, true) + suffix,
  };
}

const writeReference = (store, key) => store.setJSON(key, {version}, {onlyIfNew: true});

export function withOrderTurnIndex(store, getIndex) {
  return new Proxy(store, {
    get(target, property) {
      if (property === 'setJSON') {
        return async (key, row, options) => {
          const reference = orderTurnReference(key, row);
          if (reference) {
            // Readers verify the order, so a reference left by a failed order write is harmless.
            try { await writeReference(getIndex(), reference.key); }
            catch { await writeReference(target, reference.fallbackKey); }
          }
          return target.setJSON(key, row, options);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export async function indexedOrderTurnKeys(index, commerce, siteId, localDay, branch) {
  const state = await index.get(orderTurnIndexStateKey(siteId), json);
  if (state?.version !== version || state.siteId !== siteId || state.status !== 'ready') return null;
  const time = Date.parse(localDay);
  if (!Number.isFinite(time)) return null;
  const utcDay = Math.floor(time / DAY_MS);
  const suffix = branch ? `${branchKey(branch.locationId)}/` : '';
  const keys = new Set();
  async function readBucket(store, prefix) {
    for await (const ref of listKeys(store, prefix + suffix)) {
      const key = Buffer.from(ref.slice(ref.lastIndexOf('/') + 1), 'base64url').toString();
      if (!key.startsWith(`${siteId}/orders/`) || !ordersPattern.test(key)) {
        throw new Error('Invalid order index reference.');
      }
      keys.add(key);
    }
  }
  // Adjacent UTC buckets cover the business's local day across time zones and DST.
  await Promise.all([-1, 0, 1].flatMap(offset => [
    readBucket(index, indexPrefix(siteId, utcDay + offset)),
    readBucket(commerce, indexPrefix(siteId, utcDay + offset, true)),
  ]));
  return [...keys].sort();
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
    const reference = orderTurnReference(key, row);
    if (reference) await writeReference(index, reference.key);
    state.after = key;
    state.processed++;
    if (clock() - started > 15_000) break;
  }
  if (!keys.length || state.after === keys.at(-1)) state.status = 'ready';
  await index.setJSON(stateKey, state);
  return state;
}
