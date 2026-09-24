import { getUser } from "@netlify/identity";
import { getClientSite, normalizeEmail, sitesForEmail } from "./client-store.mjs";

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
  return user;
}

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

export async function requirePlatformAdmin() {
  const user = await requireClientUser();
  const roles = new Set([
    ...(Array.isArray(user.roles) ? user.roles : []),
    ...(Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : []),
    user.role,
  ].filter(Boolean));
  const ownerEmail = normalizeEmail(env("WEBFACTORY_ADMIN_EMAIL") || env("WEBFACTORY_ORDER_EMAIL"));
  const authorized = roles.has("admin") || roles.has("webfactory_owner") || (
    ownerEmail && normalizeEmail(user.email) === ownerEmail
  );
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
  const email = normalizeEmail(user.email);
  const membership = (site.members || []).find((member) => normalizeEmail(member.email) === email);
  const platformAdmin = (user.roles || []).includes("admin") || user.role === "admin";
  if (!platformAdmin && (!membership || !roles.includes(membership.role || "owner"))) {
    const error = new Error("You do not have access to this business.");
    error.status = 403;
    throw error;
  }
  return { user, site, membership: membership || { email, role: "admin" } };
}


export const SITE_ROLE_CAPABILITIES = {
  owner: ["overview","website","orders","bookings","customers","catalog","employees","payments","pos","marketing","analytics","integrations","settings","billing","refunds"],
  manager: ["overview","website","orders","bookings","customers","catalog","employees","payments","pos","marketing","analytics","integrations","settings","refunds"],
  employee: ["overview","bookings","customers"],
  cashier: ["overview","orders","customers","payments","pos"],
  admin: ["overview","website","orders","bookings","customers","catalog","employees","payments","pos","marketing","analytics","integrations","settings","billing","refunds"],
};

export function siteRoleCapabilities(role = "employee") {
  return SITE_ROLE_CAPABILITIES[role] || SITE_ROLE_CAPABILITIES.employee;
}

export function membershipHasCapability(membership, capability) {
  return siteRoleCapabilities(membership?.role || "employee").includes(capability);
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
  const status = Number(error?.status || 500);
  if (status >= 500) console.error("client-api", error);
  return Response.json(
    { ok: false, message: error?.message || "Unexpected server error." },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
