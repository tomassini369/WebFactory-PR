import { clientOAuthStore, patchClientSite } from "../lib/client-store.mjs";
import { encryptToken, exchangeGoogleCode, googleUserEmail } from "../lib/google-calendar.mjs";
import { publicBaseUrl } from "../lib/platform-utils.mjs";

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
    if (state.kind === "business-email") {
      const connectedEmail = await googleUserEmail(token);
      await clientOAuthStore().setJSON(`business-email/tokens/${state.siteId}.json`, { encrypted: encryptToken(token), updatedAt: new Date().toISOString() });
      try {
        await patchClientSite(state.siteId, { businessEmail: { provider: "google", connected: true, connectedEmail, connectedAt: new Date().toISOString(), disconnectedAt: "" } });
      } catch (error) {
        await clientOAuthStore().delete(`business-email/tokens/${state.siteId}.json`).catch(() => {});
        throw error;
      }
      await clientOAuthStore().delete(stateKey);
      return Response.redirect(`${publicBaseUrl()}/client-admin?businessEmail=connected&siteId=${encodeURIComponent(state.siteId)}`, 302);
    }
    await clientOAuthStore().setJSON(`tokens/${state.siteId}.json`, { encrypted: encryptToken(token), updatedAt: new Date().toISOString() });
    await patchClientSite(state.siteId, { googleCalendar: { connected: true, connectedAt: new Date().toISOString(), employeeCalendars: {} } });
    await clientOAuthStore().delete(stateKey);
    return Response.redirect(`${publicBaseUrl()}/client-admin?google=connected&siteId=${encodeURIComponent(state.siteId)}`, 302);
  } catch (error) {
    const state = await clientOAuthStore().get(stateKey, { type: "json" }).catch(() => null);
    await clientOAuthStore().delete(stateKey).catch(() => {});
    const key = state?.kind === "business-email" ? "businessEmail" : "google";
    const site = state?.siteId ? `&siteId=${encodeURIComponent(state.siteId)}` : "";
    return Response.redirect(`${publicBaseUrl()}/client-admin?${key}=error${site}`, 302);
  }
};
