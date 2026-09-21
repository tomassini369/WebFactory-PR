import { assertSameOrigin, errorResponse, requirePlatformAdmin, requireSiteAccess } from "../lib/client-auth.mjs";
import { patchClientSite } from "../lib/client-store.mjs";
import { createTrialServicePlan } from "../lib/subscription-billing.mjs";

export default async (req) => {
  if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    assertSameOrigin(req);
    const payload = await req.json();
    const { site } = await requireSiteAccess(payload.siteId, ["owner", "manager"]);
    if (site.servicePlan?.subscriptionStatus === "trial") {
      return Response.json({ ok: true, siteId: site.siteId, status: site.status, trialEndsAt: site.servicePlan.trialEndsAt }, { headers: { "Cache-Control": "no-store" } });
    }
    if (["active", "trialing"].includes(site.servicePlan?.subscriptionStatus)) {
      throw Object.assign(new Error("This website already has an active subscription."), { status: 409 });
    }
    if (site.servicePlan?.billingModel === "one_time" && site.servicePlan?.billingStatus === "paid") {
      await requirePlatformAdmin();
      if (payload.confirmMigration !== true) {
        throw Object.assign(new Error("A paid one-time website requires explicit migration confirmation."), { status: 409 });
      }
    }
    const servicePlan = createTrialServicePlan();
    const updated = await patchClientSite(site.siteId, { servicePlan, status: "trial" });
    return Response.json({ ok: true, siteId: updated.siteId, status: updated.status, trialEndsAt: servicePlan.trialEndsAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
