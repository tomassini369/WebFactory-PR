import { requirePlatformAdmin, errorResponse } from "../lib/client-auth.mjs";
import { clientAssetStore, clientCommerceStore, clientSiteStore, getClientSite } from "../lib/client-store.mjs";
import { cleanText } from "../lib/order-store.mjs";
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

async function assetManifest(siteId) {
  const listed = await clientAssetStore().list({ prefix: `sites/${siteId}/` });
  const assets = [];
  for (const blob of listed.blobs || []) {
    const meta = await clientAssetStore().getMetadata(blob.key);
    assets.push({ key: blob.key, etag: blob.etag || "", metadata: meta?.metadata || {} });
  }
  return assets;
}

export default async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const admin = await requirePlatformAdmin();
    const siteId = cleanText(new URL(req.url).searchParams.get("siteId"), 120);
    if (!siteId) throw Object.assign(new Error("siteId is required."), { status: 400 });

    const site = await getClientSite(siteId);
    if (!site) throw Object.assign(new Error("Client site not found."), { status: 404 });

    const commerce = await readPrefix(clientCommerceStore(), `${siteId}/`);
    const v3Collections = {};
    for (const collection of ["customers","receipts","payment-links","inventory-movements","review-requests"]) {
      v3Collections[collection] = await listV3Records(siteId, collection, { limit: 1000 });
    }
    const assets = await assetManifest(siteId);

    const payload = {
      exportVersion: "webfactory-v3-site-backup-1",
      exportedAt: new Date().toISOString(),
      exportedBy: admin.email,
      siteId,
      site,
      commerce,
      v3Collections,
      assets,
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="webfactory-${siteId}-backup.json"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
