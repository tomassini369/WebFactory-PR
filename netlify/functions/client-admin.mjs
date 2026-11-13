import {teamBookingId} from '../../shared/team-booking.mjs';
import {bookingModeLockKey} from '../lib/booking-engine.mjs';
import {withBookingLock} from '../lib/booking-lock.mjs';
import {listGoogleCalendars} from '../lib/google-calendar.mjs';
import {membershipAllowsCapability} from "../../shared/membership-plans.mjs";
import {normalizeTemplateOverrides} from "../../shared/template-overrides.mjs";
import {normalizeSocialLinks} from "../../shared/social-links.mjs";
import {normalizeSiteMusic, musicTrackLimit, siteCanPublishMusic} from "../../shared/site-music.mjs";
import {normalizeHoursWindow} from '../../shared/business-hours.mjs';
import {claimPublicSiteSlug, validatePublicSiteSlug} from '../lib/client-site-slug.mjs';
import {commercialCapabilities, employeeSiteView} from "../lib/commercial-access.mjs";
import { sanitizePolicies } from "../lib/publication-review.mjs";
import {normalizeBookingPolicy} from '../lib/booking-policy.mjs';
import { readPosOperations } from '../lib/pos-operations.mjs';
import { assertSameOrigin, authorizedSites, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { clientAssetStore, clientCommerceStore, clientSiteStore, patchClientSite, publicClientSite, renameClientSiteSlug } from "../lib/client-store.mjs";
import { cleanText, validEmail } from "../lib/platform-utils.mjs";
import { normalizeTaxConfig } from "../lib/webfactory-v3-domain.mjs";

const allowedSections = new Set(["slug", "business", "design", "features", "catalog", "employees", "hours", "paymentRules", "settings", "taxConfig", "members", "reviewSettings", "music", "teamBooking"]);

function color(value, fallback) {
  const result = cleanText(value, 20);
  return /^#[0-9a-fA-F]{6}$/.test(result) ? result : fallback;
}

function sanitizeBusiness(value = {}, current = {}) {
  const locations = Array.isArray(value.locations ?? current.locations)
    ? (value.locations ?? current.locations).slice(0, 30).map((location, index) => ({
      id: cleanText(location.id || `location-${index + 1}`, 120),
      name: cleanText(location.name, 180),
      address: cleanText(location.address, 500),
      phone: cleanText(location.phone, 80),
      mapsUrl: cleanText(location.mapsUrl, 1500),
      hours: sanitizeHours(location.hours || {}),
      active: location.active !== false,
    })).filter((location) => location.name)
    : [];
  return {
    ...current,
    policies: sanitizePolicies(value.policies ?? current.policies),
    name: cleanText(value.nameEn ?? value.name ?? current.nameEn ?? current.name, 180),
    nameEn: cleanText(value.nameEn ?? value.name ?? current.nameEn ?? current.name, 180),
    nameEs: cleanText(value.nameEs ?? current.nameEs, 180),
    contactName: cleanText(value.contactName ?? current.contactName, 180),
    category: cleanText(value.category ?? current.category, 180),
    description: cleanText(value.descriptionEn ?? value.description ?? current.descriptionEn ?? current.description, 6000),
    descriptionEn: cleanText(value.descriptionEn ?? value.description ?? current.descriptionEn ?? current.description, 6000),
    descriptionEs: cleanText(value.descriptionEs ?? current.descriptionEs, 6000),
    phone: cleanText(value.phone ?? current.phone, 80),
    whatsapp: cleanText(value.whatsapp ?? current.whatsapp, 80),
    email: cleanText(value.email ?? current.email, 320),
    address: cleanText(value.address ?? current.address, 500),
    mapsUrl: cleanText(value.mapsUrl ?? current.mapsUrl, 1500),
    locations,
    ...(value.socialLinks === undefined ? {} : {socialLinks:normalizeSocialLinks(value.socialLinks)}),
    instagram: cleanText(value.instagram ?? current.instagram, 300),
    facebook: cleanText(value.facebook ?? current.facebook, 300),
    x: cleanText(value.x ?? current.x, 300),
    logoAssetKey: cleanText(value.logoAssetKey ?? current.logoAssetKey, 700),
  };
}

function catalogNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  if (!["number", "string"].includes(typeof value) || (typeof value === "string" && !value.trim())) {
    throw Object.assign(new Error("Catalog numeric fields must be finite numbers."), { status: 400 });
  }
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER) {
    throw Object.assign(new Error("Catalog numeric fields must be finite numbers within the supported range."), { status: 400 });
  }
  return number;
}

