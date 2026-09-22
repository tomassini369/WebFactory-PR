import {
  cleanText,
  getOrder,
  patchOrder,
  publicBaseUrl,
  saveOrder,
  validEmail,
} from "../lib/order-store.mjs";
import { assertSameOrigin } from "../lib/client-auth.mjs";

const PRODUCT_KEY = "webfactory-premium";
const PRODUCT_LABEL = "WebFactory Premium Commerce Website";
const OFFICIAL_PRICE_USD = 300;
const DEMO_TEMPLATES = {
  "brisa-cocina": { category: "Restaurant", name: "Brisa Cocina" },
  "velocity-auto": { category: "Automotive", name: "Velocity Auto Care" },
  "northline-barber": { category: "Barber", name: "Northline Barber Studio" },
  "aura-beauty": { category: "Beauty", name: "Aura Beauty Lab" },
  "balance-wellness": { category: "Wellness", name: "Balance Wellness Room" },
  "luna-market": { category: "Retail", name: "Luna Market Boutique" },
  "summit-advisory": { category: "Professional Services", name: "Summit Advisory Group" },
  "isla-living": { category: "Real Estate", name: "Isla Living Realty" },
  "atelier-nueve": { category: "Other", name: "Atelier Nueve" },
};

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

function orderIdFromDraft(draftId) {
  return `WF-${draftId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 14).toUpperCase()}`;
}

function assetRef(value, draftId) {
  const key = cleanText(value, 700);
  if (!key) return "";
  return key.startsWith(`drafts/${draftId}/`) ? key : "";
}

export function sanitizeOrder(payload) {
  const draftId = cleanText(payload.draftId, 80);
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(draftId)) throw new Error("Invalid draft ID.");

  const raw = payload.orderData || {};
  const b = raw.business || {};
  const d = raw.design || {};
  const client = raw.client || {};
  const catalog = Array.isArray(raw.catalog) ? raw.catalog.slice(0, 100) : [];
  const team = Array.isArray(raw.team) ? raw.team.slice(0, 100) : [];
  const hours = raw.hours && typeof raw.hours === "object" ? raw.hours : {};
  const features = raw.features && typeof raw.features === "object" ? raw.features : {};
  const payments = raw.payments && typeof raw.payments === "object" ? raw.payments : {};
  const methods = payments.methods && typeof payments.methods === "object" ? payments.methods : {};

  const customerEmail = cleanText(client.email || b.email, 320);
  const customerName = cleanText(client.name || b.contactName, 180);
  const businessName = cleanText(b.name, 180);
  const requestedTemplateSlug = cleanText(d.templateSlug, 80);
  const template = DEMO_TEMPLATES[requestedTemplateSlug] || null;

  if (!businessName) throw new Error("Business name is required.");
  if (!customerName) throw new Error("Customer name is required.");
  if (!validEmail(customerEmail)) throw new Error("A valid customer email is required.");

  const sanitizedCatalog = catalog.map((item, index) => ({
    id: cleanText(item.id || `item-${index + 1}`, 120),
    type: item.type === "service" ? "service" : "product",
    name: cleanText(item.name, 220),
    price: Math.max(0, Number(item.price || 0)),
    description: cleanText(item.description, 6000),
    requiresAppointment: Boolean(item.requiresAppointment),
    duration: Math.max(0, Math.min(1440, Number(item.duration || 0))),
    imageAssetKey: assetRef(item.imageAssetKey, draftId),
    imageName: cleanText(item.imageName, 200),
    imageType: cleanText(item.imageType, 120),
  }));

  const sanitizedTeam = team.map((member, index) => ({
    id: cleanText(member.id || `employee-${index + 1}`, 120),
    name: cleanText(member.name, 180),
    role: cleanText(member.role, 180),
    serviceIds: Array.isArray(member.serviceIds)
      ? member.serviceIds.slice(0, 100).map((id) => cleanText(id, 120))
      : [],
  }));

  const sanitizedFeatures = Object.fromEntries(
    Object.entries(features)
      .slice(0, 60)
      .map(([key, value]) => [cleanText(key, 80), Boolean(value)]),
  );

  const sanitizedHours = Object.fromEntries(
    Object.entries(hours)
      .slice(0, 14)
      .map(([day, value]) => [
        cleanText(day, 40),
        {
          enabled: Boolean(value?.enabled),
          open: cleanText(value?.open, 10),
          close: cleanText(value?.close, 10),
        },
      ]),
  );

  const sanitizedPayments = {
    methods: {
      stripe: Boolean(methods.stripe),
      ath: Boolean(methods.ath),
      inPerson: Boolean(methods.inPerson),
    },
    stripe: {
      connection: "connect",
      accountStatus: payments.stripe?.accountStatus === "existing" ? "existing" : "new",
      checkoutExperience: "hosted",
      settlementCurrency: "usd",
      dynamicPaymentMethods: true,
    },
    ath: {
      accountStatus: payments.ath?.accountStatus === "active" ? "active" : "needs_account",
      publicPath: cleanText(payments.ath?.publicPath, 120),
    },
    inPerson: {
      instructions: cleanText(payments.inPerson?.instructions, 1000),
    },
    productPayment: payments.productPayment === "in_person" && methods.inPerson ? "in_person" : "online",
    bookingPayment: ["full", "deposit", "in_person"].includes(payments.bookingPayment)
      ? payments.bookingPayment
      : "full",
    bookingDepositPercent: [10,20,25,30,50].includes(Number(payments.bookingDepositPercent))
      ? Number(payments.bookingDepositPercent)
      : 25,
    sendCustomerReceipt: payments.sendCustomerReceipt !== false,
    allowTips: Boolean(payments.allowTips),
  };

  if (!Object.values(sanitizedPayments.methods).some(Boolean)) {
    throw new Error("At least one website payment method is required.");
  }
  if (sanitizedPayments.bookingPayment === "in_person" && !sanitizedPayments.methods.inPerson) {
    sanitizedPayments.bookingPayment = "full";
  }

  const orderId = orderIdFromDraft(draftId);

  return {
    orderId,
    draftId,
    product: {
      key: PRODUCT_KEY,
      name: PRODUCT_LABEL,
      amountUsd: OFFICIAL_PRICE_USD,
      currency: "usd",
      pricing: "one_time",
    },
    localization: {
      enabled: true,
      languages: ["es", "en"],
      defaultLanguage: "es",
      fallbackLanguage: "es",
      languageSwitcher: true,
      persistSelection: true,
      persistence: "localStorage",
      updateDocumentLanguage: true,
      runtimeMachineTranslation: false,
    },
    client: {
      name: customerName,
      email: customerEmail,
      phone: cleanText(client.phone || b.phone, 80),
    },
    business: {
      name: businessName,
      contactName: customerName,
      category: cleanText(b.category, 180),
      description: cleanText(b.description, 6000),
      phone: cleanText(b.phone, 80),
      whatsapp: cleanText(b.whatsapp, 80),
      email: cleanText(b.email || customerEmail, 320),
      mapsUrl: cleanText(b.mapsUrl, 1500),
      instagram: cleanText(b.instagram, 300),
      facebook: cleanText(b.facebook, 500),
      x: cleanText(b.x, 500),
      logoAssetKey: assetRef(b.logoAssetKey, draftId),
      logoAssetName: cleanText(b.logoAssetName, 200),
      logoAssetType: cleanText(b.logoAssetType, 120),
    },
    design: {
      mode: template ? "demo_base" : "custom",
      templateSlug: template ? requestedTemplateSlug : "",
      templateCategory: template?.category || "",
      templateName: template?.name || "",
      templateRoute: template ? `/demos/${requestedTemplateSlug}` : "",
      preserveDemoStructure: Boolean(template),
      style: ["Modern","Luxury","Minimal","Bold"].includes(d.style) ? d.style : "Modern",
      primary: cleanText(d.primary, 30),
      secondary: cleanText(d.secondary, 30),
    },
    features: sanitizedFeatures,
    catalog: sanitizedCatalog,
    team: sanitizedTeam,
    hours: sanitizedHours,
    payments: sanitizedPayments,
  };
}

