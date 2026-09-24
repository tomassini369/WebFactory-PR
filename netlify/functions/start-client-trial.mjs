import { assertSameOrigin, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { patchClientSite } from "../lib/client-store.mjs";
import { createTrialServicePlan } from "../lib/subscription-billing.mjs";

export default async (req) => {
  if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    assertSameOrigin(req);
    const payload = await req.json();
    const { site } = await requireSiteAccess(payload.siteId, ["owner", "manager"]);
    if (site.servicePlan?.billingModel === "complimentary") {
      throw Object.assign(new Error("This website has complimentary access and does not require a trial or subscription."), { status: 409 });
    }
    if (site.servicePlan?.complimentaryRevokedAt || site.servicePlan?.subscriptionStatus === "subscription_required") {
      throw Object.assign(new Error("Complimentary access was revoked. Select a paid subscription to reactivate this website."), { status: 409 });
    }
    if (site.servicePlan?.subscriptionStatus === "trial") {
      return Response.json({ ok: true, siteId: site.siteId, status: site.status, trialEndsAt: site.servicePlan.trialEndsAt }, { headers: { "Cache-Control": "no-store" } });
    }
    if (["active", "trialing"].includes(site.servicePlan?.subscriptionStatus)) {
      throw Object.assign(new Error("This website already has an active subscription."), { status: 409 });
    }
    const servicePlan = createTrialServicePlan();
    const updated = await patchClientSite(site.siteId, { servicePlan, status: "trial" });
    return Response.json({ ok: true, siteId: updated.siteId, status: updated.status, trialEndsAt: servicePlan.trialEndsAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
