import {verifyMerchantCapability} from '../lib/stripe-merchant-capability.mjs';
import { bookingBalance, kioskBookingCodeKey } from '../lib/kiosk-bookings.mjs';
import { clientCheckoutReturn } from '../lib/client-checkout-return.mjs';
import { createCheckoutAttemptHandler } from '../lib/checkout-attempt.mjs';
import { issueBuyerReceiptAccess } from '../lib/buyer-receipt-access.mjs';
import { availableInventory } from '../lib/inventory-availability.mjs';
import { createInPersonOrder } from '../lib/in-person-orders.mjs';
import { createReservedStripeCheckout, stripeClient, checkoutParameters } from '../lib/reserved-stripe-checkout.mjs';
import { syncBookingCalendar } from "../lib/booking-calendar.mjs";
import { sendBookingConfirmationEmails } from "../lib/client-notifications.mjs";
import { bookingManageUrl } from "../lib/booking-email-template.mjs";
import { bookingCalendarUrl } from "../lib/booking-calendar-export.mjs";
import crypto from "node:crypto";
import { createBookingHold } from "../lib/booking-engine.mjs";
import { clientCommerceStore, commerceKey, getClientSite, getClientSiteBySlug } from "../lib/client-store.mjs";
import { cleanText, publicBaseUrl, validEmail } from "../lib/platform-utils.mjs";
import { siteEntitlement } from "../lib/subscription-billing.mjs";
import { assertStripeWriteAllowed } from "../lib/stripe-runtime.mjs";
import { calculateTax } from "../lib/webfactory-v3-domain.mjs";
import { createAthCheckout } from "../lib/ath-movil.mjs";
import { assertSameOrigin, errorResponse } from "../lib/client-auth.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

function randomLetters(length = 8) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return Array.from(crypto.randomBytes(length), (value) => alphabet[value % alphabet.length]).join("");
}


function localizedText(item, lang, field) {
  if (field === "name") return lang === "es" ? (item.nameEs || item.nameEn || item.name || "") : (item.nameEn || item.name || item.nameEs || "");
  return lang === "es" ? (item.descriptionEs || item.descriptionEn || item.description || "") : (item.descriptionEn || item.description || item.descriptionEs || "");
}

