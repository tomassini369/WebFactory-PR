import crypto from "node:crypto";

export function athError(message, status = 400) { return Object.assign(new Error(message), { status }); }

export function validateAthCredentials(publicToken, privateToken) {
  const tokens = { publicToken: String(publicToken || "").trim(), privateToken: String(privateToken || "").trim() };
  for (const token of Object.values(tokens)) {
    if (!/^[A-Za-z0-9_-]{16,512}$/.test(token) || token === "dummy") throw athError("Enter the public and private tokens from ATH Business Settings, not the business pATH.");
  }
  return tokens;
}

function key() {
  const secret = globalThis.Netlify?.env?.get("WEBFACTORY_TOKEN_ENCRYPTION_KEY");
  if (!secret) throw athError("Secure ATH credential storage is not configured. Contact WebFactory support.", 503);
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptAthCredentials(siteId, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(`ath:${siteId}`));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

export function decryptAthCredentials(siteId, value) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(value.iv, "base64"));
  decipher.setAAD(Buffer.from(`ath:${siteId}`));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, "base64")), decipher.final()]).toString("utf8"));
}

export function athReady(site) {
  return Boolean(site?.paymentRules?.methods?.ath && site.paymentRules?.ath?.credentialsConfigured && site.paymentRules?.ath?.credentialVersion);
}

export function assertAthAmount(record) {
  if (!Number.isSafeInteger(record.amountTotal) || record.amountTotal < 100 || record.amountTotal > 150000 || record.currency !== "usd") throw athError("ATH Móvil accepts payments from $1.00 to $1,500.00 USD.");
}

export function matchAthPayment(payments, session, record) {
  // Empty results and browser callbacks are never proof of payment.
  const rows = Array.isArray(payments) ? payments : (payments?.data && Array.isArray(payments.data) ? payments.data : [payments?.data || payments]);
  const row = rows.find((payment) => payment?.referenceNumber === session.referenceNumber && payment.metadata1 === session.metadata1 && payment.metadata2 === session.metadata2);
  if (!row || row.status !== "COMPLETED" || row.transactionType !== "ECOMMERCE") throw athError("ATH has not confirmed this payment yet. Try verification again.", 409);
  if (Math.round(Number(row.total) * 100) !== record.amountTotal || Number(row.totalRefundedAmount || row.totalRefundAmount || 0) > 0) throw athError("ATH payment amount does not match this order. Contact the business.", 409);
  return row;
}

export function safeAthJson(value) { return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"); }
