function has(name) {
  return Boolean(globalThis.Netlify?.env?.get(name));
}

export default async () => {
  const checks = {
    stripeSecret: has("STRIPE_SECRET_KEY"),
    stripePrice: has("STRIPE_PRICE_WEBFACTORY_PREMIUM"),
    stripeWebhook: has("STRIPE_WEBHOOK_SECRET"),
    orderEmail: has("WEBFACTORY_ORDER_EMAIL"),
    gmailUser: has("WEBFACTORY_GMAIL_USER"),
    gmailAppPassword: has("WEBFACTORY_GMAIL_APP_PASSWORD"),
  };
  const ready = Object.values(checks).every(Boolean) &&
    globalThis.Netlify?.context?.deploy?.context === "production";

  return Response.json({
    ok:true,
    ready,
    checks,
    environment: globalThis.Netlify?.context?.deploy?.context || "unknown",
  }, {
    headers: { "Cache-Control":"no-store" },
  });
};
