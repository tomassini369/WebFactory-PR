const packagePriceEnv = {
  basica: "STRIPE_PRICE_INICIO",
  pagos: "STRIPE_PRICE_PROFESIONAL",
  app: "STRIPE_PRICE_PAGOS",
};

const packageLabels = {
  basica: "Inicio",
  pagos: "Profesional",
  app: "Pagos",
};

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

async function createStripeCheckoutSession({ event, orderData, packageId }) {
  const stripeSecretKey = clean(process.env.STRIPE_SECRET_KEY);
  const priceEnvName = packagePriceEnv[packageId];
  const priceId = clean(process.env[priceEnvName]);
  const baseUrl = resolveBaseUrl(event);

  if (!stripeSecretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY en las variables de entorno de Netlify.");
  }

  if (!priceId) {
    throw new Error(`Falta ${priceEnvName} en las variables de entorno de Netlify.`);
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
  params.set("cancel_url", `${baseUrl}/index.html#configurador`);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", orderId);
  params.set("metadata[order_id]", orderId);
  params.set("metadata[package_id]", packageId);
  params.set("metadata[package_label]", packageLabels[packageId] || packageId);
  params.set("metadata[business_name]", clean(business.name).slice(0, 450));
  params.set("metadata[client_email]", clientEmail.slice(0, 450));

  if (clientEmail) {
    params.set("customer_email", clientEmail);
  }

  const idempotencyKey = `webfactory-${orderId}-${packageId}-${priceId}`;
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
    const packageId = clean(payload.packageId);
    const orderData = payload.orderData || {};

    if (!packagePriceEnv[packageId]) {
      return jsonResponse(400, { ok: false, message: "Paquete no valido." });
    }

    const session = await createStripeCheckoutSession({ event, orderData, packageId });

    return jsonResponse(200, {
      ok: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      orderId: orderData.orderId,
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: error.message || "No se pudo preparar el pago.",
    });
  }
}
