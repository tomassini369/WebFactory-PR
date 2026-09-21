import { errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { siteEntitlement, subscriptionBillingReadiness } from "../lib/subscription-billing.mjs";

export default async (req) => {
  if (req.method !== "GET") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    const siteId = new URL(req.url).searchParams.get("siteId") || "";
    const { site } = await requireSiteAccess(siteId, ["owner", "manager"]);
    return Response.json({
      ok: true,
      readiness: subscriptionBillingReadiness(),
      entitlement: siteEntitlement(site),
      servicePlan: site.servicePlan || {
        code: "webfactory-saas",
        name: "WebFactory Commerce Platform",
        billingModel: "one_time",
        billingStatus: "paid",
        subscriptionStatus: "not_started",
      },
    }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) {
    return errorResponse(error);
  }
};
