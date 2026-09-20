import { getClientSiteBySlug, publicClientSite } from "../lib/client-store.mjs";

export default async (req) => {
  if (req.method !== "GET") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  const slug = new URL(req.url).searchParams.get("slug") || "";
  const site = await getClientSiteBySlug(slug);
  if (!site || !["active", "preview", "setup_pending"].includes(site.status)) {
    return Response.json({ ok: false, message: "Business site not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const etag = `W/"${site.siteId}-${Number(site.revision || 0)}"`;
  const headers = {
    ETag: etag,
    "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    "Netlify-CDN-Cache-Control": "public, durable, s-maxage=30, stale-while-revalidate=300",
    "Cache-Tag": `client-site-${site.siteId}`,
  };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return Response.json({ ok: true, site: publicClientSite(site) }, { headers });
};
