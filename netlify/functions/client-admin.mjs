import { assertSameOrigin, authorizedSites, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { normalizeEmail, patchClientSite, publicClientSite } from "../lib/client-store.mjs";
import { cleanText, validEmail } from "../lib/order-store.mjs";

const allowedSections = new Set(["business", "design", "catalog", "employees", "hours", "paymentRules", "settings"]);

function color(value, fallback) {
  const result = cleanText(value, 20);
  return /^#[0-9a-fA-F]{6}$/.test(result) ? result : fallback;
}

function sanitizeBusiness(value = {}, current = {}) {
  return {
    ...current,
    name: cleanText(value.name ?? current.name, 180),
    contactName: cleanText(value.contactName ?? current.contactName, 180),
    category: cleanText(value.category ?? current.category, 180),
    description: cleanText(value.description ?? current.description, 6000),
    phone: cleanText(value.phone ?? current.phone, 80),
    whatsapp: cleanText(value.whatsapp ?? current.whatsapp, 80),
    email: cleanText(value.email ?? current.email, 320),
    mapsUrl: cleanText(value.mapsUrl ?? current.mapsUrl, 1500),
    instagram: cleanText(value.instagram ?? current.instagram, 300),
    logoAssetKey: cleanText(value.logoAssetKey ?? current.logoAssetKey, 700),
  };
}

function sanitizeCatalog(value) {
  if (!Array.isArray(value)) throw Object.assign(new Error("Catalog must be a list."), { status: 400 });
  if (value.length > 100) throw Object.assign(new Error("The catalog limit is 100 products and services."), { status: 400 });
  const ids = new Set();
  return value.map((item, index) => {
    const id = cleanText(item.id || `item-${index + 1}`, 120);
    if (ids.has(id)) throw Object.assign(new Error("Catalog item IDs must be unique."), { status: 400 });
    ids.add(id);
    return {
      id,
      type: item.type === "service" ? "service" : "product",
      name: cleanText(item.name, 220),
      description: cleanText(item.description, 6000),
      price: Math.round(Math.max(0, Number(item.price || 0)) * 100) / 100,
      active: item.active !== false,
      inventory: item.type === "product" && item.inventory !== null && item.inventory !== ""
        ? Math.max(0, Math.floor(Number(item.inventory || 0)))
        : null,
      requiresAppointment: item.type === "service" && Boolean(item.requiresAppointment),
      duration: item.type === "service" ? Math.max(5, Math.min(1440, Number(item.duration || 30))) : 0,
      bufferMinutes: item.type === "service" ? Math.max(0, Math.min(240, Number(item.bufferMinutes || 0))) : 0,
      imageAssetKey: cleanText(item.imageAssetKey, 700),
    };
  });
}

function sanitizeEmployees(value, catalog) {
  if (!Array.isArray(value)) throw Object.assign(new Error("Employees must be a list."), { status: 400 });
  if (value.length > 100) throw Object.assign(new Error("The employee limit is 100."), { status: 400 });
  const serviceIds = new Set((catalog || []).filter((item) => item.type === "service").map((item) => item.id));
  return value.map((member, index) => ({
    id: cleanText(member.id || `employee-${index + 1}`, 120),
    name: cleanText(member.name, 180),
    role: cleanText(member.role, 180),
    active: member.active !== false,
    serviceIds: Array.isArray(member.serviceIds)
      ? [...new Set(member.serviceIds.map((id) => cleanText(id, 120)).filter((id) => serviceIds.has(id)))].slice(0, 100)
      : [],
    calendarId: cleanText(member.calendarId, 500),
    dailyLimit: Math.max(1, Math.min(100, Number(member.dailyLimit || 8))),
    schedule: member.schedule && typeof member.schedule === "object" ? member.schedule : {},
    timeOff: Array.isArray(member.timeOff) ? member.timeOff.slice(0, 365).map((entry) => ({
      start: cleanText(entry.start, 40), end: cleanText(entry.end, 40), note: cleanText(entry.note, 300),
    })) : [],
  }));
}

function sanitizeHours(value = {}) {
  const result = {};
  for (const [day, hours] of Object.entries(value).slice(0, 14)) {
    result[cleanText(day, 40)] = {
      enabled: Boolean(hours?.enabled),
      open: /^\d{2}:\d{2}$/.test(hours?.open || "") ? hours.open : "09:00",
      close: /^\d{2}:\d{2}$/.test(hours?.close || "") ? hours.close : "17:00",
    };
  }
  return result;
}

function sanitizePaymentRules(value = {}, current = {}) {
  return {
    ...current,
    methods: {
      stripe: Boolean(value.methods?.stripe ?? current.methods?.stripe),
      ath: Boolean(value.methods?.ath ?? current.methods?.ath),
      inPerson: Boolean(value.methods?.inPerson ?? current.methods?.inPerson),
    },
    productPayment: value.productPayment === "in_person" ? "in_person" : "online",
    bookingPayment: ["full", "deposit", "in_person"].includes(value.bookingPayment) ? value.bookingPayment : "full",
    bookingDepositPercent: [10, 20, 25, 30, 50].includes(Number(value.bookingDepositPercent)) ? Number(value.bookingDepositPercent) : 25,
    sendCustomerReceipt: value.sendCustomerReceipt !== false,
    allowTips: Boolean(value.allowTips),
    ath: { ...(current.ath || {}), publicPath: cleanText(value.ath?.publicPath ?? current.ath?.publicPath, 120) },
    inPerson: { ...(current.inPerson || {}), instructions: cleanText(value.inPerson?.instructions ?? current.inPerson?.instructions, 1000) },
  };
}

export default async (req) => {
  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const siteId = url.searchParams.get("siteId");
      if (!siteId) {
        const { user, sites } = await authorizedSites();
        return Response.json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, sites: sites.map((site) => ({
          siteId: site.siteId, slug: site.slug, status: site.status, revision: site.revision, businessName: site.business?.name,
        })) }, { headers: { "Cache-Control": "no-store" } });
      }
      const { user, site, membership } = await requireSiteAccess(siteId);
      return Response.json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, membership, site }, { headers: { "Cache-Control": "no-store" } });
    }

    if (req.method !== "PATCH") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    assertSameOrigin(req);
    const payload = await req.json();
    const section = cleanText(payload.section, 40);
    if (!allowedSections.has(section)) throw Object.assign(new Error("Invalid settings section."), { status: 400 });
    const { site, membership } = await requireSiteAccess(payload.siteId, ["owner", "manager"]);
    if (membership.role === "staff") throw Object.assign(new Error("Staff cannot change business settings."), { status: 403 });

    let value;
    if (section === "business") value = sanitizeBusiness(payload.value, site.business);
    if (section === "design") value = {
      ...site.design,
      style: ["Modern", "Luxury", "Minimal", "Bold"].includes(payload.value?.style) ? payload.value.style : site.design?.style,
      primary: color(payload.value?.primary, site.design?.primary || "#0B1529"),
      secondary: color(payload.value?.secondary, site.design?.secondary || "#3C86F6"),
    };
    if (section === "catalog") value = sanitizeCatalog(payload.value);
    if (section === "employees") value = sanitizeEmployees(payload.value, site.catalog);
    if (section === "hours") value = sanitizeHours(payload.value);
    if (section === "paymentRules") value = sanitizePaymentRules(payload.value, site.paymentRules);
    if (section === "settings") value = {
      ...site.settings,
      locale: payload.value?.locale === "es" ? "es" : "en",
      timezone: cleanText(payload.value?.timezone || site.settings?.timezone || "America/Puerto_Rico", 120),
      currency: "usd",
    };
    if (section === "business" && value.email && !validEmail(value.email)) throw Object.assign(new Error("Business email is invalid."), { status: 400 });

    const updated = await patchClientSite(site.siteId, { [section]: value });
    return Response.json({ ok: true, site: updated, publicSite: publicClientSite(updated) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
