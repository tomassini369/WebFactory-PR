import { assertSameOrigin, errorResponse, requirePlatformAdmin } from "../lib/client-auth.mjs";
import { getClientSite, patchClientSite } from "../lib/client-store.mjs";
import { createTrialServicePlan } from "../lib/subscription-billing.mjs";

export default async (req) => {
  if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    assertSameOrigin(req);
    await requirePlatformAdmin();
    const payload = await req.json();
    const site = await getClientSite(payload.siteId);
    if (!site) throw Object.assign(new Error("Site not found."), { status: 404 });
    if (site.servicePlan?.billingModel === "one_time" && site.servicePlan?.billingStatus === "paid" && payload.confirmMigration !== true) {
      throw Object.assign(new Error("A paid one-time website requires explicit migration confirmation."), { status: 409 });
    }
    const servicePlan = createTrialServicePlan();
    const updated = await patchClientSite(site.siteId, { servicePlan, status: "trial" });
    return Response.json({ ok: true, siteId: updated.siteId, status: updated.status, trialEndsAt: servicePlan.trialEndsAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