function settingsTimezone(value) {
  if (typeof value !== "string") throw Object.assign(new Error("Choose a valid time zone."), { status: 400 });
  const timezone = cleanText(value, 120);
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); }
  catch { throw Object.assign(new Error("Choose a valid time zone."), { status: 400 }); }
  return timezone;
}

function sanitizeCatalog(value) {
  if (!Array.isArray(value)) throw Object.assign(new Error("Catalog must be a list."), { status: 400 });
  if (value.length > 100) throw Object.assign(new Error("The catalog limit is 100 products and services."), { status: 400 });
  const ids = new Set();
  return value.map((item, index) => {
    const id = cleanText(item.id || `item-${index + 1}`, 120);
    if (ids.has(id)) throw Object.assign(new Error("Catalog item IDs must be unique."), { status: 400 });
    ids.add(id);
    const price = Math.round(Math.max(0, catalogNumber(item.price)) * 100);
    if (!Number.isSafeInteger(price)) throw Object.assign(new Error("Catalog price exceeds the supported range."), { status: 400 });
    return {
      id,
      type: item.type === "service" ? "service" : "product",
      name: cleanText(item.nameEn || item.name || item.nameEs, 220),
      nameEn: cleanText(item.nameEn || item.name, 220),
      nameEs: cleanText(item.nameEs, 220),
      description: cleanText(item.descriptionEn || item.description || item.descriptionEs, 6000),
      descriptionEn: cleanText(item.descriptionEn || item.description, 6000),
      descriptionEs: cleanText(item.descriptionEs, 6000),
      price: price / 100,
      active: item.active !== false,
      inventory: item.type === "product" && item.inventory !== null && item.inventory !== ""
        ? Math.max(0, Math.floor(catalogNumber(item.inventory)))
        : null,
      requiresAppointment: item.type === "service" && Boolean(item.requiresAppointment),
      duration: item.type === "service" ? Math.max(5, Math.min(1440, catalogNumber(item.duration, 30))) : 0,
      bufferMinutes: item.type === "service" ? Math.max(0, Math.min(240, catalogNumber(item.bufferMinutes))) : 0,
      imageAssetKey: cleanText(item.imageAssetKey, 700),
      taxable: item.taxable !== false,
      taxRateOverride: item.taxRateOverride === null || item.taxRateOverride === "" || item.taxRateOverride === undefined ? null : Math.max(0, Math.min(100, catalogNumber(item.taxRateOverride))),
      sku: cleanText(item.sku, 120),
      trackInventory: item.type === "product" && Boolean(item.trackInventory),
      lowStockThreshold: item.type === "product" ? Math.max(0, Math.floor(catalogNumber(item.lowStockThreshold))) : 0,
      allowBackorder: item.type === "product" && Boolean(item.allowBackorder),
    };
  });
}

