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

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { ok: false, message: "Metodo no permitido." });
  }

  const stripeSecretKey = clean(process.env.STRIPE_SECRET_KEY);
  const sessionId = clean(event.queryStringParameters?.session_id);

  if (!stripeSecretKey) {
    return jsonResponse(500, {
      ok: false,
      message: "Falta STRIPE_SECRET_KEY en Netlify.",
    });
  }

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return jsonResponse(400, {
      ok: false,
      message: "Falta el identificador de pago de Stripe.",
    });
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
    },
  });

  const session = await response.json();

  if (!response.ok) {
    return jsonResponse(response.status, {
      ok: false,
      message: session?.error?.message || "No se pudo verificar el pago.",
    });
  }

  const paid = session.payment_status === "paid";

  return jsonResponse(200, {
    ok: true,
    paid,
    sessionId: session.id,
    paymentStatus: session.payment_status,
    checkoutStatus: session.status,
    orderId: session.client_reference_id || session.metadata?.order_id || "",
    packageId: session.metadata?.package_id || "",
    customerEmail: session.customer_details?.email || session.customer_email || "",
  });
}
