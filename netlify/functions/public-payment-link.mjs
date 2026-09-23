import { getClientSiteBySlug } from "../lib/client-store.mjs";
import { cleanText } from "../lib/order-store.mjs";
import { siteEntitlement } from "../lib/subscription-billing.mjs";
import { listV3Records } from "../lib/webfactory-v3-store.mjs";

export default async (req) => {
  try {
    if (req.method !== "GET") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    const url = new URL(req.url);
    const slug = cleanText(url.searchParams.get("slug"), 80);
    const token = cleanText(url.searchParams.get("token"), 200);
    const site = await getClientSiteBySlug(slug);
    if (!site || !siteEntitlement(site).public) throw Object.assign(new Error("Payment link is unavailable."), { status: 404 });
    const rows = await listV3Records(site.siteId, "payment-links", { limit: 1000 });
    const link = rows.find((row) => row.token === token && row.active !== false);
    if (!link) throw Object.assign(new Error("Payment link is unavailable."), { status: 404 });
    if (link.expiresAt && Date.parse(link.expiresAt) <= Date.now()) throw Object.assign(new Error("Payment link has expired."), { status: 410 });
    return Response.json({
      ok: true,
      business: { name: site.business?.name || site.business?.nameEn || site.business?.nameEs || "", logo: site.business?.logoAssetKey ? `/.netlify/functions/client-asset?siteId=${encodeURIComponent(site.siteId)}&key=${encodeURIComponent(site.business.logoAssetKey)}` : "" },
      link: { title: link.title, description: link.description, amount: Number(link.amount || 0), currency: link.currency || "usd", allowQuantity: Boolean(link.allowQuantity) },
    }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (error) {
    return Response.json({ ok: false, message: error?.message || "Payment link is unavailable." }, { status: Number(error?.status || 500), headers: { "Cache-Control": "no-store" } });
  }
};