function sanitizeEmployees(value, catalog, locations = []) {
  if (!Array.isArray(value)) throw Object.assign(new Error("Employees must be a list."), { status: 400 });
  if (value.length > 100) throw Object.assign(new Error("The employee limit is 100."), { status: 400 });
  const serviceIds = new Set((catalog || []).filter((item) => item.type === "service").map((item) => item.id));
  const locationIds = new Set((locations || []).map((location) => location.id));
  return value.map((member, index) => ({
    id: cleanText(member.id || `employee-${index + 1}`, 120),
    name: cleanText(member.name, 180),
    role: cleanText(member.roleEn || member.role || member.roleEs, 180),
    roleEn: cleanText(member.roleEn || member.role, 180),
    roleEs: cleanText(member.roleEs, 180),
    active: member.active !== false,
    serviceIds: Array.isArray(member.serviceIds)
      ? [...new Set(member.serviceIds.map((id) => cleanText(id, 120)).filter((id) => serviceIds.has(id)))].slice(0, 100)
      : [],
    locationIds: Array.isArray(member.locationIds)
      ? [...new Set(member.locationIds.map((id) => cleanText(id, 120)).filter((id) => locationIds.has(id)))].slice(0, 30)
      : [],
    calendarId: cleanText(member.calendarId, 500),
    dailyLimit: Math.max(1, Math.min(100, Number(member.dailyLimit || 8))),
    schedule: sanitizeHours(member.schedule || {}),
    timeOff: Array.isArray(member.timeOff) ? member.timeOff.slice(0, 365).map((entry) => ({
      start: cleanText(entry.start, 40), end: cleanText(entry.end, 40), note: cleanText(entry.note, 300),
    })) : [],
  }));
}

function sanitizeHours(value = {}) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Object.assign(new Error('Hours must be an object.'),{status:400});
  const result = {};
  for (const [day, hours] of Object.entries(value).slice(0, 14)) {
    const {enabled,open,close}=normalizeHoursWindow(hours);
    result[cleanText(day, 40)] = {
      breaks: Array.isArray(hours?.breaks)?hours.breaks.slice(0,12).map(entry=>({start:cleanText(entry.start,5),end:cleanText(entry.end,5)})).filter(entry=>/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.start)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.end)&&entry.start<entry.end):[],
      enabled,open,close,
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

