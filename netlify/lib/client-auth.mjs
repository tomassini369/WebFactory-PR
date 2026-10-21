import {activeMembership, commercialCapabilities, COMMERCIAL_ROLES} from "./commercial-access.mjs";
import { getUser } from "@netlify/identity";
import { getClientSite, normalizeEmail, sitesForEmail } from "./client-store.mjs";
import { assertSecondFactor } from "./mfa-security.mjs";
import { authorizedAction } from "./internal-action-auth.mjs";

export function assertSameOrigin(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const expected = new URL(req.url).origin;
  if (!origin || origin !== expected) {
    const error = new Error("Invalid request origin.");
    error.status = 403;
    throw error;
  }
}

export async function requireClientUser() {
  // OAuth consent already required portal authentication/MFA. Internal handlers
  // reuse that validated identity; ordinary portal requests retain session/MFA checks.
  const action = authorizedAction();
  if (action) return action.user;
  const user = await getUser();
  if (!user?.email) {
    const error = new Error("Authentication required.");
    error.status = 401;
    throw error;
  }
  await assertSecondFactor(user);
  return user;
}

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

export function isPlatformAdmin(user, ownerEmail = env("WEBFACTORY_ADMIN_EMAIL") || env("WEBFACTORY_ORDER_EMAIL")) {
  const roles = new Set([
    ...(Array.isArray(user?.roles) ? user.roles : []),
    ...(Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : []),
    user?.role,
  ].filter(Boolean));
  return roles.has("admin") || roles.has("webfactory_owner") || Boolean(
    normalizeEmail(ownerEmail) && normalizeEmail(user?.email) === normalizeEmail(ownerEmail)
  );
}

// Membership is resolved from the authenticated identity, never from request fields.
export function authorizeSiteUser(user, site, roles = COMMERCIAL_ROLES) {
  const email = normalizeEmail(user?.email);
  const membership = (site?.members || []).find(member => normalizeEmail(member.email) === email && activeMembership(member));
  if (!site || site.deletedAt || site.status === "deleted") throw Object.assign(new Error("Business unavailable."), {status:403});
  if (!isPlatformAdmin(user) && membership?.userId && membership.userId !== user.id) throw Object.assign(new Error("Portal identity does not match this membership."), {status:403});
  if (!email || (!isPlatformAdmin(user) && (!membership || !COMMERCIAL_ROLES.includes(membership.role) || !roles.includes(membership.role)))) {
    throw Object.assign(new Error("You do not have access to this business. Legacy roles require owner review / Los accesos heredados requieren revisión del Dueño."), { status: 403 });
  }
  return { user, site, membership: isPlatformAdmin(user) ? { email, role: "admin", platform: true } : membership };
}

export async function requirePlatformAdmin() {
  if (authorizedAction() && !authorizedAction().platform) {
    throw Object.assign(new Error("Platform access required."), { status: 403 });
  }
  const user = await requireClientUser();
  const authorized = isPlatformAdmin(user);
  if (!authorized) {
    const error = new Error("This account is not authorized for the WebFactory Control Center.");
    error.status = 403;
    throw error;
  }
  return user;
}

export async function authorizedSites() {
  const user = await requireClientUser();
  const sites = await sitesForEmail(user.email);
  return { user, sites:sites.filter(site=>{try{authorizeSiteUser(user,site);return true}catch{return false}}) };
}

export async function requireSiteAccess(siteId, roles = COMMERCIAL_ROLES) {
  if (authorizedAction() && authorizedAction().siteId !== siteId) {
    throw Object.assign(new Error("Cross-business access denied."), { status: 403 });
  }
  const user = await requireClientUser();
  const site = await getClientSite(siteId);
  if (!site) {
    const error = new Error("Site not found.");
    error.status = 404;
    throw error;
  }
  return authorizeSiteUser(user, site, roles);
}


export const SITE_ROLE_CAPABILITIES = Object.freeze({owner:commercialCapabilities({role:'owner'}),employee:commercialCapabilities({role:'employee'})});
export function siteRoleCapabilities(role = '') { return commercialCapabilities({role}); }
export function membershipHasCapability(membership, capability) { return commercialCapabilities(membership).includes(capability); }

export async function requireSiteCapability(siteId, capability) {
  const result = await requireSiteAccess(siteId, COMMERCIAL_ROLES);
  if (!membershipHasCapability(result.membership, capability)) {
    const error = new Error("This role does not have permission for this action.");
    error.status = 403;
    throw error;
  }
  return result;
}

export function errorResponse(error) {
  const requested = Number(error?.status);
  const status = Number.isInteger(requested) && requested >= 400 && requested <= 599 ? requested : 500;
  if (status >= 500) console.error("client-api", error);
  return Response.json(
    { ok: false, message: status >= 500 ? "The request could not be completed. Please try again later." : (error?.message || "Request rejected.") },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
