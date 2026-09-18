import { getOrder } from "../lib/order-store.mjs";

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

export default async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok:false,message:"Method not allowed." }, { status:405 });
  }

  const url = new URL(req.url);
  const sessionId = String(url.searchParams.get("session_id") || "").trim();
  const stripeSecretKey = env("STRIPE_SECRET_KEY");

  if (!stripeSecretKey) {
    return Response.json({ ok:false,message:"Stripe is not configured." }, { status:500 });
  }
  if (!sessionId.startsWith("cs_")) {
    return Response.json({ ok:false,message:"Missing Stripe session ID." }, { status:400 });
  }

  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers:{ Authorization:`Bearer ${stripeSecretKey}` } },
  );
  const session = await response.json();

  if (!response.ok) {
    return Response.json(
      { ok:false,message:session?.error?.message || "Could not verify payment." },
      { status:response.status },
    );
  }

  const paid = session.payment_status === "paid";
  const orderId = session.client_reference_id || session.metadata?.order_id || "";
  const order = orderId ? await getOrder(orderId) : null;

  return Response.json({
    ok:true,
    paid,
    sessionId:session.id,
    paymentStatus:session.payment_status,
    checkoutStatus:session.status,
    orderId,
    productKey:session.metadata?.product_key || "",
    productName:session.metadata?.package_label || "",
    officialPriceUsd:session.metadata?.official_price_usd || "",
    customerEmail:session.customer_details?.email || session.customer_email || "",
    orderStatus:order?.status || (paid ? "PAID" : "PAYMENT_PROCESSING"),
    packageReady:Boolean(order?.package?.ready),
    adminEmailSent:Boolean(order?.productionPackageSent),
    customerConfirmationSent:Boolean(order?.customerConfirmationSent),
    inProduction:order?.status === "IN_PRODUCTION",
  }, { headers:{ "Cache-Control":"no-store" } });
};
