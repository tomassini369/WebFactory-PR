import { getClientSiteBySlug, publicClientSite } from "../lib/client-store.mjs";

export default async (req) => {
  if (req.method !== "GET") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  const slug = new URL(req.url).searchParams.get("slug") || "";
  const site = await getClientSiteBySlug(slug);
  if (!site || !["active", "preview", "setup_pending"].includes(site.status)) {
    return Response.json({ ok: false, message: "Business site not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ ok: true, site: publicClientSite(site) }, { headers: { "Cache-Control": "no-store" } });
};