function canonicalCart(site, requested, lang) {
  if (!Array.isArray(requested) || requested.length === 0 || requested.length > 20) throw Object.assign(new Error("Choose between 1 and 20 catalog items."), { status: 400 });
  const ids = new Set();
  for (const entry of requested) {
    const quantity = Number(entry.quantity ?? 1);
    if (!entry.id || ids.has(entry.id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw Object.assign(new Error("Use unique catalog items and quantities between 1 and 20."), { status: 400 });
    }
    ids.add(entry.id);
  }
  return requested.map((entry) => {
    const item = (site.catalog || []).find((candidate) => candidate.id === entry.id && candidate.active !== false && !candidate.requiresAppointment);
    if (!item) throw Object.assign(new Error("A selected catalog item is unavailable."), { status: 409 });
    const quantity = Math.max(1, Math.min(20, Math.floor(Number(entry.quantity || 1))));
    if (item.type==='product'&&item.trackInventory&&item.inventory!=null&&!item.allowBackorder&&quantity>Number(availableInventory(site,item))) {
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

export async function performCheckout(req, { kiosk = false, kioskQr = false, balanceBooking = null, balanceAttempt = "" } = {}) {
  if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    assertSameOrigin(req);
    const payload = await req.json();
    const site = payload.siteId ? await getClientSite(payload.siteId) : await getClientSiteBySlug(payload.slug);
    if (!site) throw Object.assign(new Error("Business site not found."), { status: 404 });
    if (!siteEntitlement(site).public) throw Object.assign(new Error("Business site is not available."), { status: 404 });
    const customer = {
      name: cleanText(payload.customer?.name, 180),
      email: cleanText(payload.customer?.email, 320),
      phone: cleanText(payload.customer?.phone, 80),
      reviewOptIn: payload.customer?.reviewOptIn === true,
    };
    if (!customer.name || !validEmail(customer.email)) throw Object.assign(new Error("Customer name and a valid email are required."), { status: 400 });

    const lang = payload.lang === "es" ? "es" : "en";
    const transactionId = `txn_${crypto.randomUUID()}`;
    const locations = (site.business?.locations || []).filter((location) => location.active !== false);
    const locationId = cleanText(payload.locationId || payload.booking?.locationId, 120);
    if (locations.length && (!locationId || !locations.some((location) => location.id === locationId))) {
      throw Object.assign(new Error("Choose an available location."), { status: 400 });
    }
    const selectedLocation = locations.find((location) => location.id === locationId);
    let hold = null;
    let items;
    let kind;
    let balanceTaxCents=0;
    if (balanceBooking) {
      if (!kiosk || balanceBooking.siteId !== site.siteId || balanceBooking.locationId !== locationId || balanceBooking.status !== "confirmed") throw Object.assign(new Error("Booking unavailable."),{status:409});
      const balance=await bookingBalance(clientCommerceStore(),balanceBooking);
      if(!balance.known||balance.due<=0)throw Object.assign(new Error("Balance requires review."),{status:409});
      kind="order";
      balanceTaxCents=balance.taxDue||0;
      items=[{id:balanceBooking.serviceId,name:lang==="es"?"Saldo de cita":"Booking balance",quantity:1,unitAmount:balance.due-(balanceBooking.pricesIncludeTax?0:balanceTaxCents)}];
    } else if (payload.booking) {
      kind = "booking";
      const service = (site.catalog || []).find((item) => item.id === payload.booking.serviceId && item.type === "service" && item.requiresAppointment && item.active !== false);
      const employee = (site.employees || []).find((member) => member.id === payload.booking.employeeId && member.active !== false && (member.serviceIds || []).includes(service?.id) && (!locations.length || (locationId && (member.locationIds || []).includes(locationId))));
      if (!service || !employee) throw Object.assign(new Error("The selected service or employee is unavailable."), { status: 409 });
      hold = await createBookingHold(site, { ...payload.booking, locationId },{strictGoogle:true});
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

    const inPerson = balanceBooking ? false : kind === "booking"
      ? site.paymentRules?.bookingPayment === "in_person"
      : site.paymentRules?.productPayment === "in_person";
    const subtotal = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
    let taxCents = 0;
    if (balanceBooking) {
      taxCents=balanceTaxCents;
    } else if (kind === "order") {
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

    let bookingTotalCents,bookingTaxCents;
    if(kind==="booking"){
      const service=site.catalog.find(x=>x.id===hold.serviceId);
      const full=Math.round(Number(service.price)*100);
      const bookingInvoice=calculateTax({amountCents:full,taxable:service.taxable!==false,taxRateOverride:service.taxRateOverride??null,config:site.taxConfig||{}});
      bookingTotalCents=bookingInvoice.totalCents;bookingTaxCents=bookingInvoice.taxCents;
    }
    let record = {
      transactionId, siteId: site.siteId, kind, customer, items, locationId, locationName: selectedLocation?.name || "", holdId: hold?.holdId || "",
      serviceId: balanceBooking?.serviceId || hold?.serviceId || "", employeeId: balanceBooking?.employeeId || hold?.employeeId || "", start: hold?.start || "", end: hold?.end || "",
      ...(kind==="booking"?{bookingTotalCents,bookingTaxCents}:{}),
      ...(balanceBooking?{source:"booking_balance",bookingTransactionId:balanceBooking.transactionId,bookingBalanceAttempt:balanceAttempt}:{}),
      channel: kiosk ? "kiosk" : "storefront", pricesIncludeTax: balanceBooking?Boolean(balanceBooking.pricesIncludeTax):Boolean(site.taxConfig?.pricesIncludeTax),
      subtotal, tax: taxCents, amountTotal: subtotal + ((balanceBooking?balanceBooking.pricesIncludeTax:site.taxConfig?.pricesIncludeTax) ? 0 : taxCents), currency: "usd",
      ...(kind === "booking" ? { language:lang, bookingCode:crypto.randomBytes(4).toString("hex").toUpperCase(), customerCalendarInviteRequested: site.settings?.sendGoogleCalendarInvites === true, confirmationEmailRequested: true, calendarToken: crypto.randomBytes(32).toString("base64url") } : {}),
      paymentStatus: inPerson ? "due" : "pending", status: inPerson ? "confirmed" : "payment_pending",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    if(record.bookingCode){
      // Index by the public reference, but require the separate 6-digit private
      // PIN (or existing private link) to read any booking in a public kiosk.
      let saved=false;
      for(let tries=0;tries<7;tries++){
        const created=await clientCommerceStore().setJSON(kioskBookingCodeKey(site.siteId,record.bookingCode),{siteId:site.siteId,transactionId},{onlyIfNew:true});
        if(created.modified){saved=true;break;}
        record.bookingCode=crypto.randomBytes(4).toString("hex").toUpperCase();
      }
      if(!saved)throw Object.assign(new Error("Unable to allocate booking reference. Please retry."),{status:503});
    }
    if (record.calendarToken) {
      const hash = crypto.createHash("sha256").update(record.calendarToken).digest("hex");
      await clientCommerceStore().setJSON(`calendar/${hash}.json`, {siteId:site.siteId,transactionId});
    }
    const trackingToken = kind === "order" ? crypto.randomBytes(24).toString("base64url") : "";
    if (trackingToken) {
      const trackingHash = crypto.createHash("sha256").update(trackingToken).digest("hex");
      record.trackingHash = trackingHash;
      await clientCommerceStore().setJSON(`tracking/${trackingHash}.json`, { siteId: site.siteId, transactionId });
    }
    if (inPerson) {
      if(kind==='order'){
        record=await createInPersonOrder(site,record);
        return Response.json({ok:true,paymentRequired:false,transactionId,status:record.status,...(trackingToken?{trackingUrl:`${publicBaseUrl()}/track/${trackingToken}`}:{})},{headers:{'Cache-Control':'no-store'}});
      }
      record = await syncBookingCalendar(site, record);
      await clientCommerceStore().setJSON(commerceKey(site.siteId, kind === "booking" ? "bookings" : "orders", transactionId), record);
      record = await sendBookingConfirmationEmails(site,record, value => clientCommerceStore().setJSON(commerceKey(site.siteId,"bookings",transactionId),value));
      await clientCommerceStore().setJSON(commerceKey(site.siteId,"transactions",transactionId),record);
      return Response.json({ ok: true, calendarUrl:record.customerCalendarInviteRequested ? "" : bookingCalendarUrl(record), calendarInvitationStatus:record.customerCalendarInviteRequested ? (record.customerCalendarInviteStatus === "sent" ? "sent" : "pending") : "none", manageUrl:bookingManageUrl(record), paymentRequired: false, transactionId, status: record.status, calendarSyncStatus: record.calendarSyncStatus, ...(trackingToken ? { trackingUrl: `${publicBaseUrl()}/track/${trackingToken}` } : {}) });
    }

    const receiptAccess = await issueBuyerReceiptAccess(site.siteId, transactionId);
    record.buyerReceiptHash = receiptAccess.hash;
    const receiptReturn = `receipt=${encodeURIComponent(receiptAccess.token)}`;
    const returns = clientCheckoutReturn({ slug: site.slug, kiosk, kioskQr, requestUrl: req.url, receiptReturn, trackingToken });
    if(payload.paymentProvider === "ath_movil") {
      const result=await createAthCheckout(site,record,{lang,requestUrl:req.url,returnUrl:returns.ath});
      return Response.json(result,{headers:{"Cache-Control":"no-store"}});
    }
    if(payload.paymentProvider && payload.paymentProvider !== "stripe") throw Object.assign(new Error("Unsupported payment provider."),{status:400});

    const accountId = site.paymentRules?.stripeConnectedAccountId;
    if (!accountId || !site.paymentRules?.methods?.stripe) throw Object.assign(new Error("Online payments are not connected for this business."), { status: 409 });
    assertStripeWriteAllowed({ requestUrl: req.url });
    const capability = await verifyMerchantCapability(accountId);
    if (capability !== "active") throw Object.assign(new Error("This business must finish Stripe verification before accepting payments."), { status: 409 });

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", returns.success);
    params.set("cancel_url", returns.cancel);
    params.set("customer_email", customer.email);
    params.set("client_reference_id", transactionId);
    params.set("metadata[flow]", "webfactory_client_commerce");
    params.set("metadata[site_id]", site.siteId);
    params.set("metadata[transaction_id]", transactionId);
    params.set("metadata[kind]", kind);
    if (hold?.holdId) params.set("metadata[hold_id]", hold.holdId);
    params.set("integration_identifier", `webfactory_${randomLetters(8)}`);
    items.forEach((item, index) => appendLine(params, index, item));
    if (taxCents > 0 && !record.pricesIncludeTax) appendLine(params, items.length, { name: "Puerto Rico IVU", description: "", unitAmount: taxCents, quantity: 1 });

    if(kind==='order'&&!balanceBooking){
      record.stripeAccountId=accountId;
      const checkout=await createReservedStripeCheckout(site,record,params,{requestUrl:req.url});
      return Response.json({ok:true,paymentRequired:true,checkoutUrl:checkout.checkoutUrl,transactionId},{headers:{'Cache-Control':'no-store'}});
    }
    if(balanceBooking){
      record.stripeAccountId=accountId;
      const saved=await clientCommerceStore().setJSON(commerceKey(site.siteId,"transactions",transactionId),record,{onlyIfNew:true});
      if(!saved.modified)throw Object.assign(new Error("Balance checkout requires reconciliation."),{status:409});
      const session=await stripeClient().checkout.sessions.create(checkoutParameters(params),{stripeAccount:accountId,idempotencyKey:`client-checkout-${transactionId}`});
      if(!session.id||!session.url)throw Object.assign(new Error("Balance checkout requires reconciliation."),{status:503});
      record={...record,stripeSessionId:session.id,checkoutUrl:session.url};
      await clientCommerceStore().setJSON(commerceKey(site.siteId,"transactions",transactionId),record);
      await clientCommerceStore().setJSON(commerceKey(site.siteId,"orders",transactionId),record);
      return Response.json({ok:true,paymentRequired:true,checkoutUrl:session.url,transactionId},{headers:{"Cache-Control":"no-store"}});
    }
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
    record.checkoutUrl = session.url;
    await clientCommerceStore().setJSON(commerceKey(site.siteId, "transactions", transactionId), record);
    return Response.json({ ok: true, paymentRequired: true, checkoutUrl: session.url, transactionId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export default createCheckoutAttemptHandler({ performCheckout, getSite: async (payload) => payload.siteId ? getClientSite(payload.siteId) : getClientSiteBySlug(payload.slug), isAvailable: (site) => siteEntitlement(site).public, getStore: clientCommerceStore });

export const config = { rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip"] } };
