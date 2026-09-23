import { authorizePaymentSetup } from "../lib/payment-setup.mjs";
import { patchOrder } from "../lib/order-store.mjs";
import { ensureClientSiteForOrder, patchClientSite } from "../lib/client-store.mjs";

export default async (req) => {
  if (req.method !== "POST") return Response.json({ ok:false,message:"Method not allowed." }, { status:405 });
  try {
    const payload = await req.json();
    let order = await authorizePaymentSetup(payload.orderId, payload.token);
    if (!order) return Response.json({ ok:false,message:"The private setup link is invalid or expired." }, { status:403,headers:{"Cache-Control":"no-store"} });

    const accountId = order.stripeConnectedAccountId || "";
    const capability = order.stripeConnectCapabilityStatus || "pending";
    const onboarding = order.stripeConnectOnboardingStatus || "pending";
    if (!accountId) return Response.json({ ok:true,removed:false,message:"There is no Stripe onboarding account to remove." }, { headers:{"Cache-Control":"no-store"} });
    if (capability === "active" || onboarding === "complete") {
      return Response.json({ ok:false,message:"An active Stripe account cannot be reset from this setup flow. Disconnect it from the authenticated client portal instead." }, { status:409,headers:{"Cache-Control":"no-store"} });
    }

    order = await patchOrder(order.orderId, {
      stripeConnectedAccountId:"",
      stripeConnectOnboardingStatus:"not_started",
      stripeConnectCapabilityStatus:"not_started",
      stripeConnectedAccountCreatedAt:"",
      stripeConnectStatusCheckedAt:new Date().toISOString(),
      stripePreviousDisconnectedAccountId:accountId,
      stripeDisconnectedAt:new Date().toISOString(),
    });

    const site = await ensureClientSiteForOrder(order);
    await patchClientSite(site.siteId, {
      paymentRules: {
        ...(site.paymentRules || {}),
        stripeConnectedAccountId:"",
        stripeCapabilityStatus:"not_started",
      },
    });

    return Response.json({
      ok:true,
      removed:true,
      message:"The incomplete Stripe onboarding connection was removed from WebFactory. A new Stripe onboarding can now be started.",
    }, { headers:{"Cache-Control":"no-store"} });
  } catch (error) {
    return Response.json({ ok:false,message:error?.message || "The Stripe onboarding connection could not be removed." }, { status:500,headers:{"Cache-Control":"no-store"} });
  }
};
