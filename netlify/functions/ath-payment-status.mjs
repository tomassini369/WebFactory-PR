import crypto from "node:crypto";
import { assertSameOrigin } from "../lib/client-auth.mjs";
import { clientCommerceStore, clientOAuthStore, commerceKey } from "../lib/client-store.mjs";
import { assertAthProduction, getAthSession, searchAthPayment } from "../lib/ath-movil.mjs";
import { athError, decryptAthCredentials, matchAthPayment } from "../lib/ath-domain.mjs";
import { settleAthPayment } from "../lib/ath-settlement.mjs";

export default async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    assertSameOrigin(req); assertAthProduction(req.url);
    const payload = await req.json();
    const { session, record, storageKey } = await getAthSession(payload.token);
    if (record.athSettledAt) return Response.json({ ok: true, paid: true, referenceNumber: record.athReferenceNumber, receiptId: record.receiptId }, { headers: { "Cache-Control": "no-store" } });
    const referenceNumber = String(payload.referenceNumber || "").trim();
    if (!/^[A-Za-z0-9_-]{8,180}$/.test(referenceNumber)) throw athError("A valid ATH payment reference is required.");
    const credentials = decryptAthCredentials(session.siteId, session.encrypted);
    const payments = await searchAthPayment(credentials, referenceNumber, session.metadata1, session.metadata2);
    const payment = matchAthPayment(payments, { ...session, referenceNumber }, record);
    const claimKey = commerceKey(session.siteId, "ath-references", crypto.createHash("sha256").update(referenceNumber).digest("hex"));
    const claim = await clientCommerceStore().setJSON(claimKey, { transactionId: record.transactionId }, { onlyIfNew: true });
    if (!claim.modified) {
      const previous = await clientCommerceStore().get(claimKey, { type: "json" });
      if (previous?.transactionId !== record.transactionId) throw athError("This ATH payment was already applied to another order.", 409);
    }
    const settled = await settleAthPayment(session, payment);
    // Completed checkouts no longer need a copy of the business credentials.
    await clientOAuthStore().setJSON(storageKey,{...session,encrypted:null,completedAt:new Date().toISOString()});
    return Response.json({ ok: true, paid: true, referenceNumber, receiptId: settled.receiptId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, message: error?.status ? error.message : "ATH verification could not be completed. Try again or contact the business." }, { status: error?.status || 500, headers: { "Cache-Control": "no-store" } });
  }
};

export const config = { rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip"] } };
