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

export async function authorizedSites() {
  const user = await requireClientUser();
  const sites = await sitesForEmail(user.email);
  return { user, sites };
}

export async function requireSiteAccess(siteId, roles = ["owner", "manager", "staff"]) {
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

export function errorResponse(error) {
  const status = Number(error?.status || 500);
  if (status >= 500) console.error("client-api", error);
  return Response.json(
    { ok: false, message: error?.message || "Unexpected server error." },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
