const OFFICIAL_PRICE_ENV = "STRIPE_PRICE_WEBFACTORY_PREMIUM";
const PRODUCT_KEY = "webfactory-premium";
const PRODUCT_LABEL = "WebFactory Premium Commerce Website";
const OFFICIAL_PRICE_USD = "300";

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function clean(value) {
  return String(value || "").trim();
}

function resolveBaseUrl(event) {
  const configuredUrl = clean(process.env.URL || process.env.DEPLOY_PRIME_URL);
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const origin = clean(event.headers?.origin);
  if (origin) return origin.replace(/\/$/, "");

  const host = clean(event.headers?.host);
  return host ? `https://${host}` : "";
}

async function createStripeCheckoutSession({ event, orderData }) {
  const stripeSecretKey = clean(process.env.STRIPE_SECRET_KEY);
  const priceId = clean(process.env[OFFICIAL_PRICE_ENV]);
  const baseUrl = resolveBaseUrl(event);

  if (!stripeSecretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY en las variables de entorno de Netlify.");
  }

  if (!priceId) {
    throw new Error(`Falta ${OFFICIAL_PRICE_ENV} en las variables de entorno de Netlify.`);
  }

  if (!baseUrl) {
    throw new Error("No se pudo determinar la URL publicada del sitio.");
  }

  const client = orderData.client || {};
  const business = orderData.business || {};
  const orderId = clean(orderData.orderId);
  const clientEmail = clean(client.email);

  if (!orderId) {
    throw new Error("Falta el numero de orden.");
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${baseUrl}/#builder`);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", orderId);
  params.set("metadata[order_id]", orderId);
  params.set("metadata[product_key]", PRODUCT_KEY);
  params.set("metadata[package_id]", PRODUCT_KEY);
  params.set("metadata[package_label]", PRODUCT_LABEL);
  params.set("metadata[official_price_usd]", OFFICIAL_PRICE_USD);
  params.set("metadata[webfactory_version]", "v2");
  params.set("metadata[business_name]", clean(business.name).slice(0, 450));
  params.set("metadata[client_email]", clientEmail.slice(0, 450));

  if (clientEmail) {
    params.set("customer_email", clientEmail);
  }

  const idempotencyKey = `webfactory-${orderId}-${PRODUCT_KEY}-${priceId}`;
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
    body: params,
  });

  const session = await response.json();

  if (!response.ok) {
    throw new Error(session?.error?.message || "Stripe no pudo crear el checkout.");
  }

  return session;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, message: "Metodo no permitido." });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const orderData = payload.orderData || {};
    const session = await createStripeCheckoutSession({ event, orderData });

    return jsonResponse(200, {
      ok: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      orderId: orderData.orderId,
      productKey: PRODUCT_KEY,
      productName: PRODUCT_LABEL,
      officialPriceUsd: OFFICIAL_PRICE_USD,
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: error.message || "No se pudo preparar el pago.",
    });
  }
}
