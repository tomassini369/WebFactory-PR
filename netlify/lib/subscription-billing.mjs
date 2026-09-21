import { getClientSite, patchClientSite } from "./client-store.mjs";

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

export function subscriptionBillingEnabled() {
  return env("WEBFACTORY_SUBSCRIPTION_ENABLED").toLowerCase() === "true";
}

export function subscriptionBillingReadiness() {
  const enabled = subscriptionBillingEnabled();
  const stripeSecretConfigured = Boolean(env("STRIPE_SECRET_KEY"));
  const monthlyPriceConfigured = env("STRIPE_PRICE_WEBFACTORY_MONTHLY").startsWith("price_");
  const annualPriceConfigured = env("STRIPE_PRICE_WEBFACTORY_ANNUAL").startsWith("price_");
  const webhookConfigured = env("STRIPE_WEBHOOK_SECRET").startsWith("whsec_");
  const checks = {
    stripeSecretConfigured,
    monthlyPriceConfigured,
    annualPriceConfigured,
    webhookConfigured,
  };
  const missing = Object.entries(checks)
    .filter(([, configured]) => !configured)
    .map(([name]) => name);
  return {
    enabled,
    ...checks,
    priceConfigured: monthlyPriceConfigured && annualPriceConfigured,
    missing,
    ready: enabled && missing.length === 0,
  };
}

export function createTrialServicePlan(now = new Date()) {
  const started = new Date(now);
  const ends = new Date(started.getTime() + 48 * 60 * 60 * 1000);
  return {
    code: "webfactory-saas",
    name: "WebFactory SaaS Website",
    billingModel: "subscription",
    billingStatus: "trial",
    subscriptionStatus: "trial",
    migrationEligible: false,
    trialStartedAt: started.toISOString(),
    trialEndsAt: ends.toISOString(),
    currentPeriodEnd: "",
    cancelAtPeriodEnd: false,
    stripeCustomerId: "",
    stripeSubscriptionId: "",
  };
}

export function siteEntitlement(site, now = new Date()) {
  const plan = site?.servicePlan || {};
  if (!plan.billingModel || plan.billingModel === "one_time") {
    return { public: plan.billingStatus !== "unpaid", reason: "one_time" };
  }
  if (["active", "trialing"].includes(plan.subscriptionStatus)) {
    return { public: true, reason: "subscription" };
  }
  // Stripe can keep retrying a failed renewal while a subscription is past_due.
  // Keep the paid service available until Stripe makes the subscription unpaid,
  // paused, or canceled instead of inventing a separate WebFactory grace period.
  if (plan.subscriptionStatus === "past_due") {
    return { public: true, reason: "payment_retry" };
  }
  if (plan.subscriptionStatus === "trial") {
    const endsAt = Date.parse(plan.trialEndsAt || "");
    if (Number.isFinite(endsAt) && endsAt > new Date(now).getTime()) {
      return { public: true, reason: "trial", trialEndsAt: plan.trialEndsAt };
    }
    return { public: false, reason: "trial_expired", trialEndsAt: plan.trialEndsAt || "" };
  }
  return { public: false, reason: plan.subscriptionStatus || "subscription_required" };
}

export function isSubscriptionBillingEvent(event) {
  return SUBSCRIPTION_EVENTS.has(event?.type) || (
    event?.type === "checkout.session.completed" && event?.data?.object?.mode === "subscription"
  );
}

function metadataFor(event) {
  const object = event?.data?.object || {};
  if (event?.type === "checkout.session.completed") return object.metadata || {};
  if (String(event?.type || "").startsWith("customer.subscription.")) return object.metadata || {};
  return object.parent?.subscription_details?.metadata || object.subscription_details?.metadata || {};
}

function subscriptionIdFor(event) {
  const object = event?.data?.object || {};
  if (event?.type === "checkout.session.completed") return object.subscription || "";
  if (String(event?.type || "").startsWith("customer.subscription.")) return object.id || "";
  return object.parent?.subscription_details?.subscription || object.subscription || "";
}

export function billingStateFor(event, current = {}) {
  const object = event?.data?.object || {};
  let subscriptionStatus = current.subscriptionStatus || "not_started";
  let billingStatus = current.billingStatus || "unpaid";

  if (event.type === "checkout.session.completed") {
    const paid = object.payment_status === "paid" || object.payment_status === "no_payment_required";
    subscriptionStatus = paid ? "active" : "pending_activation";
    billingStatus = paid ? "paid" : "pending";
  } else if (event.type === "invoice.paid") {
    subscriptionStatus = "active";
    billingStatus = "paid";
  } else if (event.type === "invoice.payment_failed") {
    subscriptionStatus = "past_due";
    billingStatus = "past_due";
  } else {
    subscriptionStatus = event.type === "customer.subscription.deleted" ? "canceled" : (object.status || subscriptionStatus);
    billingStatus = ["active", "trialing"].includes(subscriptionStatus)
      ? "paid"
      : ["past_due", "unpaid", "paused"].includes(subscriptionStatus) ? subscriptionStatus : billingStatus;
  }

  return {
    ...current,
    code: current.code || "webfactory-premium-commerce",
    name: current.name || "WebFactory Premium Commerce Website",
    billingModel: "subscription",
    billingStatus,
    subscriptionStatus,
    stripeCustomerId: object.customer || current.stripeCustomerId || "",
    stripeSubscriptionId: subscriptionIdFor(event) || current.stripeSubscriptionId || "",
    currentPeriodEnd: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : (current.currentPeriodEnd || ""),
    cancelAtPeriodEnd: typeof object.cancel_at_period_end === "boolean"
      ? object.cancel_at_period_end
      : Boolean(current.cancelAtPeriodEnd),
    lastBillingEvent: event.type,
    lastBillingEventAt: new Date().toISOString(),
  };
}

export async function processSubscriptionBillingEvent(event) {
  if (!subscriptionBillingEnabled()) return { enabled: false, ignored: true };
  const siteId = String(metadataFor(event).webfactory_site_id || "").trim();
  if (!siteId) return { enabled: true, ignored: true, reason: "missing_site_id" };
  const site = await getClientSite(siteId);
  if (!site) throw new Error(`Subscription site ${siteId} was not found.`);
  const servicePlan = billingStateFor(event, site.servicePlan || {});
  const entitlement = siteEntitlement({ ...site, servicePlan });
  const updated = await patchClientSite(siteId, {
    servicePlan,
    status: entitlement.public ? "active" : "subscription_required",
  });
  return {
    enabled: true,
    ignored: false,
    siteId,
    billingStatus: updated.servicePlan.billingStatus,
    subscriptionStatus: updated.servicePlan.subscriptionStatus,
  };
}
