import { clientSiteStore, patchClientSite } from "../lib/client-store.mjs";
import { siteEntitlement } from "../lib/subscription-billing.mjs";

export default async () => {
  const result = await clientSiteStore().list({ prefix: "sites/" });
  let expired = 0;
  for (const blob of result.blobs || []) {
    const site = await clientSiteStore().get(blob.key, { type: "json" });
    if (site?.servicePlan?.subscriptionStatus !== "trial") continue;
    const entitlement = siteEntitlement(site);
    if (entitlement.public) continue;
    await patchClientSite(site.siteId, {
      status: "subscription_required",
      servicePlan: {
        ...site.servicePlan,
        billingStatus: "trial_expired",
        subscriptionStatus: "trial_expired",
        trialExpiredAt: new Date().toISOString(),
      },
    });
    expired += 1;
  }
  return Response.json({ ok: true, expired });
};

export const config = { schedule: "@hourly" };
