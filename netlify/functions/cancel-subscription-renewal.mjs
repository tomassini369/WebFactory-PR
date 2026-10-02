import Stripe from "stripe";
import { assertSameOrigin, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { clientEventStore } from "../lib/client-store.mjs";
import { assertSubscriptionBelongsToSite } from "../lib/subscription-consent.mjs";
import { assertStripeWriteAllowed } from "../lib/stripe-runtime.mjs";

export default async req => {
  if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    assertSameOrigin(req);
    const payload = await req.json();
    const { user, site } = await requireSiteAccess(payload.siteId, ["owner"]);
    const id = site.servicePlan?.stripeSubscriptionId;
    if (site.servicePlan?.billingModel !== "subscription" || !id) {
      throw Object.assign(new Error("This business has no paid subscription to cancel."), { status: 409 });
    }
    assertStripeWriteAllowed({ requestUrl: req.url });
    const stripe = new Stripe(globalThis.Netlify?.env?.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2026-07-29.dahlia" });
    const subscription = await stripe.subscriptions.retrieve(id);
    assertSubscriptionBelongsToSite(subscription, site);
    if (!["active", "trialing", "past_due"].includes(subscription.status)) {
      throw Object.assign(new Error("This subscription cannot be scheduled for cancellation."), { status: 409 });
    }
    const updated = subscription.cancel_at_period_end ? subscription : await stripe.subscriptions.update(id,
      { cancel_at_period_end: true }, { idempotencyKey: `cancel-renewal-${id}` });
    // The signed Stripe webhook remains the source of truth for access and billing state.
    await clientEventStore().setJSON(`${site.siteId}/billing-cancellations/${id}.json`, {
      requestedBy: user.email, requestedAt: new Date().toISOString(), subscriptionId: id, cancelAtPeriodEnd: true,
    });
    const end = updated.items?.data?.[0]?.current_period_end || updated.current_period_end;
    return Response.json({ ok: true, cancelAtPeriodEnd: true, currentPeriodEnd: end ? new Date(end * 1000).toISOString() : "" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip"] } };
