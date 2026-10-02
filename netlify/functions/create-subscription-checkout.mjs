import crypto from "node:crypto";
import Stripe from "stripe";
import { assertSameOrigin, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { clientEventStore, getClientSite } from "../lib/client-store.mjs";
import { withBookingLock } from "../lib/booking-lock.mjs";
import { subscriptionConsent } from "../lib/subscription-consent.mjs";
import { publicBaseUrl } from "../lib/platform-utils.mjs";
import { subscriptionBillingReadiness } from "../lib/subscription-billing.mjs";
import { assertStripeWriteAllowed } from "../lib/stripe-runtime.mjs";

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

function integrationIdentifier() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.randomBytes(8);
  return `webfactory_saas_${[...bytes].map((value) => letters[value % letters.length]).join("")}`;
}

export default async (req) => {
  if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    assertSameOrigin(req);
    const payload = await req.json();
    if (!['monthly', 'annual'].includes(payload.interval)) {
      throw Object.assign(new Error("Subscription interval must be monthly or annual."), { status: 400 });
    }
    const interval = payload.interval;
    const { user, site, membership } = await requireSiteAccess(payload.siteId, ["owner"]);
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw Object.assign(new Error("Only the business owner can select a subscription."), { status: 403 });
    }
    const consent = subscriptionConsent(payload, user);
    const readiness = subscriptionBillingReadiness();
    if (!readiness.ready) throw Object.assign(new Error("WebFactory subscriptions are not enabled yet."), { status: 503 });
    if (site.servicePlan?.billingModel !== "subscription") {
      throw Object.assign(new Error("This website is not enrolled in the subscription model."), { status: 409 });
    }
    if (["active", "trialing"].includes(site.servicePlan?.subscriptionStatus)) {
      throw Object.assign(new Error("This website already has an active subscription."), { status: 409 });
    }

    assertStripeWriteAllowed({ requestUrl: req.url });
    const price = interval === "annual"
      ? env("STRIPE_PRICE_WEBFACTORY_ANNUAL")
      : env("STRIPE_PRICE_WEBFACTORY_MONTHLY");
    const stripe = new Stripe(env("STRIPE_SECRET_KEY"), { apiVersion: "2026-07-29.dahlia" });
    const base = publicBaseUrl();
    const configuredPrice = await stripe.prices.retrieve(price);
    if (configuredPrice.currency !== "usd" || configuredPrice.unit_amount !== consent.amountUsd * 100 ||
        configuredPrice.recurring?.interval !== (interval === "annual" ? "year" : "month") || configuredPrice.recurring?.interval_count !== 1) {
      throw Object.assign(new Error("Subscription pricing is temporarily unavailable."), { status: 503 });
    }
    const store = clientEventStore();
    const session = await withBookingLock(store, `locks/subscription-checkout/${site.siteId}`, async () => {
      const current = await getClientSite(site.siteId);
      if (["active", "trialing"].includes(current?.servicePlan?.subscriptionStatus)) {
        throw Object.assign(new Error("This website already has an active subscription."), { status: 409 });
      }
      const key = `${site.siteId}/billing-checkout.json`;
      const previous = await store.get(key, { type: "json" });
      if (previous?.sessionId) {
        const pending = await stripe.checkout.sessions.retrieve(previous.sessionId);
        if (pending.status === "complete") throw Object.assign(new Error("Payment confirmation is in progress. Refresh your plan shortly."), { status: 409 });
        if (pending.status === "open") {
          if (previous.interval === interval) return pending;
          await stripe.checkout.sessions.expire(pending.id);
        }
      }
      const acceptanceId = crypto.randomUUID();
      await store.setJSON(`${site.siteId}/billing-consents/${acceptanceId}.json`, { ...consent, siteId: site.siteId });
      const created = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: site.siteId,
      metadata: { webfactory_site_id: site.siteId, webfactory_interval: interval, webfactory_consent_id: acceptanceId, webfactory_consent_version: consent.version },
      subscription_data: { metadata: { webfactory_site_id: site.siteId, webfactory_interval: interval, webfactory_consent_id: acceptanceId, webfactory_consent_version: consent.version } },
      success_url: `${base}/client-admin?billing=success`,
      cancel_url: `${base}/client-admin?billing=cancelled`,
      integration_identifier: integrationIdentifier(),
    }, { idempotencyKey: `subscription-${site.siteId}-${acceptanceId}` });
      await store.setJSON(key, { sessionId: created.id, interval, acceptanceId });
      return created;
    });
    return Response.json({ ok: true, url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip"] } };
