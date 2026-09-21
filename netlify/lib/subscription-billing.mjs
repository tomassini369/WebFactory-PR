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
  const priceConfigured = Boolean(env("STRIPE_PRICE_WEBFACTORY_MONTHLY"));
  const webhookConfigured = Boolean(env("STRIPE_WEBHOOK_SECRET"));
  return {
    enabled,
    priceConfigured,
    webhookConfigured,
    ready: enabled && priceConfigured && webhookConfigured,
  };
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
    subscriptionStatus = "pending_activation";
    billingStatus = object.payment_status === "paid" || object.payment_status === "no_payment_required" ? "paid" : "pending";
  } else if (event.type === "invoice.paid") {
    subscriptionStatus = current.subscriptionStatus === "not_started" ? "active" : current.subscriptionStatus;
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
    cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
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
  const updated = await patchClientSite(siteId, { servicePlan });
  return {
    enabled: true,
    ignored: false,
    siteId,
    billingStatus: updated.servicePlan.billingStatus,
    subscriptionStatus: updated.servicePlan.subscriptionStatus,
  };
}
