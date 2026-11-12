import crypto from "node:crypto";
import { clientCommerceStore, clientOrderTurnIndexStore, commerceKey, getClientSite } from "../lib/client-store.mjs";

import {indexedOrderTurnKeys} from "../lib/order-turn-index.mjs";

const TURN_CACHE_MS = 10_000;
const TURN_CACHE_GROUPS = 32;

async function readTurns(store, keys, siteId, locationId, formatter, day) {
  const paid = [];
  for (let index = 0; index < keys.length; index += 40) {
    const batch = await Promise.all(keys.slice(index, index + 40).map(key => store.get(key, { type: "json" })));
    for (const candidate of batch) {
      if (candidate?.queueNumber && (!candidate.siteId || candidate.siteId === siteId) && candidate.paymentStatus !== "due" && candidate.locationId === locationId && formatter.format(new Date(candidate.paidAt || candidate.createdAt)) === day) paid.push(candidate);
    }
  }
  paid.sort((a, b) => Date.parse(a.paidAt || a.createdAt) - Date.parse(b.paidAt || b.createdAt) || String(a.transactionId).localeCompare(String(b.transactionId)));
  const turns = new Map();
  for (const [index, candidate] of paid.entries()) {
    if (!turns.has(candidate.transactionId)) turns.set(candidate.transactionId, index + 1);
  }
  return turns;
}

export function createPublicOrderTrackingHandler({ getStore = clientCommerceStore, getSite = getClientSite, getIndex = clientOrderTurnIndexStore, clock = Date.now } = {}) {
  // In-process cache for computed ranks only. The order and its access token are still checked on every request.
  const snapshots = new Map();
  function startSnapshot(key, load) {
    if (snapshots.size >= TURN_CACHE_GROUPS && !snapshots.has(key)) {
      snapshots.delete(snapshots.keys().next().value);
    }
    const entry = { expiresAt: clock() + TURN_CACHE_MS, pending: true, result: null };
    entry.result = Promise.resolve().then(load).catch(error => {
      if (snapshots.get(key) === entry) snapshots.delete(key);
      throw error;
    }).finally(() => { entry.pending = false; });
    snapshots.set(key, entry);
    return entry;
  }

  async function getTurn(store, siteId, record, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    const day = formatter.format(new Date(record.paidAt));
    const key = JSON.stringify([siteId, typeof record.locationId, record.locationId, timeZone, day]);
    const load = async () => {
      let keys;
      try { keys = await indexedOrderTurnKeys(getIndex(), siteId, record.locationId, record.paidAt); }
      catch { /* Preserve tracking if index storage is unavailable. */ }
      const canonicalKey = commerceKey(siteId, 'orders', record.transactionId);
      if (!keys?.includes(canonicalKey)) {
        const result = await store.list({prefix: `${siteId}/orders/`});
        keys = (result.blobs || []).map(blob => blob.key);
      }
      return readTurns(store, keys, siteId, record.locationId, formatter, day);
    };
    const cached = snapshots.get(key);
    const reusable = cached && (cached.pending || cached.expiresAt > clock());
    const entry = reusable ? cached : startSnapshot(key, load);
    let turns = await entry.result;
    // A newly paid order can be missing from a snapshot that was already in use.
    if (reusable && !turns.has(record.transactionId) && record.paymentStatus !== "due") {
      const current = snapshots.get(key);
      const refreshed = current && current !== entry ? current : startSnapshot(key, load);
      turns = await refreshed.result;
    }
    return turns.get(record.transactionId) || 0;
  }

  return async req => {
    if (req.method !== "GET") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    const token = new URL(req.url).searchParams.get("token") || "";
    if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return Response.json({ ok: false, message: "Tracking link is invalid." }, { status: 404 });
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const store = getStore();
    const pointer = await store.get(`tracking/${hash}.json`, { type: "json" });
    if (!pointer?.siteId || !pointer?.transactionId) return Response.json({ ok: false, message: "Order not found." }, { status: 404 });
    const record = await store.get(commerceKey(pointer.siteId, "orders", pointer.transactionId), { type: "json" })
      || await store.get(commerceKey(pointer.siteId, "bookings", pointer.transactionId), { type: "json" })
      || await store.get(commerceKey(pointer.siteId, "transactions", pointer.transactionId), { type: "json" });
    if (!record || (record.siteId && record.siteId !== pointer.siteId) || record.trackingHash !== hash) return Response.json({ ok: false, message: "Order not found." }, { status: 404 });
    let turnNumber = 0;
    if (record.kind === "order" && record.queueNumber && record.paidAt) {
      const site = await getSite(pointer.siteId);
      const timeZone = site?.settings?.timezone || "America/Puerto_Rico";
      turnNumber = await getTurn(store, pointer.siteId, record, timeZone);
    }
    return Response.json({ ok: true, order: {
      kind: record.kind, items: (record.items || []).map(({ name, quantity }) => ({ name, quantity })),
      status: record.status, paymentStatus: record.paymentStatus, kitchenStatus: record.kitchenStatus || "",
      queueNumber: record.queueNumber || "", turnNumber, locationName: record.locationName || "",
      updatedAt: record.updatedAt || record.createdAt, paidAt: record.paidAt || "",
    } }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  };
}

export default createPublicOrderTrackingHandler();
