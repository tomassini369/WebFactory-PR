import crypto from "node:crypto";
import { clientOAuthStore, clientCommerceStore, commerceKey, patchClientSite } from "./client-store.mjs";
import { assertAthAmount, athError, athReady, encryptAthCredentials, decryptAthCredentials, validateAthCredentials } from "./ath-domain.mjs";
import { detectDeployContext } from "./stripe-runtime.mjs";

export function assertAthProduction(requestUrl) {
  const context = globalThis.Netlify?.context?.deploy?.context || globalThis.Netlify?.env?.get("CONTEXT") || "";
  if (detectDeployContext({ context, requestUrl }) !== "production") throw athError("Live ATH payments and credentials are disabled in previews and Training.", 503);
}

export async function configureAth(site, payload) {
  const credentials = validateAthCredentials(payload.publicToken, payload.privateToken);
  const version = crypto.randomUUID();
  const encrypted = encryptAthCredentials(site.siteId, credentials);
  await clientOAuthStore().setJSON(`ath/tokens/${site.siteId}.json`, { encrypted, version, updatedAt: new Date().toISOString() });
  return patchClientSite(site.siteId, { paymentRules: {
    ...site.paymentRules, methods: { ...site.paymentRules?.methods, ath: true },
    ath: { publicPath: String(payload.publicPath || "").trim().slice(0, 120), credentialsConfigured: true, credentialVersion: version, status: "credentials_saved", configuredAt: new Date().toISOString(), verifiedAt: "" },
  } });
}

export async function createAthCheckout(site, record, { lang = "en", returnUrl = "", requestUrl = "" } = {}) {
  assertAthProduction(requestUrl);
  if (!athReady(site)) throw athError("This business must save its ATH Business tokens first.", 409);
  assertAthAmount(record);
  const stored = await clientOAuthStore().get(`ath/tokens/${site.siteId}.json`, { type: "json" });
  if (!stored?.encrypted || stored.version !== site.paymentRules.ath.credentialVersion) throw athError("ATH credentials must be configured again.", 409);
  // Validate decryption before creating a session. The private token never enters a site or transaction response.
  decryptAthCredentials(site.siteId, stored.encrypted);
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const session = { siteId: site.siteId, transactionId: record.transactionId, encrypted: stored.encrypted, credentialVersion: stored.version,
    metadata1: crypto.randomUUID(), metadata2: crypto.createHash("sha256").update(site.siteId).digest("hex").slice(0, 40),
    lang: lang === "es" ? "es" : "en", returnUrl, checkoutExpiresAt: new Date(Date.now() + 30 * 60000).toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), createdAt: new Date().toISOString() };
  const checkoutUrl = new URL(`/.netlify/functions/ath-checkout?token=${token}`, requestUrl).href;
  await clientOAuthStore().setJSON(`ath/sessions/${site.siteId}/${hash}.json`, session);
  await clientOAuthStore().setJSON(`ath/session-index/${hash}.json`, { siteId: site.siteId });
  await clientCommerceStore().setJSON(commerceKey(site.siteId, "transactions", record.transactionId), { ...record, paymentProvider: "ath_movil", paymentMethod: "ath_movil", athSessionHash: hash, checkoutUrl });
  return { ok: true, paymentRequired: true, checkoutUrl, transactionId: record.transactionId, provider: "ath_movil" };
}

export async function getAthSession(token) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(String(token || ""))) throw athError("ATH checkout is unavailable.", 404);
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const pointer = await clientOAuthStore().get(`ath/session-index/${hash}.json`, { type: "json" });
  const storageKey = pointer?.siteId ? `ath/sessions/${pointer.siteId}/${hash}.json` : "";
  const session = storageKey ? await clientOAuthStore().get(storageKey, { type: "json" }) : null;
  if (!session || Date.parse(session.expiresAt) < Date.now()) throw athError("ATH checkout has expired. Start a new checkout.", 410);
  const record = await clientCommerceStore().get(commerceKey(session.siteId, "transactions", session.transactionId), { type: "json" });
  if (!record || record.paymentProvider !== "ath_movil" || record.athSessionHash !== hash) throw athError("ATH transaction is unavailable.", 404);
  return { session, record, hash, storageKey };
}

export async function searchAthPayment(credentials, referenceNumber, metadata1, metadata2) {
  // Only the read-only search service is used here. Never trust a client-supplied paid status or total.
  let response;
  try { response = await fetch("https://www.athmovil.com/api/v4/searchTransaction", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ...credentials, referenceNumber, metadata1, metadata2 }), signal: AbortSignal.timeout(15000),
  }); } catch { throw athError("ATH verification is temporarily unavailable. Try again.", 503); }
  let body;
  try { body = await response.json(); } catch { throw athError("ATH returned an unexpected verification response. Contact the business.", 502); }
  if (!response.ok || body?.status === "error") throw athError("ATH could not verify this payment. Check your ATH Business tokens or try again.", 409);
  return body;
}
