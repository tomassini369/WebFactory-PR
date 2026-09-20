import crypto from "node:crypto";
import { errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { clientOAuthStore } from "../lib/client-store.mjs";
import { googleConfigured, googleRedirectUri } from "../lib/google-calendar.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

export default async (req) => {
  if (req.method !== "GET") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    if (!googleConfigured()) throw Object.assign(new Error("Google Calendar is not configured yet."), { status: 503 });
    const siteId = new URL(req.url).searchParams.get("siteId") || "";
    const { user } = await requireSiteAccess(siteId, ["owner", "manager"]);
    const state = crypto.randomBytes(32).toString("base64url");
    await clientOAuthStore().setJSON(`states/${state}.json`, {
      siteId, userEmail: user.email, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    const params = new URLSearchParams({
      client_id: env("GOOGLE_OAUTH_CLIENT_ID"),
      redirect_uri: googleRedirectUri(),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: "openid email https://www.googleapis.com/auth/calendar",
      state,
    });
    return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
  } catch (error) { return errorResponse(error); }
};