export function normalizeClientSection(site, section, incoming, user, membership) {
    if (!allowedSections.has(section)) throw Object.assign(new Error("Invalid settings section."), {status:400});
    const payload = {value:incoming};
    if (section === "business" && !["active", "trialing", "trial", "complimentary"].includes(site.servicePlan?.subscriptionStatus)) {
      const incoming = payload.value || {};
      const brandFields = ["name", "nameEn", "nameEs", "category"];
      const changesBrand = brandFields.some((field) => incoming[field] !== undefined && incoming[field] !== (site.business?.[field] ?? (field === "nameEn" ? site.business?.name : "")));
      if (changesBrand) throw Object.assign(new Error("An active WebFactory subscription is required to change the business brand or category."), { status: 403 });
    }
    if (["design", "features"].includes(section) && !["active", "trialing", "trial", "complimentary"].includes(site.servicePlan?.subscriptionStatus)) {
      throw Object.assign(new Error("An active WebFactory subscription is required to redesign this website."), { status: 403 });
    }

    let value;
    if (section === "business") value = sanitizeBusiness(payload.value, site.business);
    if (section === "design") value = {
      ...site.design,
      ...(typeof payload.value?.templateSlug === "string" && /^[a-z0-9-]{1,80}$/.test(payload.value.templateSlug) ? {
        templateSlug: cleanText(payload.value.templateSlug, 80),
        templateName: cleanText(payload.value.templateName, 220),
        templateCategory: cleanText(payload.value.templateCategory, 180),
        templateRoute: `/templates/${cleanText(payload.value.templateSlug, 80)}`,
        preserveTemplateStructure: true,
        mode: "template_base",
      } : payload.value?.templateSlug === "" ? { templateSlug: "", templateName: "", templateCategory: "", templateRoute: "", preserveTemplateStructure: false, mode: "custom" } : {}),
      templateOverrides: normalizeTemplateOverrides(payload.value?.templateOverrides ?? site.design?.templateOverrides),
      style: ["Modern", "Luxury", "Minimal", "Bold"].includes(payload.value?.style) ? payload.value.style : site.design?.style,
      primary: color(payload.value?.primary, site.design?.primary || "#0B1529"),
      secondary: color(payload.value?.secondary, site.design?.secondary || "#3C86F6"),
    };
    if (section === "features") {
      const allowedFeatures = ["products", "services", "bookings", "cart", "maps", "calls", "whatsapp", "social", "form", "calendar"];
      value = { ...(site.features || {}) };
      for (const feature of allowedFeatures) if (payload.value?.[feature] !== undefined) value[feature] = Boolean(payload.value[feature]);
    }
    if (section === "catalog") value = sanitizeCatalog(payload.value);
    if (section === "employees") {
      if (!Array.isArray(payload.value)) throw Object.assign(new Error("Professionals must be a list."),{status:400});
      for (const professional of payload.value) {
        if (professional.dailyLimit!==undefined && (!Number.isInteger(Number(professional.dailyLimit)) || Number(professional.dailyLimit)<1 || Number(professional.dailyLimit)>100)) throw Object.assign(new Error("Choose a daily limit from 1 to 100."),{status:400});
        for (const block of professional.timeOff || []) {
          if (!block.start || !block.end || !Number.isFinite(Date.parse(block.start)) || !Number.isFinite(Date.parse(block.end)) || Date.parse(block.end)<Date.parse(block.start)) throw Object.assign(new Error("Choose valid unavailable dates."),{status:400});
        }
      }
      value = sanitizeEmployees(payload.value, site.catalog, site.business?.locations || []).map(employee=>({...((site.employees || []).find(existing=>existing.id===employee.id)||{}),...employee}));
      if (value.some(employee=>employee.id===teamBookingId)||new Set(value.map(employee=>employee.id)).size!==value.length) throw Object.assign(new Error("Professional IDs must be unique."),{status:400});
      if ((site.members || []).some(member=>member.employeeId && !value.some(employee=>employee.id===member.employeeId))) throw Object.assign(new Error("Unlink portal access before removing a professional. Deactivate to preserve bookings."),{status:409});
    }
    if (section === "hours") value = sanitizeHours(payload.value);
    if (section === "paymentRules") value = sanitizePaymentRules(payload.value, site.paymentRules);
    if (section === "taxConfig") value = normalizeTaxConfig(payload.value);
    if (section === "members") throw Object.assign(new Error("Use the verified portal access controls."), {status:403});
    if (section === "reviewSettings") value = {
      enabled: Boolean(payload.value?.enabled),
      postalAddress: cleanText(payload.value?.postalAddress, 500),
      delayHours: Math.max(0, Math.min(720, Number(payload.value?.delayHours ?? 2))),
      reviewUrl: cleanText(payload.value?.reviewUrl, 1500),
      includeOrders: payload.value?.includeOrders !== false,
      includeBookings: payload.value?.includeBookings !== false,
    };

    if (section === "reviewSettings" && value.enabled && (!value.postalAddress || !/^https:\/\//.test(value.reviewUrl))) {
      throw Object.assign(new Error("Add a valid postal address and an HTTPS review link before enabling review emails."), { status: 400 });
    }

    if (section === "settings") value = {
      ...site.settings,
      bookingPolicy: normalizeBookingPolicy(payload.value?.bookingPolicy || {}, site.settings?.bookingPolicy),
      waitlistEnabled: typeof payload.value?.waitlistEnabled==='boolean'?payload.value.waitlistEnabled:site.settings?.waitlistEnabled===true,
      bookingApproval: payload.value?.bookingApproval ?? site.settings?.bookingApproval ?? 'automatic',
      locale: payload.value?.locale === "es" ? "es" : "en",
      timezone: settingsTimezone(payload.value?.timezone ?? site.settings?.timezone ?? "America/Puerto_Rico"),
      currency: "usd",
      allowCustomerCancellation: typeof payload.value?.allowCustomerCancellation === "boolean" ? payload.value.allowCustomerCancellation : (site.settings?.allowCustomerCancellation ?? true),
      allowCustomerRescheduling: typeof payload.value?.allowCustomerRescheduling === "boolean" ? payload.value.allowCustomerRescheduling : (site.settings?.allowCustomerRescheduling ?? true),
      sendGoogleCalendarInvites: typeof payload.value?.sendGoogleCalendarInvites === "boolean" ? payload.value.sendGoogleCalendarInvites : (site.settings?.sendGoogleCalendarInvites === true),
    };
    if (section === "business" && value.email && !validEmail(value.email)) throw Object.assign(new Error("Business email is invalid."), { status: 400 });
    if(section==='settings' && (!['automatic','manual'].includes(value.bookingApproval)||value.bookingApproval==='manual'&&site.paymentRules?.bookingPayment!=='in_person'))throw Object.assign(new Error('Manual approval requires in-person booking payment.'),{status:400});
    if(section==='paymentRules'&&site.settings?.bookingApproval==='manual'&&value.bookingPayment!=='in_person')throw Object.assign(new Error('Disable manual approval before changing booking payment mode.'),{status:400});

    return value;
}

/** Existing-site Builder writes are validated together and committed with one revision. */
export async function normalizeBuilderUpdate(site, input, user, membership, assetMetadata = key => clientAssetStore().getMetadata(key)) {
  const fail = (message,status=400) => {throw Object.assign(new Error(message),{status});};
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Invalid Builder changes.');
  const fields=['business','design','features','catalog','team','hours','payments'];
  if (Object.keys(input).some(key=>!fields.includes(key)) || fields.some(key=>input[key]===undefined)) fail('Invalid Builder sections.');
  for(const key of ['business','design','features','hours','payments'])if(!input[key]||typeof input[key]!=='object'||Array.isArray(input[key]))fail('Invalid Builder section.');
  if(!Array.isArray(input.catalog)||!Array.isArray(input.team))fail('Catalog and team must be lists.');
  if([...input.catalog,...input.team].some(item=>!item||typeof item!=='object'||Array.isArray(item)))fail('Invalid Builder records.');
  const patch={};
  patch.business=normalizeClientSection(site,'business',input.business,user,membership);
  // Branches, portal identities and administrative settings are not Builder fields.
  patch.business.locations=site.business?.locations||[];
  patch.business.heroAssetKey=cleanText(input.business.heroAssetKey,700);
  if(!Array.isArray(input.business.galleryAssets)||input.business.galleryAssets.length>100)fail('The gallery limit is 100 images.');
  patch.business.galleryAssetKeys=input.business.galleryAssets.map(asset=>{if(!asset||typeof asset.assetKey!=='string'||!asset.assetKey)fail('Invalid gallery image.');return cleanText(asset.assetKey,700);});
  patch.design=normalizeClientSection(site,'design',input.design,user,membership);
  if(!['split','centered','editorial','showcase'].includes(input.design.customLayout))fail('Invalid custom layout.');
  const sections=['catalog','team','about','gallery','contact'];
  if(!Array.isArray(input.design.sectionOrder)||input.design.sectionOrder.length>5||new Set(input.design.sectionOrder).size!==input.design.sectionOrder.length||input.design.sectionOrder.some(key=>!sections.includes(key)))fail('Invalid section order.');
  Object.assign(patch.design,{customLayout:input.design.customLayout,sectionOrder:input.design.sectionOrder});
  patch.features=normalizeClientSection(site,'features',input.features,user,membership);
  if(!Array.isArray(input.catalog)||!Array.isArray(input.team))fail('Catalog and team must be lists.');
  // Keep existing stock, tax metadata and historical rows. Removal means deactivation.
  const catalogFields=['id','type','name','nameEn','nameEs','description','descriptionEn','descriptionEs','price','requiresAppointment','duration','imageAssetKey'];
  const catalog=input.catalog.map(item=>{
    if(typeof item.price!=='number'||!Number.isFinite(item.price)||item.price<0)fail('Every catalog price must be a valid nonnegative number.');
    const previous=(site.catalog||[]).find(row=>row.id===item.id);
    return {...previous,...Object.fromEntries(catalogFields.filter(key=>item[key]!==undefined).map(key=>[key,item[key]])),active:true};
  });
  const catalogIds=new Set(catalog.map(item=>item.id));
  const archived=(site.catalog||[]).filter(item=>!catalogIds.has(item.id)).map(item=>({...item,active:false}));
  if(catalog.length+archived.length>100)fail('The catalog limit is 100 products and services, including inactive records.');
  patch.catalog=[...normalizeClientSection(site,'catalog',catalog,user,membership).map(item=>({...((site.catalog||[]).find(row=>row.id===item.id)||{}),...item})),...archived];
  const employeeFields=['id','name','role','roleEn','roleEs','serviceIds'];
  const team=input.team.map(member=>({...((site.employees||[]).find(row=>row.id===member.id)||{}),...Object.fromEntries(employeeFields.filter(key=>member[key]!==undefined).map(key=>[key,member[key]])),active:true}));
  const teamIds=new Set(team.map(member=>member.id));
  team.push(...(site.employees||[]).filter(member=>!teamIds.has(member.id)).map(member=>({...member,active:false})));
  patch.employees=normalizeClientSection({...site,catalog:patch.catalog},'employees',team,user,membership);
  patch.hours=normalizeClientSection(site,'hours',input.hours,user,membership);
  patch.paymentRules=normalizeClientSection(site,'paymentRules',input.payments,user,membership);
  Object.assign(patch.features,{stripe:patch.paymentRules.methods.stripe,ath:patch.paymentRules.methods.ath,inPersonPayments:patch.paymentRules.methods.inPerson});
  const keys=value=>[value.business?.logoAssetKey,value.business?.heroAssetKey,...(value.business?.galleryAssetKeys||[]),...(value.catalog||[]).map(item=>item.imageAssetKey)].filter(Boolean);
  const oldKeys=new Set(keys(site));
  for(const key of new Set(keys(patch))){
    // Existing legacy Builder assets can be retained, never attached from another draft.
    if(oldKeys.has(key))continue;
    if(!key.startsWith(`sites/${site.siteId}/`)||key.split('/').some(part=>part==='..'||part==='.')||/[\\%?#]/.test(key))fail('This image does not belong to this business.',403);
    const metadata=await assetMetadata(key);
    if(!metadata||!['image/jpeg','image/png','image/webp','image/gif'].includes(metadata.metadata?.contentType))fail('Upload this image again before publishing.');
  }
  const slug=String(input.business.slug||'');
  if(slug!==site.slug){const validated=validatePublicSiteSlug(slug);patch.slug=validated;}
  return patch;
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
      return Response.json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, membership: { ...membership, capabilities: commercialCapabilities(membership).filter(capability=>membershipAllowsCapability(site,capability)) }, site: employeeSiteView(site,membership), posOperations: await readPosOperations(site.siteId) }, { headers: { "Cache-Control": "no-store" } });
    }

    if (req.method !== "PATCH") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    assertSameOrigin(req);
    const payload = await req.json();
    const section = cleanText(payload.section, 40);
    if (section!=="builder" && !allowedSections.has(section)) throw Object.assign(new Error("Invalid settings section."), { status: 400 });
    const { user, site, membership } = await requireSiteAccess(payload.siteId, ["owner"]);
    if(section==='builder') {
      if(!Number.isSafeInteger(payload.revision)||payload.revision!==site.revision)throw Object.assign(new Error('This website changed. Reload before publishing your changes.'),{status:409});
      const patch=await normalizeBuilderUpdate(site,payload.value,user,membership);
      if(patch.slug)await claimPublicSiteSlug(clientSiteStore(),site.siteId,patch.slug);
      const updated=await patchClientSite(site.siteId,patch,{expectedRevision:payload.revision});
      return Response.json({ok:true,site:updated,publicSite:publicClientSite(updated)},{headers:{'Cache-Control':'no-store'}});
    }
    if (section === "slug") {
      const updated = await renameClientSiteSlug(site.siteId, payload.value, payload.revision);
      return Response.json({ ok: true, site: updated, publicSite: publicClientSite(updated) }, { headers: { "Cache-Control": "no-store" } });
    }
    if (section === "teamBooking") {
      if (typeof payload.value?.enabled!=='boolean') throw Object.assign(new Error('Choose a valid booking mode.'),{status:400});
      if (!Number.isSafeInteger(payload.revision)||payload.revision!==site.revision) throw Object.assign(new Error('Reload before changing the booking agenda.'),{status:409});
      const calendarId=cleanText(payload.value.calendarId ?? site.settings?.teamBookingCalendarId,320);
      if (calendarId && calendarId!==site.settings?.teamBookingCalendarId &&
          (!site.googleCalendar?.connected || !(await listGoogleCalendars(site.siteId)).some(calendar=>calendar.id===calendarId))) {
        throw Object.assign(new Error('Choose a writable Google Calendar.'),{status:400});
      }
      const settings={...site.settings,teamBookingEnabled:payload.value.enabled,teamBookingCalendarId:calendarId};
      const updated=await withBookingLock(clientCommerceStore(),bookingModeLockKey(site.siteId),()=>
        patchClientSite(site.siteId,{settings},{expectedRevision:payload.revision}));
      return Response.json({ok:true,site:updated},{headers:{'Cache-Control':'no-store'}});
    }
    if (section === "music") {
      if (!siteCanPublishMusic(site)) throw Object.assign(new Error("Music is available for artist and DJ websites."),{status:400});
      if (!Number.isSafeInteger(payload.revision) || payload.revision!==site.revision) throw Object.assign(new Error("Reload before editing the music library."),{status:409});
      const value=await validateMusic(payload.value,site.siteId);
      const updated=await patchClientSite(site.siteId,{music:value},{expectedRevision:payload.revision});
      return Response.json({ok:true,site:updated},{headers:{"Cache-Control":"no-store"}});
    }
    const value = normalizeClientSection(site, section, payload.value, user, membership);

    if(['catalog','employees'].includes(section)&&!Number.isInteger(payload.revision))throw Object.assign(new Error('Reload the portal before editing the catalog.'),{status:409});
    const updated = await patchClientSite(site.siteId, { [section]: value },['catalog','employees'].includes(section)?{expectedRevision:payload.revision}:{});
    return Response.json({ ok: true, site: updated, publicSite: publicClientSite(updated) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (typeof error?.code === 'string' && /^SLUG_[A-Z_]+$/.test(error.code)) return Response.json({ ok: false, code: error.code, message: error.status >= 500 ? 'The change could not be confirmed. Reload before retrying.' : error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    return errorResponse(error);
  }
};



async function validateMusic(input,siteId) {
  const value = normalizeSiteMusic(input,siteId);
  const bad = message => Object.assign(new Error(message),{status:400});
  if (!Array.isArray(input?.tracks) || input.tracks.length>musicTrackLimit || value.tracks.length!==input.tracks.length) throw bad("Check the track names and audio files.");
  const store=clientAssetStore();
  await Promise.all(value.tracks.map(async (row,index) => {
    const audio=await store.getMetadata(row.audioKey);
    if (audio?.metadata?.contentType!=="audio/mpeg") throw bad("Upload the audio again.");
    if (input.tracks[index].coverKey && !row.coverKey) throw bad("Invalid track cover.");
    if (row.coverKey) {
      const cover=await store.getMetadata(row.coverKey);
      if (!/^image\/(jpeg|png|webp|gif)$/.test(cover?.metadata?.contentType||"")) throw bad("Upload the cover again.");
    }
  }));
  return value;
}
