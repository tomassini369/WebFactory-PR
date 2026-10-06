import {websiteContent,catalogPresentation} from './website-content.mjs';
import { availableInventory, reservedQuantity } from './inventory-availability.mjs';
import crypto from "node:crypto";
import { getDeployStore, getStore } from "@netlify/blobs";
import { cleanText } from "./platform-utils.mjs";

function isProduction() {
  return globalThis.Netlify?.context?.deploy?.context === "production";
}

function scopedStore(name) {
  return isProduction()
    ? getStore(name, { consistency: "strong" })
    : getDeployStore(name, { consistency: "strong" });
}

export const clientSiteStore = () => scopedStore("webfactory-client-sites");
export const clientAssetStore = () => scopedStore("webfactory-client-assets");
export const clientCommerceStore = () => scopedStore("webfactory-client-commerce");
export const clientEventStore = () => scopedStore("webfactory-client-events");
export const clientBackupStore = () => scopedStore("webfactory-client-backups");
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
  return site ? {...site, revision:Number(site.revision||0), design: normalizeSiteDesign(site.design || {})} : null;
}

export async function getClientSiteBySlug(slug) {
  const pointer = await clientSiteStore().get(`slugs/${slugify(slug)}.json`, { type: "json" });
  return pointer?.siteId ? getClientSite(pointer.siteId) : null;
}

export async function saveClientSite(site) {
  if (!site?.siteId || !site?.slug) throw new Error("Client site requires siteId and slug.");
  const store=clientSiteStore();
  const previous=await store.getWithMetadata(siteKey(site.siteId),{type:'json'});
  if(previous){
    if(!previous.etag)throw Object.assign(new Error('Business concurrency metadata unavailable.'),{status:503});
    if(Number(site.revision)!==Number(previous.data.revision||0)+1)throw Object.assign(new Error('Business changed. Reload before saving.'),{status:409});
    // Operation markers are server-owned and cannot be erased by another edit.
    site={...site,...(previous.data.stockOperations?{stockOperations:previous.data.stockOperations}:{})};
    if(previous.data.stockReservations)site={...site,stockReservations:previous.data.stockReservations};
    if(previous.data.inventoryArchive)site={...site,inventoryArchive:previous.data.inventoryArchive};
    else if(site.inventoryArchive)throw Object.assign(new Error('Inventory archive metadata is server-owned.'),{status:400});
    for(const reservation of Object.values(previous.data.stockReservations||{})){
      if(reservation.state!=='held')continue;
      for(const line of reservation.lines||[]){
        const item=(site.catalog||[]).find(item=>item.id===line.id);
        if(!item||item.type!=='product'||!item.trackInventory||item.inventory==null||(!item.allowBackorder&&Number(item.inventory)<reservedQuantity(previous.data,line.id)))throw Object.assign(new Error('Resolve active stock reservations before changing this product.'),{status:409});
      }
    }
  }else if(site.stockOperations||site.stockReservations||site.inventoryArchive)throw Object.assign(new Error('Inventory markers cannot be supplied when creating a business.'),{status:400});
  const saved=await store.setJSON(siteKey(site.siteId),site,previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
  if(!saved.modified)throw Object.assign(new Error('Business changed. Reload before saving.'),{status:409});
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

export async function patchClientSite(siteId, patch, {expectedRevision} = {}) {
  const current = await getClientSite(siteId);
  if (!current) throw new Error("Client site was not found.");
  if(expectedRevision!==undefined&&Number(expectedRevision)!==Number(current.revision||0))throw Object.assign(new Error('Business changed. Reload before saving.'),{status:409});
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
      ...websiteContent(site.business),
      policies: site.business?.policies || {},
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
      locations: (site.business?.locations || []).filter((location) => location.active !== false).map((location) => ({ id: location.id, name: location.name, address: location.address, phone: location.phone, mapsUrl: location.mapsUrl, hours: location.hours || {} })),
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
    features: { ...site.features, calendar: Boolean(site.features?.calendar && site.googleCalendar?.connected) },
    catalog: (site.catalog || []).filter((item) => item.active !== false).map((item) => ({
      id: item.id,
      ...catalogPresentation(item),
      type: item.type,
      name: item.name,
      nameEn: item.nameEn || item.name || "",
      nameEs: item.nameEs || "",
      description: item.description,
      descriptionEn: item.descriptionEn || item.description || "",
      descriptionEs: item.descriptionEs || "",
      price: item.price,
      active: item.active !== false,
      inventory: availableInventory(site,item),
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
      locationIds: member.locationIds || [],
    })),
    settings: {locale:site.settings?.locale||"en",timezone:site.settings?.timezone||"America/Puerto_Rico",currency:"usd"},
    hours: site.hours || {},
    paymentRules: {
      methods: site.paymentRules?.methods || {},
      productPayment: site.paymentRules?.productPayment || "online",
      bookingPayment: site.paymentRules?.bookingPayment || "full",
      bookingDepositPercent: Number(site.paymentRules?.bookingDepositPercent || 25),
      allowTips: Boolean(site.paymentRules?.allowTips),
      stripeReady: site.paymentRules?.stripeCapabilityStatus === "active",
      stripeAvailable: Boolean(site.paymentRules?.methods?.stripe && site.paymentRules?.stripeConnectedAccountId),
      athPublicPath: site.paymentRules?.ath?.publicPath || "",
      athReady: Boolean(site.paymentRules?.methods?.ath && site.paymentRules?.ath?.credentialsConfigured && site.paymentRules?.ath?.credentialVersion),
      inPersonInstructions: site.paymentRules?.inPerson?.instructions || "",
    },
  };
}

export function commerceKey(siteId, kind, id) {
  return `${cleanText(siteId, 120)}/${kind}/${cleanText(id, 160)}.json`;
}
