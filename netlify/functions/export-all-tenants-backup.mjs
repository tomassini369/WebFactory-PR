import { requirePlatformAdmin, errorResponse } from "../lib/client-auth.mjs";
import { clientCommerceStore, clientSiteStore } from "../lib/client-store.mjs";
import { listV3Records } from "../lib/webfactory-v3-store.mjs";

async function readPrefix(store, prefix) {
  const listed = await store.list({ prefix });
  const records = [];
  for (const blob of listed.blobs || []) {
    const value = await store.get(blob.key, { type: "json" });
    if (value) records.push({ key: blob.key, value });
  }
  return records;
}

async function listSites(limit = 300) {
  const listed = await clientSiteStore().list({ prefix: "sites/" });
  const blobs = (listed.blobs || []).filter((blob)=>/sites\/[^/]+\.json$/.test(blob.key)).slice(0, limit);
  const sites = [];
  for (const blob of blobs) {
    const site = await clientSiteStore().get(blob.key, { type: "json" });
    if (site?.siteId) sites.push(site);
  }
  return sites;
}

export default async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const admin = await requirePlatformAdmin();
    const sites = await listSites();
    const tenants = [];

    for (const site of sites) {
      const commerce = await readPrefix(clientCommerceStore(), `${site.siteId}/`);
      const v3Collections = {};
      for (const collection of ["customers","receipts","payment-links","inventory-movements","review-requests"]) {
        v3Collections[collection] = await listV3Records(site.siteId, collection, { limit: 1000 });
      }
      tenants.push({ siteId: site.siteId, site, commerce, v3Collections });
    }

    const payload = {
      exportVersion: "webfactory-v3-all-tenants-backup-1",
      exportedAt: new Date().toISOString(),
      exportedBy: admin.email,
      tenantCount: tenants.length,
      tenants,
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="webfactory-all-tenants-backup-${new Date().toISOString().slice(0,10)}.json"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
