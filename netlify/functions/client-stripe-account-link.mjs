import { assertSameOrigin, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { publicBaseUrl } from "../lib/platform-utils.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

export default async (req) => {
  if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    assertSameOrigin(req);
    const { siteId } = await req.json();
    const { site } = await requireSiteAccess(siteId, ["owner", "manager"]);
    const accountId = site.paymentRules?.stripeConnectedAccountId;
    if (!accountId) throw Object.assign(new Error("Stripe has not been connected for this business."), { status: 409 });
    const response = await fetch("https://api.stripe.com/v2/core/account_links", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`, "Stripe-Version": "2026-08-26.preview", "Content-Type": "application/json", "Idempotency-Key": `client-portal-link-${site.siteId}-${Date.now()}` },
      body: JSON.stringify({
        account: accountId,
        use_case: { type: "account_onboarding", account_onboarding: {
          collection_options: { fields: "eventually_due" }, configurations: ["merchant"],
          return_url: `${publicBaseUrl()}/client-admin?stripe=returned`,
          refresh_url: `${publicBaseUrl()}/client-admin?stripe=refresh`,
        } },
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.error?.message || "Stripe could not open account management.");
    return Response.json({ ok: true, url: result.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
};
