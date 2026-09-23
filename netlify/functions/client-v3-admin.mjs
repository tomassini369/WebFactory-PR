import { assertSameOrigin, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { cleanText } from "../lib/order-store.mjs";
import { createCustomerRecord, createPaymentLinkRecord } from "../lib/webfactory-v3-domain.mjs";
import { sendEmail } from "../lib/email.mjs";
import { getV3Record, listV3Records, putV3Record } from "../lib/webfactory-v3-store.mjs";

const allowedCollections = new Set(["customers", "payment-links", "receipts", "inventory-movements"]);

export default async (req) => {
  try {
    const url = new URL(req.url);
    const siteId = cleanText(url.searchParams.get("siteId"), 120);
    const collection = cleanText(url.searchParams.get("collection"), 80);

    if (req.method === "GET") {
      await requireSiteAccess(siteId);
      if (!allowedCollections.has(collection)) {
        throw Object.assign(new Error("Invalid V3 collection."), { status: 400 });
      }
      const records = await listV3Records(siteId, collection, { limit: Number(url.searchParams.get("limit") || 250) });
      return Response.json({ ok: true, records }, { headers: { "Cache-Control": "no-store" } });
    }

    if (req.method !== "POST") {
      return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    }

    assertSameOrigin(req);
    const payload = await req.json();
    const { user, site } = await requireSiteAccess(payload.siteId, ["owner", "manager"]);
    const action = cleanText(payload.action, 80);

    if (action === "create_payment_link") {
      const record = createPaymentLinkRecord({
        siteId: site.siteId,
        slug: site.slug,
        input: payload.value || {},
        createdBy: user.email || user.id,
      });
      await putV3Record(site.siteId, "payment-links", record.paymentLinkId, record);
      return Response.json({ ok: true, record }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "set_payment_link_active") {
      const id = cleanText(payload.paymentLinkId, 180);
      const current = await getV3Record(site.siteId, "payment-links", id);
      if (!current) throw Object.assign(new Error("Payment link not found."), { status: 404 });
      const record = { ...current, active: Boolean(payload.active), updatedAt: new Date().toISOString() };
      await putV3Record(site.siteId, "payment-links", id, record);
      return Response.json({ ok: true, record }, { headers: { "Cache-Control": "no-store" } });
    }


    if (action === "resend_receipt") {
      const receiptId = cleanText(payload.receiptId, 180);
      const receipt = await getV3Record(site.siteId, "receipts", receiptId);
      if (!receipt) throw Object.assign(new Error("Receipt not found."), { status: 404 });
      if (!receipt.customer?.email) throw Object.assign(new Error("Receipt has no customer email."), { status: 409 });
      const lines = (receipt.items || []).map((item) => `- ${item.name} × ${item.quantity}: ${(Number(item.amount || 0) / 100).toFixed(2)}`);
      const text = [
        `Receipt from ${site.business?.name || "WebFactory Business"}`,
        "",
        `Receipt: ${receipt.receiptId}`,
        `Transaction: ${receipt.transactionId}`,
        ...lines,
        receipt.tax ? `IVU: ${(Number(receipt.tax || 0) / 100).toFixed(2)}` : "",
        `Total: ${(Number(receipt.total || 0) / 100).toFixed(2)}`,
        "",
        "Payment verified securely.",
      ].filter(Boolean).join("\n");
      await sendEmail({
        category: "team",
        fromName: site.business?.name || "WebFactory Business",
        to: receipt.customer.email,
        subject: `${site.business?.name || "Business"} — receipt ${receipt.receiptId}`,
        text,
      });
      const record = { ...receipt, lastSentAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await putV3Record(site.siteId, "receipts", receipt.receiptId, record);
      return Response.json({ ok: true, record }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "upsert_customer") {
      const value = payload.value || {};
      let existing = null;
      if (value.customerId) existing = await getV3Record(site.siteId, "customers", cleanText(value.customerId, 180));
      const record = createCustomerRecord({ siteId: site.siteId, customer: value, existing });
      await putV3Record(site.siteId, "customers", record.customerId, record);
      return Response.json({ ok: true, record }, { headers: { "Cache-Control": "no-store" } });
    }

    throw Object.assign(new Error("Unsupported V3 action."), { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
};
