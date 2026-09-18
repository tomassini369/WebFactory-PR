import { patchOrder, publicBaseUrl } from "../lib/order-store.mjs";
import { authorizePaymentSetup } from "../lib/payment-setup.mjs";

const STRIPE_VERSION = "2026-08-26.preview";

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

async function stripeRequest(path, { method="GET", body, idempotencyKey } = {}) {
  const secretKey = env("STRIPE_SECRET_KEY");
  if (!secretKey) throw new Error("Stripe no está configurado.");
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": STRIPE_VERSION,
      ...(body ? {"Content-Type":"application/json"} : {}),
      ...(idempotencyKey ? {"Idempotency-Key":idempotencyKey} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message || "Stripe Connect no pudo completar la solicitud.");
  return result;
}

async function createConnectedAccount(order) {
  return stripeRequest("/v2/core/accounts", {
    method:"POST",
    idempotencyKey:`webfactory-connect-${order.orderId}`,
    body:{
      contact_email:order.client?.email,
      display_name:order.business?.name,
      dashboard:"full",
      identity:{
        business_details:{registered_name:order.business?.name},
        country:"us",
      },
      configuration:{
        merchant:{capabilities:{card_payments:{requested:true}}},
      },
      defaults:{
        currency:"usd",
        responsibilities:{fees_collector:"stripe",losses_collector:"stripe"},
        locales:["en-US"],
      },
      include:["configuration.merchant","identity","requirements"],
    },
  });
}

async function createAccountLink(accountId, returnUrl, refreshUrl, orderId) {
  return stripeRequest("/v2/core/account_links", {
    method:"POST",
    idempotencyKey:`webfactory-connect-link-${orderId}-${Date.now()}`,
    body:{
      account:accountId,
      use_case:{
        type:"account_onboarding",
        account_onboarding:{
          collection_options:{fields:"eventually_due"},
          configurations:["merchant"],
          return_url:returnUrl,
          refresh_url:refreshUrl,
        },
      },
    },
  });
}

export default async (req) => {
  if (req.method !== "POST") return Response.json({ ok:false,message:"Method not allowed." }, { status:405 });
  try {
    const payload = await req.json();
    let order = await authorizePaymentSetup(payload.orderId, payload.token);
    if (!order) return Response.json({ ok:false,message:"El enlace es inválido o expiró." }, { status:403 });
    if (!order.payments?.methods?.stripe) return Response.json({ ok:false,message:"Stripe no fue seleccionado para esta orden." }, { status:409 });

    let accountId = order.stripeConnectedAccountId;
    if (!accountId) {
      const account = await createConnectedAccount(order);
      accountId = account.id;
      order = await patchOrder(order.orderId, {
        stripeConnectedAccountId:accountId,
        stripeConnectOnboardingStatus:"pending",
        stripeConnectCapabilityStatus:account.configuration?.merchant?.capabilities?.card_payments?.status || "pending",
        stripeConnectedAccountCreatedAt:new Date().toISOString(),
      });
    }

    const baseUrl = publicBaseUrl();
    const query = `orderId=${encodeURIComponent(order.orderId)}&token=${encodeURIComponent(payload.token)}`;
    const accountLink = await createAccountLink(
      accountId,
      `${baseUrl}/payment-setup?${query}&stripe=returned`,
      `${baseUrl}/.netlify/functions/refresh-stripe-connect-onboarding?${query}`,
      order.orderId,
    );

    return Response.json({ ok:true,url:accountLink.url }, { headers:{"Cache-Control":"no-store"} });
  } catch (error) {
    return Response.json({ ok:false,message:error?.message || "No se pudo iniciar Stripe Connect." }, { status:500,headers:{"Cache-Control":"no-store"} });
  }
};
