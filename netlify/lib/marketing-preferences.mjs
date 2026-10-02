import crypto from "node:crypto";
import { clientEventStore, emailHash } from "./client-store.mjs";
import { publicBaseUrl } from "./platform-utils.mjs";

export const tokenHash = token => crypto.createHash("sha256").update(token).digest("hex");
export const preferenceKey = (siteId, email) => `${siteId}/marketing-suppression/${emailHash(email)}.json`;

export async function reviewEmailEligible(site, request, store = clientEventStore()) {
  if (!site.reviewSettings?.postalAddress?.trim() || request.customer?.reviewOptIn !== true) return false;
  return !(await store.get(preferenceKey(site.siteId, request.customer.email), { type: "json" }))?.unsubscribed;
}

export async function unsubscribeUrl(siteId, email, store = clientEventStore()) {
  const token = crypto.randomBytes(32).toString("base64url");
  await store.setJSON(`${siteId}/marketing-unsubscribe/${tokenHash(token)}.json`, { siteId, emailHash: emailHash(email) });
  return `${publicBaseUrl()}/.netlify/functions/marketing-unsubscribe?siteId=${encodeURIComponent(siteId)}&token=${token}`;
}

export async function unsubscribeToken(token, siteId, store = clientEventStore()) {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(siteId) || !/^[a-zA-Z0-9_-]{43}$/.test(token)) return false;
  const pointer = await store.get(`${siteId}/marketing-unsubscribe/${tokenHash(token)}.json`, { type: "json" });
  if (pointer?.siteId !== siteId || !pointer.emailHash) return false;
  await store.setJSON(`${pointer.siteId}/marketing-suppression/${pointer.emailHash}.json`, { unsubscribed: true, updatedAt: new Date().toISOString() });
  return true;
}
