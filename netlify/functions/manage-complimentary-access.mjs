import { assertSameOrigin, errorResponse, requirePlatformAdmin } from "../lib/client-auth.mjs";
import { getClientSite, patchClientSite } from "../lib/client-store.mjs";
import { createSubscriptionRequiredServicePlan } from "../lib/subscription-billing.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  }
  try {
    assertSameOrigin(req);
    const administrator = await requirePlatformAdmin();
    const payload = await req.json();
    const siteId = String(payload.siteId || "").trim();
    if (!siteId) throw Object.assign(new Error("Site ID is required."), { status: 400 });
    if (payload.action !== "revoke") throw Object.assign(new Error("Unsupported complimentary access action."), { status: 400 });

    const site = await getClientSite(siteId);
    if (!site) throw Object.assign(new Error("Client website was not found."), { status: 404 });
    if (site.servicePlan?.billingModel !== "complimentary") {
      throw Object.assign(new Error("This client does not currently have complimentary access."), { status: 409 });
    }

    const servicePlan = createSubscriptionRequiredServicePlan({
      revokedBy: administrator.email,
      previousPlan: site.servicePlan,
    });
    const updated = await patchClientSite(siteId, {
      status: "subscription_required",
      servicePlan,
    });
    return Response.json({
      ok: true,
      siteId: updated.siteId,
      status: updated.status,
      billingModel: updated.servicePlan.billingModel,
      subscriptionStatus: updated.servicePlan.subscriptionStatus,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
