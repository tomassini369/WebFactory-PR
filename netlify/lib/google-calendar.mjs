import crypto from "node:crypto";
import { clientOAuthStore } from "./client-store.mjs";
import { publicBaseUrl } from "./platform-utils.mjs";

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

function encryptionKey() {
  const secret = env("WEBFACTORY_TOKEN_ENCRYPTION_KEY");
  if (!secret) throw Object.assign(new Error("Google Calendar encryption is not configured."), { status: 503 });
  return crypto.createHash("sha256").update(secret).digest();
}

export function googleConfigured() {
  return Boolean(env("GOOGLE_OAUTH_CLIENT_ID") && env("GOOGLE_OAUTH_CLIENT_SECRET") && env("WEBFACTORY_TOKEN_ENCRYPTION_KEY"));
}

export function googleRedirectUri() {
  return env("GOOGLE_OAUTH_REDIRECT_URI") || `${publicBaseUrl()}/.netlify/functions/google-calendar-callback`;
}

export function encryptToken(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") };
}

export function decryptToken(value) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, "base64")), decipher.final()]).toString("utf8"));
}

export async function exchangeGoogleCode(code) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: env("GOOGLE_OAUTH_CLIENT_SECRET"),
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error_description || "Google authorization failed.");
  return result;
}

export async function refreshGoogleToken(siteId) {
  const stored = await clientOAuthStore().get(`tokens/${siteId}.json`, { type: "json" });
  if (!stored?.encrypted) throw Object.assign(new Error("Google Calendar is not connected."), { status: 409 });
  let token = decryptToken(stored.encrypted);
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) return token;
  if (!token.refresh_token) throw Object.assign(new Error("Google Calendar authorization must be renewed."), { status: 409 });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: token.refresh_token,
      client_id: env("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: env("GOOGLE_OAUTH_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });
  const refreshed = await response.json();
  if (!response.ok) throw Object.assign(new Error("Google Calendar authorization must be renewed."), { status: 409 });
  token = { ...token, ...refreshed, expires_at: Date.now() + Number(refreshed.expires_in || 3600) * 1000 };
  await clientOAuthStore().setJSON(`tokens/${siteId}.json`, { encrypted: encryptToken(token), updatedAt: new Date().toISOString() });
  return token;
}

export async function googleApi(siteId, path, options = {}) {
  const token = await refreshGoogleToken(siteId);
  const response = await fetch(`https://www.googleapis.com${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) throw Object.assign(new Error(result?.error?.message || "Google Calendar request failed."), { status: response.status });
  return result;
}

export async function listGoogleCalendars(siteId) {
  const result = await googleApi(siteId, "/calendar/v3/users/me/calendarList?minAccessRole=writer&showHidden=false");
  return (result.items || []).map((calendar) => ({
    id: calendar.id,
    summary: calendar.summary,
    primary: Boolean(calendar.primary),
    accessRole: calendar.accessRole,
    timeZone: calendar.timeZone,
  }));
}

export async function googleBusy(siteId, calendarId, timeMin, timeMax, timeZone) {
  if (!calendarId) return [];
  const result = await googleApi(siteId, "/calendar/v3/freeBusy", {
    method: "POST",
    body: JSON.stringify({ timeMin, timeMax, timeZone, items: [{ id: calendarId }] }),
  });
  return result.calendars?.[calendarId]?.busy || [];
}

export async function createGoogleEvent(siteId, calendarId, event) {
  if (!calendarId) return null;
  return googleApi(siteId, `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function deleteGoogleEvent(siteId, calendarId, eventId) {
  if (!calendarId || !eventId) return;
  await googleApi(siteId, `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
}
