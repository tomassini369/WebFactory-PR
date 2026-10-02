export const SUBSCRIPTION_CONSENT_VERSION = "2026-10-02";

export function subscriptionConsent(payload, user, now = new Date()) {
  if (payload.renewalAccepted !== true || payload.consentVersion !== SUBSCRIPTION_CONSENT_VERSION) {
    throw Object.assign(new Error("Accept the recurring subscription terms before continuing."), { status: 400 });
  }
  if (!["monthly", "annual"].includes(payload.interval)) {
    throw Object.assign(new Error("Subscription interval must be monthly or annual."), { status: 400 });
  }
  return {
    version: SUBSCRIPTION_CONSENT_VERSION,
    acceptedAt: now.toISOString(),
    acceptedBy: user.email,
    interval: payload.interval,
    amountUsd: payload.interval === "annual" ? 350 : 30,
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
