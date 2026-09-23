import { requirePlatformAdmin, errorResponse } from "../lib/client-auth.mjs";
import { clientCommerceStore, clientSiteStore, getClientSite } from "../lib/client-store.mjs";
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

    const payload = {
      exportVersion: "webfactory-v3-site-backup-1",
      exportedAt: new Date().toISOString(),
      exportedBy: admin.email,
      siteId,
      site,
      commerce,
      v3Collections,
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