async function createStripeSession(order) {
  const stripeSecretKey = env("STRIPE_SECRET_KEY");
  const priceId = env("STRIPE_PRICE_WEBFACTORY_PREMIUM");
  if (!stripeSecretKey || !priceId) throw new Error("Stripe is not configured.");

  const baseUrl = publicBaseUrl();
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${baseUrl}/#builder`);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", order.orderId);
  params.set("customer_email", order.client.email);
  params.set("metadata[order_id]", order.orderId);
  params.set("metadata[product_key]", PRODUCT_KEY);
  params.set("metadata[package_id]", PRODUCT_KEY);
  params.set("metadata[package_label]", PRODUCT_LABEL);
  params.set("metadata[official_price_usd]", String(OFFICIAL_PRICE_USD));
  params.set("metadata[webfactory_version]", "v2");
  params.set("metadata[business_name]", order.business.name.slice(0, 450));
  params.set("metadata[client_email]", order.client.email.slice(0, 450));

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `webfactory-${order.orderId}-${priceId}`,
    },
    body: params,
  });

  const session = await response.json();
  if (!response.ok) throw new Error(session?.error?.message || "Stripe could not create checkout.");
  return session;
}

export default async (req) => {
  if (req.method !== "POST") return Response.json({ ok:false,message:"Method not allowed." }, { status:405 });

  if (globalThis.Netlify?.context?.deploy?.context !== "production") {
    return Response.json(
      { ok:false,message:"Live checkout is available only on the production site." },
      { status:409 },
    );
  }

  try {
    assertSameOrigin(req);
    if (env("WEBFACTORY_LEGACY_CHECKOUT_ENABLED") !== "true") {
      return Response.json(
        { ok:false,message:"The legacy one-time checkout is closed to new orders." },
        { status:410,headers:{ "Cache-Control":"no-store" } },
      );
    }
    const payload = await req.json();
    const order = sanitizeOrder(payload);
    const existing = await getOrder(order.orderId);

    if (existing?.status === "PAID" || existing?.status === "EMAIL_SENT" || existing?.status === "IN_PRODUCTION") {
      return Response.json({ ok:false,message:"This order has already been paid.",orderId:order.orderId }, { status:409 });
    }

    const now = new Date().toISOString();
    await saveOrder({
      ...(existing || {}),
      ...order,
      status: "AWAITING_PAYMENT",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      productionPackageSent: Boolean(existing?.productionPackageSent),
      customerConfirmationSent: Boolean(existing?.customerConfirmationSent),
    });

    const session = await createStripeSession(order);
    await patchOrder(order.orderId, {
      status: "PAYMENT_PROCESSING",
      stripeSessionId: session.id,
      checkoutCreatedAt: now,
    });

    return Response.json({
      ok:true,
      checkoutUrl:session.url,
      sessionId:session.id,
      orderId:order.orderId,
      productName:PRODUCT_LABEL,
      officialPriceUsd:OFFICIAL_PRICE_USD,
    }, { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return Response.json(
      { ok:false,message:error?.message || "Could not prepare checkout." },
      { status:500,headers:{ "Cache-Control":"no-store" } },
    );
  }
};
