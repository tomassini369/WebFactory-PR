import { cleanText, validEmail } from "./order-store.mjs";

const TEMPLATE_CATALOG = {
  "brisa-cocina": { category: "Restaurant", name: "Brisa Cocina" },
  "northline-barber": { category: "Barber", name: "Northline Barber Studio" },
  "aura-beauty": { category: "Beauty", name: "Aura Beauty Lab" },
  "balance-wellness": { category: "Wellness", name: "Balance Wellness Room" },
  "luna-market": { category: "Retail", name: "Luna Market Boutique" },
  "summit-advisory": { category: "Professional Services", name: "Summit Advisory Group" },
  "isla-living": { category: "Real Estate", name: "Isla Living Realty" },
  "atelier-nueve": { category: "Other", name: "Atelier Nueve" },
  "aqua-shine-carwash": { category: "Car Wash", name: "Aqua Shine Car Wash" },
  "verde-vivo-landscaping": { category: "Landscaping", name: "Verde Vivo Landscaping" },
  "sonido-vivo-artist": { category: "Music Artist", name: "Sonido Vivo" },
  "motorlab-garage": { category: "Auto Repair", name: "MotorLab Garage" },
  "manos-de-confianza-care": { category: "Care Services", name: "Manos de Confianza" },
  "pour-house-bartending": { category: "Bartending", name: "Pour House Events" },
  "mesa-boricua-catering": { category: "Catering", name: "Mesa Boricua Catering" },
  "pulse-dj-services": { category: "DJ Services", name: "Pulse DJ Services" },
  "solid-build-construction": { category: "Construction", name: "Solid Build Construction" },
  "fresh-home-cleaning": { category: "House Cleaning", name: "Fresh Home Cleaning" },
  "sealpro-roofing": { category: "Roof Sealing", name: "SealPro Roofing" },
  "agua-clara-plumbing": { category: "Plumbing", name: "Agua Clara Plumbing" },
  "volt-pro-electric": { category: "Electrician", name: "Volt Pro Electric" },
  "precision-auto-body": { category: "Auto Body", name: "Precision Auto Body" },
  "bella-vita-salon": { category: "Cosmetology", name: "Bella Vita Salon" },
};

function assetRef(value, draftId) {
  const key = cleanText(value, 700);
  if (!key) return "";
  return key.startsWith(`drafts/${draftId}/`) ? key : "";
}

export function sanitizeBuilderRequest(payload) {
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
  const businessName = cleanText(b.nameEn || b.name || b.nameEs, 180);
  const requestedTemplateSlug = cleanText(d.templateSlug, 80);
  const template = TEMPLATE_CATALOG[requestedTemplateSlug] || null;

  if (!businessName) throw new Error("Business name is required.");
  if (!customerName) throw new Error("Customer name is required.");
  if (!validEmail(customerEmail)) throw new Error("A valid customer email is required.");

  const sanitizedCatalog = catalog.map((item, index) => ({
    id: cleanText(item.id || `item-${index + 1}`, 120),
    type: item.type === "service" ? "service" : "product",
    name: cleanText(item.nameEn || item.name || item.nameEs, 220),
    nameEn: cleanText(item.nameEn || item.name, 220),
    nameEs: cleanText(item.nameEs, 220),
    price: Math.max(0, Number(item.price || 0)),
    description: cleanText(item.descriptionEn || item.description || item.descriptionEs, 6000),
    descriptionEn: cleanText(item.descriptionEn || item.description, 6000),
    descriptionEs: cleanText(item.descriptionEs, 6000),
    requiresAppointment: Boolean(item.requiresAppointment),
    duration: Math.max(0, Math.min(1440, Number(item.duration || 0))),
    imageAssetKey: assetRef(item.imageAssetKey, draftId),
    imageName: cleanText(item.imageName, 200),
    imageType: cleanText(item.imageType, 120),
  }));

  const sanitizedTeam = team.map((member, index) => ({
    id: cleanText(member.id || `employee-${index + 1}`, 120),
    name: cleanText(member.name, 180),
    role: cleanText(member.roleEn || member.role || member.roleEs, 180),
    roleEn: cleanText(member.roleEn || member.role, 180),
    roleEs: cleanText(member.roleEs, 180),
    serviceIds: Array.isArray(member.serviceIds)
      ? member.serviceIds.slice(0, 100).map((id) => cleanText(id, 120))
      : [],
  }));

  const sanitizedFeatures = Object.fromEntries(
    Object.entries(features).slice(0, 60).map(([key, value]) => [cleanText(key, 80), Boolean(value)]),
  );

  const sanitizedHours = Object.fromEntries(
    Object.entries(hours).slice(0, 14).map(([day, value]) => [
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
    bookingPayment: ["full", "deposit", "in_person"].includes(payments.bookingPayment) ? payments.bookingPayment : "full",
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

  return {
    draftId,
    client: {
      name: customerName,
      email: customerEmail,
      phone: cleanText(client.phone || b.phone, 80),
    },
    business: {
      name: businessName,
      nameEn: cleanText(b.nameEn || b.name, 180),
      nameEs: cleanText(b.nameEs, 180),
      contactName: customerName,
      category: cleanText(b.category, 180),
      description: cleanText(b.descriptionEn || b.description || b.descriptionEs, 6000),
      descriptionEn: cleanText(b.descriptionEn || b.description, 6000),
      descriptionEs: cleanText(b.descriptionEs, 6000),
      phone: cleanText(b.phone, 80),
      whatsapp: cleanText(b.whatsapp, 80),
      email: cleanText(b.email || customerEmail, 320),
      mapsUrl: cleanText(b.mapsUrl, 1500),
      instagram: cleanText(b.instagram, 300),
      facebook: cleanText(b.facebook, 500),
      x: cleanText(b.x, 500),
      heroAssetKey: assetRef(b.heroAssetKey, draftId),
      heroAssetName: cleanText(b.heroAssetName, 200),
      heroAssetType: cleanText(b.heroAssetType, 120),
      galleryAssets: Array.isArray(b.galleryAssets) ? b.galleryAssets.slice(0,100).map((asset) => ({
        assetKey: assetRef(asset?.assetKey, draftId),
        fileName: cleanText(asset?.fileName, 200),
        contentType: cleanText(asset?.contentType, 120),
      })).filter((asset) => asset.assetKey) : [],
      logoAssetKey: assetRef(b.logoAssetKey, draftId),
      logoAssetName: cleanText(b.logoAssetName, 200),
      logoAssetType: cleanText(b.logoAssetType, 120),
    },
    design: {
      mode: template ? "template_base" : "custom",
      templateSlug: template ? requestedTemplateSlug : "",
      templateCategory: template?.category || "",
      templateName: template?.name || "",
      templateRoute: template ? `/templates/${requestedTemplateSlug}` : "",
      preserveTemplateStructure: Boolean(template),
      customLayout: ["split","centered","editorial","showcase"].includes(d.customLayout) ? d.customLayout : "split",
      sectionOrder: Array.isArray(d.sectionOrder) ? d.sectionOrder.filter((section) => ["catalog","team","about","gallery","contact"].includes(section)).slice(0,5) : ["catalog","team","about","gallery","contact"],
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
