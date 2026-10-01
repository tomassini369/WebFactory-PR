import { errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";

export default async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const { site } = await requireSiteCapability(new URL(req.url).searchParams.get("siteId"), "payments");
    const accountId = String(site.paymentRules?.stripeConnectedAccountId || "").trim();
    const secret = globalThis.Netlify?.env?.get("STRIPE_SECRET_KEY") || "";
    const webhookConfigured = Boolean(globalThis.Netlify?.env?.get("STRIPE_CONNECT_WEBHOOK_SECRET"));
    const base = { ok: true, configured: Boolean(secret), webhookConfigured, connected: Boolean(accountId), accountId };
    if (!accountId) return Response.json({ ...base, capabilityStatus: "not_started" }, { headers: { "Cache-Control": "no-store" } });
    if (!secret) throw Object.assign(new Error("Stripe is not configured for this deployment."), { status: 503 });
    const params = new URLSearchParams();
    params.append("include[]", "configuration.merchant");
    const response = await fetch(`https://api.stripe.com/v2/core/accounts/${encodeURIComponent(accountId)}?${params}`, {
      headers: { Authorization: `Bearer ${secret}`, "Stripe-Version": "2026-08-26.preview" },
      signal: AbortSignal.timeout(15000),
    });
    const account = await response.json();
    if (!response.ok) throw Object.assign(new Error("Stripe account status could not be verified. Try again or contact support."), { status: 502 });
    return Response.json({ ...base, capabilityStatus: account.configuration?.merchant?.capabilities?.card_payments?.status || "pending" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
};
