import { clientSiteStore, patchClientSite } from "../lib/client-store.mjs";
import { siteEntitlement } from "../lib/subscription-billing.mjs";

export function createTrialEnforcementHandler({ getStore = clientSiteStore, patchSite = patchClientSite, clock = Date.now } = {}) {
  return async () => {
    const store = getStore();
    const result = await store.list({ prefix: "sites/" });
    let expired = 0;
    for (const blob of result.blobs || []) {
      const site = await store.get(blob.key, { type: "json" });
      if (site?.servicePlan?.subscriptionStatus !== "trial") continue;
      const now = new Date(clock());
      if (siteEntitlement(site, now).public) continue;

      // If Stripe activates the site after this read, the revision guard prevents
      // us from replacing the new plan with an expired trial snapshot.
      try {
        await patchSite(site.siteId, {
          status: "subscription_required",
          servicePlan: {
            ...site.servicePlan,
            billingStatus: "trial_expired",
            subscriptionStatus: "trial_expired",
            trialExpiredAt: now.toISOString(),
          },
        }, { expectedRevision: Number(site.revision || 0) });
        expired += 1;
      } catch (error) {
        if (error?.status !== 409) throw error;
        // A newer revision won. Leave it intact and check again on the next run.
      }
    }
    return Response.json({ ok: true, expired });
  };
}

export default createTrialEnforcementHandler();
export const config = { schedule: "@hourly" };
