import crypto from "node:crypto";
import { createBookingHold } from "../lib/booking-engine.mjs";
import { clientCommerceStore, commerceKey, getClientSite, getClientSiteBySlug } from "../lib/client-store.mjs";
import { cleanText, publicBaseUrl, validEmail } from "../lib/platform-utils.mjs";
import { siteEntitlement } from "../lib/subscription-billing.mjs";
import { assertStripeWriteAllowed } from "../lib/stripe-runtime.mjs";
import { calculateTax } from "../lib/webfactory-v3-domain.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

function randomLetters(length = 8) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return Array.from(crypto.randomBytes(length), (value) => alphabet[value % alphabet.length]).join("");
}

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

function localizedText(item, lang, field) {
  if (field === "name") return lang === "es" ? (item.nameEs || item.nameEn || item.name || "") : (item.nameEn || item.name || item.nameEs || "");
  return lang === "es" ? (item.descriptionEs || item.descriptionEn || item.description || "") : (item.descriptionEn || item.description || item.descriptionEs || "");
}

function canonicalCart(site, requested, lang) {
  if (!Array.isArray(requested) || requested.length === 0 || requested.length > 20) throw Object.assign(new Error("Choose between 1 and 20 catalog items."), { status: 400 });
  return requested.map((entry) => {
    const item = (site.catalog || []).find((candidate) => candidate.id === entry.id && candidate.active !== false && !candidate.requiresAppointment);
    if (!item) throw Object.assign(new Error("A selected catalog item is unavailable."), { status: 409 });
    const quantity = Math.max(1, Math.min(20, Math.floor(Number(entry.quantity || 1))));
    if (item.inventory !== null && item.inventory !== undefined && quantity > Number(item.inventory)) {
      throw Object.assign(new Error(`${localizedText(item, lang, "name")} does not have enough inventory.`), { status: 409 });
    }
    return { id: item.id, name: localizedText(item, lang, "name"), description: localizedText(item, lang, "description"), quantity, unitAmount: Math.round(Number(item.price) * 100) };
  });
}

function appendLine(params, index, item) {
  params.set(`line_items[${index}][price_data][currency]`, "usd");
  params.set(`line_items[${index}][price_data][product_data][name]`, item.name.slice(0, 250));
  if (item.description) params.set(`line_items[${index}][price_data][product_data][description]`, item.description.slice(0, 450));
  params.set(`line_items[${index}][price_data][unit_amount]`, String(item.unitAmount));
  params.set(`line_items[${index}][quantity]`, String(item.quantity));
}

