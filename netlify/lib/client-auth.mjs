import { getUser } from "@netlify/identity";
import { getClientSite, normalizeEmail, sitesForEmail } from "./client-store.mjs";
import { assertSecondFactor } from "./mfa-security.mjs";

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
  const membership = (site?.members || []).find(member => normalizeEmail(member.email) === email);
  if (!email || (!isPlatformAdmin(user) && (!membership || !roles.includes(membership.role)))) {
    throw Object.assign(new Error("You do not have access to this business."), { status: 403 });
  }
  return { user, site, membership: membership || { email, role: "admin" } };
}

export async function requirePlatformAdmin() {
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
  owner: ["overview","website","share","orders","bookings","customers","catalog","employees","payments","pos","marketing","analytics","integrations","settings","billing","refunds","kitchen"],
  manager: ["overview","website","share","orders","bookings","customers","catalog","employees","payments","pos","marketing","analytics","integrations","settings","refunds","kitchen"],
  employee: ["overview","share","bookings","customers","kitchen"],
  cashier: ["overview","share","orders","customers","payments","pos","kitchen"],
  staff: ["overview","share"],
  admin: ["overview","website","orders","bookings","customers","catalog","employees","payments","pos","marketing","analytics","integrations","settings","billing","refunds"],
};

export function siteRoleCapabilities(role = "") {
  return Object.hasOwn(SITE_ROLE_CAPABILITIES, role) ? SITE_ROLE_CAPABILITIES[role] : [];
}

export function membershipHasCapability(membership, capability) {
  return siteRoleCapabilities(membership?.role || "").includes(capability);
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
