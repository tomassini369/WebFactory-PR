import { errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { cleanText } from "../lib/platform-utils.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

export default async (req) => {
  try {
    if (req.method !== "GET") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    const siteId = cleanText(new URL(req.url).searchParams.get("siteId"), 120);
    const { site } = await requireSiteCapability(siteId, "payments");
    const accountId = cleanText(site.paymentRules?.stripeConnectedAccountId, 180);
    if (!accountId) return Response.json({ ok: true, connected: false, payouts: [] }, { headers: { "Cache-Control": "no-store" } });

    const response = await fetch("https://api.stripe.com/v1/payouts?limit=20", {
      headers: {
        Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
        "Stripe-Account": accountId,
      },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error?.message || "Stripe payouts could not be loaded.");

    const payouts = (body.data || []).map((payout) => ({
      id: payout.id,
      amount: Number(payout.amount || 0),
      currency: String(payout.currency || "usd").toLowerCase(),
      status: cleanText(payout.status, 40),
      arrivalDate: payout.arrival_date ? new Date(Number(payout.arrival_date) * 1000).toISOString() : "",
      createdAt: payout.created ? new Date(Number(payout.created) * 1000).toISOString() : "",
      method: cleanText(payout.method, 40),
      type: cleanText(payout.type, 40),
    }));

    return Response.json({ ok: true, connected: true, payouts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