export default async (req) => {
  if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    const payload = await req.json();
    const site = payload.siteId ? await getClientSite(payload.siteId) : await getClientSiteBySlug(payload.slug);
    if (!site) throw Object.assign(new Error("Business site not found."), { status: 404 });
    if (!siteEntitlement(site).public) throw Object.assign(new Error("Business site is not available."), { status: 404 });
    const customer = {
      name: cleanText(payload.customer?.name, 180),
      email: cleanText(payload.customer?.email, 320),
      phone: cleanText(payload.customer?.phone, 80),
    };
    if (!customer.name || !validEmail(customer.email)) throw Object.assign(new Error("Customer name and a valid email are required."), { status: 400 });

    const lang = payload.lang === "es" ? "es" : "en";
    const transactionId = `txn_${crypto.randomUUID()}`;
    let hold = null;
    let items;
    let kind;
    if (payload.booking) {
      kind = "booking";
      const service = (site.catalog || []).find((item) => item.id === payload.booking.serviceId && item.type === "service" && item.requiresAppointment && item.active !== false);
      const employee = (site.employees || []).find((member) => member.id === payload.booking.employeeId && member.active !== false && (member.serviceIds || []).includes(service?.id));
      if (!service || !employee) throw Object.assign(new Error("The selected service or employee is unavailable."), { status: 409 });
      hold = await createBookingHold(site, payload.booking);
      const fullAmount = Math.round(Number(service.price) * 100);
      const unitAmount = site.paymentRules?.bookingPayment === "deposit"
        ? Math.round(fullAmount * Number(site.paymentRules?.bookingDepositPercent || 25) / 100)
        : fullAmount;
      const serviceName = localizedText(service, lang, "name");
      items = [{ id: service.id, name: site.paymentRules?.bookingPayment === "deposit" ? `${lang === "es" ? "Depósito" : "Deposit"} — ${serviceName}` : serviceName, description: `${employee.name} · ${new Date(hold.start).toLocaleString(lang === "es" ? "es-PR" : "en-US", { timeZone: site.settings?.timezone || "America/Puerto_Rico" })}`, quantity: 1, unitAmount }];
    } else {
      kind = "order";
      items = canonicalCart(site, payload.items, lang);
    }

    const inPerson = kind === "booking"
      ? site.paymentRules?.bookingPayment === "in_person"
      : site.paymentRules?.productPayment === "in_person";
    const subtotal = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
    let taxCents = 0;
    if (kind === "order") {
      for (const item of items) {
        const catalogItem = (site.catalog || []).find((entry) => entry.id === item.id);
        const line = calculateTax({
          amountCents: item.unitAmount * item.quantity,
          taxable: catalogItem ? catalogItem.taxable !== false : site.taxConfig?.defaultTaxable !== false,
          taxRateOverride: catalogItem?.taxRateOverride ?? null,
          config: site.taxConfig || {},
        });
        taxCents += Number(line.taxCents || 0);
      }
    } else {
      const service = (site.catalog || []).find((entry) => entry.id === items[0]?.id);
      const line = calculateTax({
        amountCents: subtotal,
        taxable: service ? service.taxable !== false : site.taxConfig?.defaultTaxable !== false,
        taxRateOverride: service?.taxRateOverride ?? null,
        config: site.taxConfig || {},
      });
      taxCents = Number(line.taxCents || 0);
    }

    const record = {
      transactionId, siteId: site.siteId, kind, customer, items, holdId: hold?.holdId || "",
      serviceId: hold?.serviceId || "", employeeId: hold?.employeeId || "", start: hold?.start || "", end: hold?.end || "",
      subtotal, tax: taxCents, amountTotal: subtotal + (site.taxConfig?.pricesIncludeTax ? 0 : taxCents), currency: "usd",
      paymentStatus: inPerson ? "due" : "pending", status: inPerson ? "confirmed" : "payment_pending",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    if (inPerson) {
      await clientCommerceStore().setJSON(commerceKey(site.siteId, kind === "booking" ? "bookings" : "orders", transactionId), record);
      return Response.json({ ok: true, paymentRequired: false, transactionId, status: record.status });
    }

    const accountId = site.paymentRules?.stripeConnectedAccountId;
    if (!accountId || !site.paymentRules?.methods?.stripe) throw Object.assign(new Error("Online payments are not connected for this business."), { status: 409 });
    assertStripeWriteAllowed();
    const capability = await verifyMerchantCapability(accountId);
    if (capability !== "active") throw Object.assign(new Error("This business must finish Stripe verification before accepting payments."), { status: 409 });

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${publicBaseUrl()}/sites/${encodeURIComponent(site.slug)}?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${publicBaseUrl()}/sites/${encodeURIComponent(site.slug)}?checkout=cancelled`);
    params.set("customer_email", customer.email);
    params.set("client_reference_id", transactionId);
    params.set("metadata[flow]", "webfactory_client_commerce");
    params.set("metadata[site_id]", site.siteId);
    params.set("metadata[transaction_id]", transactionId);
    params.set("metadata[kind]", kind);
    if (hold?.holdId) params.set("metadata[hold_id]", hold.holdId);
    params.set("integration_identifier", `webfactory_${randomLetters(8)}`);
    items.forEach((item, index) => appendLine(params, index, item));
    if (taxCents > 0 && !site.taxConfig?.pricesIncludeTax) appendLine(params, items.length, { name: "Puerto Rico IVU", description: "", unitAmount: taxCents, quantity: 1 });

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
        "Stripe-Account": accountId,
        "Stripe-Version": "2026-07-29.dahlia",
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `client-checkout-${transactionId}`,
      },
      body: params,
    });
    const session = await response.json();
    if (!response.ok) throw new Error(session?.error?.message || "Checkout could not be created.");
    record.stripeAccountId = accountId;
    record.stripeSessionId = session.id;
    await clientCommerceStore().setJSON(commerceKey(site.siteId, "transactions", transactionId), record);
    return Response.json({ ok: true, paymentRequired: true, checkoutUrl: session.url, transactionId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, message: error?.message || "Checkout could not be prepared." }, { status: Number(error?.status || 500), headers: { "Cache-Control": "no-store" } });
  }
};
