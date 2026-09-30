import crypto from "node:crypto";
import { clientCommerceStore, commerceKey, getClientSite } from "../lib/client-store.mjs";

export default async (req) => {
  if (req.method !== "GET") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return Response.json({ ok: false, message: "Tracking link is invalid." }, { status: 404 });
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const store = clientCommerceStore();
  const pointer = await store.get(`tracking/${hash}.json`, { type: "json" });
  if (!pointer?.siteId || !pointer?.transactionId) return Response.json({ ok: false, message: "Order not found." }, { status: 404 });
  const record = await store.get(commerceKey(pointer.siteId, "orders", pointer.transactionId), { type: "json" })
    || await store.get(commerceKey(pointer.siteId, "bookings", pointer.transactionId), { type: "json" })
    || await store.get(commerceKey(pointer.siteId, "transactions", pointer.transactionId), { type: "json" });
  if (!record || record.trackingHash !== hash) return Response.json({ ok: false, message: "Order not found." }, { status: 404 });
  let turnNumber = 0;
  if (record.kind === "order" && record.queueNumber && record.paidAt) {
    const site = await getClientSite(pointer.siteId);
    const timeZone = site?.settings?.timezone || "America/Puerto_Rico";
    const localDay = (date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
    const list = await store.list({ prefix: `${pointer.siteId}/orders/` });
    const paid = [];
    const blobs = list.blobs || [];
    for (let index = 0; index < blobs.length; index += 40) {
      const batch = await Promise.all(blobs.slice(index, index + 40).map((blob) => store.get(blob.key, { type: "json" })));
      for (const candidate of batch) {
        if (candidate?.queueNumber && candidate.paymentStatus !== "due" && candidate.locationId === record.locationId && localDay(candidate.paidAt || candidate.createdAt) === localDay(record.paidAt)) paid.push(candidate);
      }
    }
    paid.sort((a, b) => Date.parse(a.paidAt || a.createdAt) - Date.parse(b.paidAt || b.createdAt) || String(a.transactionId).localeCompare(String(b.transactionId)));
    turnNumber = Math.max(0, paid.findIndex((candidate) => candidate.transactionId === record.transactionId) + 1);
  }
  return Response.json({ ok: true, order: {
    kind: record.kind, items: (record.items || []).map(({ name, quantity }) => ({ name, quantity })),
    status: record.status, paymentStatus: record.paymentStatus, kitchenStatus: record.kitchenStatus || "",
    queueNumber: record.queueNumber || "", turnNumber, locationName: record.locationName || "",
    updatedAt: record.updatedAt || record.createdAt, paidAt: record.paidAt || "",
  } }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
};
