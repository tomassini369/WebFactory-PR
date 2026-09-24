import crypto from "node:crypto";
import { getDeployStore, getStore } from "@netlify/blobs";
import { cleanText } from "./platform-utils.mjs";

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

export function normalizeSiteDesign(design = {}) {
  const templateSlug = cleanText(design.templateSlug, 80);
  return {
    ...design,
    mode: design.mode || (templateSlug ? "template_base" : "custom"),
    templateSlug,
    templateCategory: cleanText(design.templateCategory, 180),
    templateName: cleanText(design.templateName, 220),
    templateRoute: templateSlug
      ? cleanText(design.templateRoute, 500) || `/templates/${templateSlug}`
      : "",
    preserveTemplateStructure: Boolean(design.preserveTemplateStructure ?? templateSlug),
  };
}

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
  const site = await clientSiteStore().get(siteKey(siteId), { type: "json" });
  return site ? {...site, design: normalizeSiteDesign(site.design || {})} : null;
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

export function publicClientSite(site) {
  if (!site) return null;
  return {
    siteId: site.siteId,
    slug: site.slug,
    status: site.status,
    revision: site.revision,
    business: {
      name: site.business?.name || "",
      nameEn: site.business?.nameEn || site.business?.name || "",
      nameEs: site.business?.nameEs || "",
      category: site.business?.category || "",
      description: site.business?.description || "",
      descriptionEn: site.business?.descriptionEn || site.business?.description || "",
      descriptionEs: site.business?.descriptionEs || "",
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
      heroUrl: site.business?.heroAssetKey
        ? `/.netlify/functions/client-asset?siteId=${encodeURIComponent(site.siteId)}&key=${encodeURIComponent(site.business.heroAssetKey)}`
        : "",
      galleryUrls: Array.isArray(site.business?.galleryAssetKeys)
        ? site.business.galleryAssetKeys.map((key) => `/.netlify/functions/client-asset?siteId=${encodeURIComponent(site.siteId)}&key=${encodeURIComponent(key)}`)
        : [],
    },
    design: normalizeSiteDesign(site.design || {}),
    features: site.features,
    catalog: (site.catalog || []).filter((item) => item.active !== false).map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      nameEn: item.nameEn || item.name || "",
      nameEs: item.nameEs || "",
      description: item.description,
      descriptionEn: item.descriptionEn || item.description || "",
      descriptionEs: item.descriptionEs || "",
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
      roleEn: member.roleEn || member.role || "",
      roleEs: member.roleEs || "",
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
