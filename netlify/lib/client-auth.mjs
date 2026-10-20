import { getUser } from "@netlify/identity";
import { getClientSite, normalizeEmail, sitesForEmail } from "./client-store.mjs";
import { assertSecondFactor } from "./mfa-security.mjs";
import { authorizedAction } from "./internal-action-auth.mjs";
import {activeMembership,financialPermissions,hasFinancialPermission,FINANCIAL_PERMISSIONS,PORTAL_ROLES} from './financial-permissions.mjs';

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
export function authorizeSiteUser(user, site, roles = ["owner", "manager", "employee", "cashier"]) {
  const email = normalizeEmail(user?.email);
  if(site?.deletedAt||site?.status==='deleted')throw Object.assign(new Error('Business not found.'),{status:404});
  const membership = (site?.members || []).find(member => normalizeEmail(member.email) === email&&activeMembership(member));
  if(membership?.financialUserId&&membership.financialUserId!==String(user?.id||user?.sub||'')&&!siteRoleCapabilities(membership.role).length&&!isPlatformAdmin(user))throw Object.assign(new Error('Financial identity no longer matches this grant.'),{status:403});
  if (!email || (!isPlatformAdmin(user) && (!membership || !roles.includes(membership.role)))) {
    throw Object.assign(new Error("You do not have access to this business."), { status: 403 });
  }
  return { user, site, membership: membership || { email, role: "admin" } };
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
  return { user, sites };
}

export async function requireSiteAccess(siteId, roles = ["owner", "manager", "employee", "cashier"]) {
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


export const SITE_ROLE_CAPABILITIES = {
  owner: ["overview","website","share","orders","bookings","customers","catalog","employees","payments","pos","marketing","analytics","integrations","settings","billing","refunds","kitchen","accounting"],
  manager: ["overview","website","share","orders","bookings","customers","catalog","employees","payments","pos","marketing","analytics","integrations","settings","refunds","kitchen"],
  employee: ["overview","share","bookings","customers","kitchen"],
  cashier: ["overview","share","orders","customers","payments","pos","kitchen"],
  staff: ["overview","share"],
  admin: ["overview","website","orders","bookings","customers","catalog","employees","payments","pos","marketing","analytics","integrations","settings","billing","refunds","accounting"],
};

export function siteRoleCapabilities(role = "") {
  return Object.hasOwn(SITE_ROLE_CAPABILITIES, role) ? SITE_ROLE_CAPABILITIES[role] : [];
}

export function membershipHasCapability(membership, capability) {
  if(!activeMembership(membership))return false;
  if(FINANCIAL_PERMISSIONS.includes(capability))return hasFinancialPermission(membership,capability);
  return siteRoleCapabilities(membership?.role || "").includes(capability);
}

export function membershipCapabilities(membership){
 if(!activeMembership(membership))return [];
 const financial=financialPermissions(membership);
 return [...new Set([...siteRoleCapabilities(membership.role),...financial,...(financial.includes('accounting.view')?['accounting']:[]),...(membership.financialManaged?['financial_access']:[])])];
}

export async function requireFinancialPermission(siteId,permission){
 if(!FINANCIAL_PERMISSIONS.includes(permission))throw Object.assign(new Error('Unknown financial permission.'),{status:403});
 const result=await requireSiteAccess(siteId,PORTAL_ROLES);
 const membership=isPlatformAdmin(result.user)?{...result.membership,role:'admin'}:result.membership;
 if(membership.financialUserId&&membership.financialUserId!==String(result.user.id||result.user.sub||''))throw Object.assign(new Error('Financial identity mismatch.'),{status:403});
 if(!hasFinancialPermission(membership,permission))throw Object.assign(new Error('Financial permission required / Se requiere autorización financiera.'),{status:403});
 return {...result,membership};
}

export async function requireSiteCapability(siteId, capability) {
  const result = await requireSiteAccess(siteId, ["owner","manager","employee","cashier"]);
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
