import { renderAthCheckoutPage } from "../lib/ath-checkout-page.mjs";
import { getClientSite } from "../lib/client-store.mjs";
import { assertAthProduction, getAthSession } from "../lib/ath-movil.mjs";
import { athError, athReady, decryptAthCredentials } from "../lib/ath-domain.mjs";

export default async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed.", { status: 405 });
    assertAthProduction(req.url);
    const token = new URL(req.url).searchParams.get("token");
    const { session, record } = await getAthSession(token);
    const site = await getClientSite(session.siteId);
    if(Date.parse(session.checkoutExpiresAt || session.expiresAt) < Date.now() && !record.athSettledAt) throw athError("ATH checkout has expired. Start a new checkout or ask the business to verify your payment reference.",410);
    if (!site || !athReady(site) || site.paymentRules.ath.credentialVersion !== session.credentialVersion) throw athError("The business changed its ATH configuration. Start a new checkout.", 409);
    const credentials = record.athSettledAt ? {publicToken:""} : decryptAthCredentials(session.siteId, session.encrypted);
    const html=renderAthCheckoutPage({site,session,record,token,publicToken:credentials.publicToken});
    return new Response(html, { headers: {
      "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://payments.athmovil.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://payments.athmovil.com; img-src 'self' data: https://payments.athmovil.com; connect-src 'self' https://payments.athmovil.com https://www.athmovil.com https://*.firebaseio.com wss://*.firebaseio.com; frame-src https://payments.athmovil.com; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    } });
  } catch (error) {
    return new Response(error?.status ? error.message : "ATH checkout is temporarily unavailable.", { status: error?.status || 500, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
};
