import {verifyMerchantCapability} from '../lib/stripe-merchant-capability.mjs';
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
    const capabilityStatus=await verifyMerchantCapability(accountId,{secretKey:secret});
    return Response.json({...base,capabilityStatus},{headers:{'Cache-Control':'no-store'}});
  } catch (error) { return errorResponse(error); }
};
