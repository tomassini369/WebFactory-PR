import crypto from "node:crypto";
import { getDeployStore, getStore } from "@netlify/blobs";
import { assetStore, cleanText, safeFileName } from "./order-store.mjs";

function isProduction() {
  return globalThis.Netlify?.context?.deploy?.context === "production";
}

function scopedStore(name) {
  return isProduction()
    ? getStore(name, { consistency: "strong" })
    : getDeployStore(name);
}

export const clientSiteStore = () => scopedStore("webfactory-client-sites");
export const clientAssetStore = () => scopedStore("webfactory-client-assets");
export const clientCommerceStore = () => scopedStore("webfactory-client-commerce");
export const clientEventStore = () => scopedStore("webfactory-client-events");
export const clientOAuthStore = () => scopedStore("webfactory-client-oauth");

export function normalizeEmail(value) {
  return cleanText(value, 320).toLowerCase();
}

export function emailHash(value) {
  return crypto.createHash("sha256").update(normalizeEmail(value)).digest("hex");
}

export function slugify(value, fallback = "business") {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || fallback;
}

export function siteKey(siteId) {
  return `sites/${cleanText(siteId, 120)}.json`;
}

export async function getClientSite(siteId) {
  if (!siteId) return null;
  return clientSiteStore().get(siteKey(siteId), { type: "json" });
}

export async function getClientSiteBySlug(slug) {
  const pointer = await clientSiteStore().get(`slugs/${slugify(slug)}.json`, { type: "json" });
  return pointer?.siteId ? getClientSite(pointer.siteId) : null;
}

export async function saveClientSite(site) {
  if (!site?.siteId || !site?.slug) throw new Error("Client site requires siteId and slug.");
  await clientSiteStore().setJSON(siteKey(site.siteId), site);
  await clientSiteStore().setJSON(`slugs/${slugify(site.slug)}.json`, { siteId: site.siteId });
  for (const member of site.members || []) {
    const email = normalizeEmail(member.email);
    if (!email) continue;
    await clientSiteStore().setJSON(`members/${emailHash(email)}/${site.siteId}.json`, {
      siteId: site.siteId,
      email,
      role: member.role || "owner",
    });
  }
  return site;
}

export async function patchClientSite(siteId, patch) {
  const current = await getClientSite(siteId);
  if (!current) throw new Error("Client site was not found.");
  return saveClientSite({
    ...current,
    ...patch,
    revision: Number(current.revision || 0) + 1,
    updatedAt: new Date().toISOString(),
  });
}

export async function sitesForEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  const result = await clientSiteStore().list({ prefix: `members/${emailHash(normalized)}/` });
  const sites = [];
  for (const blob of result.blobs || []) {
    const member = await clientSiteStore().get(blob.key, { type: "json" });
    if (member?.email !== normalized) continue;
    const site = await getClientSite(member.siteId);
    if (site) sites.push(site);
  }
  return sites;
}

function uniqueSlug(order) {
  const suffix = String(order.orderId || "").replace(/[^a-zA-Z0-9]/g, "").slice(-6).toLowerCase();
  return `${slugify(order.business?.name)}-${suffix}`;
}

