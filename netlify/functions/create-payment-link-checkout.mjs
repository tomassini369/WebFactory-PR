import crypto from "node:crypto";
import { clientCommerceStore, commerceKey, getClientSiteBySlug } from "../lib/client-store.mjs";
import { cleanText, publicBaseUrl, validEmail } from "../lib/order-store.mjs";
import { siteEntitlement } from "../lib/subscription-billing.mjs";
import { calculateTax } from "../lib/webfactory-v3-domain.mjs";
import { listV3Records } from "../lib/webfactory-v3-store.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

async function verifyMerchantCapability(accountId) {
  const params = new URLSearchParams();
  params.append("include[]", "configuration.merchant");
  const response = await fetch(`https://api.stripe.com/v2/core/accounts/${encodeURIComponent(accountId)}?${params}`, {
    headers: { Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`, "Stripe-Version": "2026-08-26.preview" },
  });
  const account = await response.json();
  if (!response.ok) throw new Error(account?.error?.message || "Stripe account status could not be verified.");
  return account.configuration?.merchant?.capabilities?.card_payments?.status || "pending";
}

function appendLine(params, index, name, amount, quantity = 1) {
  params.set(`line_items[${index}][price_data][currency]`, "usd");
  params.set(`line_items[${index}][price_data][product_data][name]`, cleanText(name, 250));
  params.set(`line_items[${index}][price_data][unit_amount]`, String(amount));
  params.set(`line_items[${index}][quantity]`, String(quantity));
}

async function findPaymentLink(siteId, token) {
  const rows = await listV3Records(siteId, "payment-links", { limit: 1000 });
  return rows.find((row) => row.token === token) || null;
}

export default async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    const payload = await req.json();
    const slug = cleanText(payload.slug, 80);
    const token = cleanText(payload.token, 200);
    const site = await getClientSiteBySlug(slug);
    if (!site || !siteEntitlement(site).public) throw Object.assign(new Error("Payment link is unavailable."), { status: 404 });

    const link = await findPaymentLink(site.siteId, token);
    if (!link || link.active === false) throw Object.assign(new Error("Payment link is unavailable."), { status: 404 });
    if (link.expiresAt && Date.parse(link.expiresAt) <= Date.now()) throw Object.assign(new Error("Payment link has expired."), { status: 410 });

    const customer = {
      name: cleanText(payload.customer?.name, 180),
      email: cleanText(payload.customer?.email, 320).toLowerCase(),
      phone: cleanText(payload.customer?.phone, 80),
    };

export const config = { rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip"] } };
    if (!customer.name || !validEmail(customer.email)) throw Object.assign(new Error("Customer name and a valid email are required."), { status: 400 });

    const quantity = link.allowQuantity ? Math.max(1, Math.min(20, Math.floor(Number(payload.quantity || 1)))) : 1;
    const checkoutAttemptId = cleanText(payload.checkoutAttemptId, 120).replace(/[^a-zA-Z0-9_-]/g, "");
    if (checkoutAttemptId.length < 8) throw Object.assign(new Error("A valid checkout attempt ID is required."), { status: 400 });
    const baseAmount = Math.max(1, Number(link.amount || 0)) * quantity;
    const catalogItem = link.catalogItemId ? (site.catalog || []).find((item) => item.id === link.catalogItemId) : null;
    if (link.catalogItemId && !catalogItem) throw Object.assign(new Error("This payment link item is no longer available."), { status: 409 });
    if (catalogItem?.type === "product" && catalogItem.trackInventory && catalogItem.inventory !== null && catalogItem.inventory !== undefined && !catalogItem.allowBackorder && quantity > Number(catalogItem.inventory || 0)) {
      throw Object.assign(new Error(`${catalogItem.name || "Item"} does not have enough inventory.`), { status: 409 });
    }
    const taxable = catalogItem ? catalogItem.taxable !== false : site.taxConfig?.defaultTaxable !== false;
    const tax = calculateTax({
      amountCents: baseAmount,
      taxable,
      taxRateOverride: catalogItem?.taxRateOverride ?? null,
      config: site.taxConfig || {},
    });

    const accountId = site.paymentRules?.stripeConnectedAccountId;
    if (!accountId || !site.paymentRules?.methods?.stripe) throw Object.assign(new Error("Online payments are not connected for this business."), { status: 409 });
    if (await verifyMerchantCapability(accountId) !== "active") throw Object.assign(new Error("This business must finish Stripe verification before accepting payments."), { status: 409 });

    const transactionId = `txn_pl_${checkoutAttemptId}`;
    const existing = await clientCommerceStore().get(commerceKey(site.siteId, "transactions", transactionId), { type: "json" });
    if (existing?.checkoutUrl && existing?.source === "payment_link") {
      return Response.json({ ok: true, checkoutUrl: existing.checkoutUrl, transactionId, reused: true }, { headers: { "Cache-Control": "no-store" } });
    }
    const title = cleanText(link.title || "Payment", 220);
    const record = {
      transactionId,
      siteId: site.siteId,
      kind: "order",
      source: "payment_link",
      paymentLinkId: link.paymentLinkId,
      customer,
      items: [{ id: link.catalogItemId || link.paymentLinkId, name: title, quantity, unitAmount: Number(link.amount) }],
      subtotal: tax.taxableBase,
      tax: tax.taxCents,
      amountTotal: tax.totalCents,
      currency: "usd",
      paymentStatus: "pending",
      status: "payment_pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${publicBaseUrl()}/pay/${encodeURIComponent(site.slug)}/${encodeURIComponent(link.token)}?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${publicBaseUrl()}/pay/${encodeURIComponent(site.slug)}/${encodeURIComponent(link.token)}?checkout=cancelled`);
    params.set("customer_email", customer.email);
    params.set("client_reference_id", transactionId);
    params.set("metadata[flow]", "webfactory_client_commerce");
    params.set("metadata[site_id]", site.siteId);
    params.set("metadata[transaction_id]", transactionId);
    params.set("metadata[kind]", "order");
    params.set("metadata[source]", "payment_link");
    params.set("metadata[payment_link_id]", link.paymentLinkId);

    appendLine(params, 0, title, Number(link.amount), quantity);
    if (tax.taxCents > 0 && !site.taxConfig?.pricesIncludeTax) appendLine(params, 1, "Puerto Rico IVU", tax.taxCents, 1);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
        "Stripe-Account": accountId,
        "Stripe-Version": "2026-07-29.dahlia",
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `payment-link-${link.paymentLinkId}-${checkoutAttemptId}`,
      },
      body: params,
    });
    const session = await response.json();
    if (!response.ok) throw new Error(session?.error?.message || "Checkout could not be created.");

    record.stripeAccountId = accountId;
    record.stripeSessionId = session.id;
    record.checkoutUrl = session.url;
    await clientCommerceStore().setJSON(commerceKey(site.siteId, "transactions", transactionId), record);

    return Response.json({ ok: true, checkoutUrl: session.url, transactionId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, message: error?.message || "Payment link checkout could not be prepared." }, { status: Number(error?.status || 500), headers: { "Cache-Control": "no-store" } });
  }
};
