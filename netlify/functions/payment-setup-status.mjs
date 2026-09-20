import {
  authorizePaymentSetup,
  publicPaymentConfiguration,
} from "../lib/payment-setup.mjs";
import { patchOrder } from "../lib/order-store.mjs";
import { ensureClientSiteForOrder, patchClientSite } from "../lib/client-store.mjs";

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

async function refreshStripeStatus(order) {
  if (!order.stripeConnectedAccountId) return order;
  const params = new URLSearchParams();
  params.append("include[]", "configuration.merchant");
  params.append("include[]", "requirements");
  const response = await fetch(
    `https://api.stripe.com/v2/core/accounts/${encodeURIComponent(order.stripeConnectedAccountId)}?${params}`,
    {headers:{Authorization:`Bearer ${env("STRIPE_SECRET_KEY")}`,"Stripe-Version":"2026-08-26.preview"}},
  );
  if (!response.ok) return order;
  const account = await response.json();
  const capabilityStatus = account.configuration?.merchant?.capabilities?.card_payments?.status || "pending";
  const onboardingStatus = capabilityStatus === "active" ? "complete" : "pending";
  let updated = order;
  if (capabilityStatus !== order.stripeConnectCapabilityStatus || onboardingStatus !== order.stripeConnectOnboardingStatus) {
    updated = await patchOrder(order.orderId, {
      stripeConnectCapabilityStatus:capabilityStatus,
      stripeConnectOnboardingStatus:onboardingStatus,
      stripeConnectStatusCheckedAt:new Date().toISOString(),
    });
  }
  const site = await ensureClientSiteForOrder(updated);
  if (site.paymentRules?.stripeConnectedAccountId !== updated.stripeConnectedAccountId || site.paymentRules?.stripeCapabilityStatus !== capabilityStatus) {
    await patchClientSite(site.siteId, {
      paymentRules: {
        ...(site.paymentRules || {}),
        stripeConnectedAccountId: updated.stripeConnectedAccountId,
        stripeCapabilityStatus: capabilityStatus,
      },
    });
  }
  return updated;
}

export default async (req) => {
  if (req.method !== "GET") return Response.json({ ok:false,message:"Method not allowed." }, { status:405 });
  const url = new URL(req.url);
  let order = await authorizePaymentSetup(url.searchParams.get("orderId"), url.searchParams.get("token"));
  if (!order) return Response.json({ ok:false,message:"El enlace es inválido o expiró." }, { status:403,headers:{"Cache-Control":"no-store"} });
  order = await refreshStripeStatus(order);
  return Response.json({ ok:true,setup:publicPaymentConfiguration(order) }, { headers:{"Cache-Control":"no-store"} });
};
