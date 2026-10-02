import { unsubscribeToken, tokenHash } from "../lib/marketing-preferences.mjs";
import { clientEventStore } from "../lib/client-store.mjs";

export default async req => {
  const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
  if (!["GET", "POST"].includes(req.method)) return new Response("Method not allowed", { status: 405, headers });
  const siteId = new URL(req.url).searchParams.get("siteId") || "";
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(siteId) || !/^[a-zA-Z0-9_-]{43}$/.test(token)) return new Response("Invalid link / Enlace inválido", { status: 404, headers });
  const pointer = await clientEventStore().get(`${siteId}/marketing-unsubscribe/${tokenHash(token)}.json`, { type: "json" });
  if (!pointer) return new Response("Invalid link / Enlace inválido", { status: 404, headers });
  // GET never changes preferences: email scanners can follow links safely.
  // POST also supports RFC 8058 one-click unsubscribe using the unguessable token.
  if (req.method === "POST") {
    await unsubscribeToken(token, siteId);
    return new Response("<!doctype html><html lang='es'><meta name='viewport' content='width=device-width'><title>Preferencia guardada</title><main><h1>Preferencia guardada / Preference saved</h1><p>No recibirás más solicitudes de reseña de este negocio. Los recibos y avisos de tus compras o citas continúan.</p><p>You will no longer receive review requests from this business. Purchase and booking notices continue.</p><a href='/'>WebFactory PR</a></main></html>", { headers });
  }
  return new Response(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width"><title>Cancelar emails de reseñas</title><main><h1>Cancelar emails de reseñas / Unsubscribe from review emails</h1><p>Esta opción solo cancela solicitudes de reseña de este negocio. / This stops review requests from this business.</p><form method="post"><button type="submit">Cancelar emails / Unsubscribe</button></form></main></html>`, { headers });
};

export const config = { rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip"] } };
