import { requirePlatformAdmin, errorResponse } from "../lib/client-auth.mjs";
import { clientAssetStore, clientCommerceStore, clientSiteStore } from "../lib/client-store.mjs";

async function readJsonPrefix(store, prefix) {
  const listed = await store.list({ prefix });
  const records = [];
  for (const blob of listed.blobs || []) {
    const value = await store.get(blob.key, { type: "json" });
    if (value !== null) records.push({ key: blob.key, value });
  }
  return records;
}

async function assetManifest(siteId) {
  const listed = await clientAssetStore().list({ prefix: `sites/${siteId}/` });
  const assets = [];
  for (const blob of listed.blobs || []) {
    const meta = await clientAssetStore().getMetadata(blob.key);
    assets.push({ key: blob.key, etag: blob.etag || "", metadata: meta?.metadata || {} });
  }
  return assets;
}

async function listSites() {
  const listed = await clientSiteStore().list({ prefix: "sites/" });
  const blobs = (listed.blobs || []).filter((blob) => /^sites\/[^/]+\.json$/.test(blob.key));
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
      const commerce = await readJsonPrefix(clientCommerceStore(), `${site.siteId}/`);
      const assets = await assetManifest(site.siteId);
      tenants.push({ siteId: site.siteId, site, commerce, assets });
    }

    const payload = {
      exportVersion: "webfactory-production-tenants-backup-1",
      exportedAt: new Date().toISOString(),
      exportedBy: admin.email,
      tenantCount: tenants.length,
      tenants,
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="webfactory-production-tenants-backup-${new Date().toISOString().slice(0,10)}.json"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
