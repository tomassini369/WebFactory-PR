import { clientOAuthStore, patchClientSite } from "../lib/client-store.mjs";
import { encryptToken, exchangeGoogleCode } from "../lib/google-calendar.mjs";
import { publicBaseUrl } from "../lib/order-store.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const stateId = url.searchParams.get("state") || "";
  const stateKey = `states/${stateId}.json`;
  try {
    const state = await clientOAuthStore().get(stateKey, { type: "json" });
    if (!state || Date.parse(state.expiresAt || "") < Date.now()) throw new Error("Google authorization expired.");
    if (url.searchParams.get("error")) throw new Error("Google authorization was cancelled.");
    const token = await exchangeGoogleCode(url.searchParams.get("code") || "");
    token.expires_at = Date.now() + Number(token.expires_in || 3600) * 1000;
    await clientOAuthStore().setJSON(`tokens/${state.siteId}.json`, { encrypted: encryptToken(token), updatedAt: new Date().toISOString() });
    await patchClientSite(state.siteId, { googleCalendar: { connected: true, connectedAt: new Date().toISOString(), employeeCalendars: {} } });
    await clientOAuthStore().delete(stateKey);
    return Response.redirect(`${publicBaseUrl()}/client-admin?google=connected`, 302);
  } catch (error) {
    await clientOAuthStore().delete(stateKey).catch(() => {});
    return Response.redirect(`${publicBaseUrl()}/client-admin?google=error`, 302);
  }
};