export async function ensureClientSiteForOrder(order) {
  const siteId = order.clientSiteId || `site-${String(order.orderId || "").toLowerCase()}`;
  const existing = await getClientSite(siteId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const catalog = [];
  for (const item of (Array.isArray(order.catalog) ? order.catalog : []).slice(0, 100)) {
    let imageAssetKey = "";
    if (item.imageAssetKey) {
      const [data, metadata] = await Promise.all([
        assetStore().get(item.imageAssetKey, { type: "arrayBuffer" }),
        assetStore().getMetadata(item.imageAssetKey),
      ]);
      if (data) {
        imageAssetKey = `sites/${siteId}/seed-${safeFileName(item.id)}-${safeFileName(item.imageName || "image")}`;
        await clientAssetStore().set(imageAssetKey, data, { metadata: metadata?.metadata || {} });
      }
    }
    catalog.push({
      id: cleanText(item.id, 120),
      type: item.type === "service" ? "service" : "product",
      name: cleanText(item.name, 220),
      description: cleanText(item.description, 6000),
      price: Math.max(0, Number(item.price || 0)),
      active: true,
      inventory: item.type === "product" ? null : undefined,
      requiresAppointment: Boolean(item.requiresAppointment),
      duration: Math.max(0, Number(item.duration || 0)),
      bufferMinutes: 0,
      imageAssetKey,
    });
  }
  const business = { ...(order.business || {}) };
  if (order.business?.logoAssetKey) {
    const [data, metadata] = await Promise.all([
      assetStore().get(order.business.logoAssetKey, { type: "arrayBuffer" }),
      assetStore().getMetadata(order.business.logoAssetKey),
    ]);
    if (data) {
      business.logoAssetKey = `sites/${siteId}/seed-logo-${safeFileName(order.business.logoAssetName || "logo")}`;
      await clientAssetStore().set(business.logoAssetKey, data, { metadata: metadata?.metadata || {} });
    }
  }
  const employees = (Array.isArray(order.team) ? order.team : []).slice(0, 100).map((member) => ({
    id: cleanText(member.id, 120),
    name: cleanText(member.name, 180),
    role: cleanText(member.role, 180),
    active: true,
    serviceIds: Array.isArray(member.serviceIds) ? member.serviceIds.slice(0, 100) : [],
    calendarId: "",
    dailyLimit: 8,
    schedule: order.hours || {},
    timeOff: [],
  }));
  const ownerEmail = normalizeEmail(order.client?.email);
  return saveClientSite({
    siteId,
    orderId: order.orderId,
    slug: uniqueSlug(order),
    status: "setup_pending",
    createdAt: now,
    updatedAt: now,
    revision: 1,
    members: [{ email: ownerEmail, role: "owner" }],
    business,
    design: { ...(order.design || {}) },
    features: { ...(order.features || {}) },
    catalog,
    employees,
    hours: order.hours || {},
    settings: site.settings || { locale: "es", timezone: "America/Puerto_Rico", currency: "usd" },
    paymentRules: {
      ...(order.payments || {}),
      stripeConnectedAccountId: order.stripeConnectedAccountId || "",
      stripeCapabilityStatus: order.stripeConnectCapabilityStatus || "not_started",
    },
    googleCalendar: { connected: false, calendarEmail: "", connectedAt: "", employeeCalendars: {} },
    settings: { locale: "es", timezone: "America/Puerto_Rico", currency: "usd" },
    servicePlan: {
      code: "webfactory-premium-commerce",
      name: "WebFactory Premium Commerce Website",
      billingModel: "one_time",
      billingStatus: "paid",
      subscriptionStatus: "not_started",
      migrationEligible: true,
      sourceOrderId: order.orderId,
      activatedAt: order.paidAt || now,
      currentPeriodEnd: "",
      cancelAtPeriodEnd: false,
    },
  });
}

export function publicClientSite(site) {
  if (!site) return null;
  return {
    siteId: site.siteId,
    slug: site.slug,
    status: site.status,
    revision: site.revision,
    business: {
      name: site.business?.name || "",
      category: site.business?.category || "",
      description: site.business?.description || "",
      phone: site.business?.phone || "",
      whatsapp: site.business?.whatsapp || "",
      email: site.business?.email || "",
      mapsUrl: site.business?.mapsUrl || "",
      instagram: site.business?.instagram || "",
      facebook: site.business?.facebook || "",
      x: site.business?.x || "",
      logoUrl: site.business?.logoAssetKey
        ? `/.netlify/functions/client-asset?siteId=${encodeURIComponent(site.siteId)}&key=${encodeURIComponent(site.business.logoAssetKey)}`
        : "",
    },
    design: site.design,
    features: site.features,
    catalog: (site.catalog || []).filter((item) => item.active !== false).map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      description: item.description,
      price: item.price,
      active: item.active !== false,
      inventory: item.inventory,
      requiresAppointment: Boolean(item.requiresAppointment),
      duration: Number(item.duration || 0),
      imageUrl: item.imageAssetKey
        ? `/.netlify/functions/client-asset?siteId=${encodeURIComponent(site.siteId)}&key=${encodeURIComponent(item.imageAssetKey)}`
        : "",
    })),
    employees: (site.employees || []).filter((member) => member.active !== false).map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      serviceIds: member.serviceIds || [],
    })),
    hours: site.hours || {},
    paymentRules: {
      methods: site.paymentRules?.methods || {},
      productPayment: site.paymentRules?.productPayment || "online",
      bookingPayment: site.paymentRules?.bookingPayment || "full",
      bookingDepositPercent: Number(site.paymentRules?.bookingDepositPercent || 25),
      allowTips: Boolean(site.paymentRules?.allowTips),
      stripeReady: site.paymentRules?.stripeCapabilityStatus === "active",
      athPublicPath: site.paymentRules?.ath?.publicPath || "",
      inPersonInstructions: site.paymentRules?.inPerson?.instructions || "",
    },
  };
}

export function commerceKey(siteId, kind, id) {
  return `${cleanText(siteId, 120)}/${kind}/${cleanText(id, 160)}.json`;
}
