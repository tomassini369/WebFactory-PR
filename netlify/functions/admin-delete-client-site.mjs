import { assertSameOrigin, errorResponse, requirePlatformAdmin } from "../lib/client-auth.mjs";
import { cleanText } from "../lib/order-store.mjs";
import { getClientSite } from "../lib/client-store.mjs";
import { purgeClientSite } from "../lib/client-lifecycle.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  }
  try {
    assertSameOrigin(req);
    const admin = await requirePlatformAdmin();
    const payload = await req.json();
    const siteId = cleanText(payload.siteId, 120);
    const confirmation = String(payload.confirmation || "").trim();
    if (!siteId) throw Object.assign(new Error("Site ID is required."), { status: 400 });
    if (confirmation !== "DELETE PAGE") {
      throw Object.assign(new Error("Type DELETE PAGE to confirm permanent deletion."), { status: 400 });
    }

    const site = await getClientSite(siteId);
    if (!site) throw Object.assign(new Error("Client website was not found."), { status: 404 });

    const result = await purgeClientSite(siteId, { cancelSubscription: true });
    return Response.json({
      ok: true,
      deleted: result.deleted,
      siteId,
      businessName: site.business?.name || site.slug || siteId,
      deletedBy: admin.email,
      deletedCommerce: result.deletedCommerce || 0,
      deletedAssets: result.deletedAssets || 0,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
