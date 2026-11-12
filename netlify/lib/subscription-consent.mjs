import {isMembershipId,membershipConsentVersion,membershipPlans} from "../../shared/membership-plans.mjs";

export function subscriptionConsent(payload, user, now = new Date()) {
  const tier=payload.tier;
  if(!isMembershipId(tier))throw Object.assign(new Error("Invalid membership plan."),{status:400});
  const version=membershipConsentVersion;
  if (payload.renewalAccepted !== true || payload.consentVersion !== version) {
    throw Object.assign(new Error("Accept the recurring subscription terms before continuing."), { status: 400 });
  }
  if (!["monthly", "annual"].includes(payload.interval)) {
    throw Object.assign(new Error("Subscription interval must be monthly or annual."), { status: 400 });
  }
  return {
    version,
    tier,
    acceptedAt: now.toISOString(),
    acceptedBy: user.email,
    interval: payload.interval,
    amountUsd: membershipPlans[tier][payload.interval],
    disclosure: "Renews automatically at the selected USD price and interval until canceled. Cancel future renewals in Plan WebFactory; access continues through the paid period. Terms and refund policy apply.",
  };
}

export function assertSubscriptionBelongsToSite(subscription, site) {
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (subscription.id !== site.servicePlan?.stripeSubscriptionId ||
      subscription.metadata?.webfactory_site_id !== site.siteId ||
      customer !== site.servicePlan?.stripeCustomerId) {
    throw Object.assign(new Error("This subscription does not belong to this business."), { status: 403 });
  }
}
