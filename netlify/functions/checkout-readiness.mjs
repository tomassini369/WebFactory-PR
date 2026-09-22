function has(name) {
  return Boolean(globalThis.Netlify?.env?.get(name));
}

export default async () => {
  const checks = {
    legacyCheckoutEnabled: globalThis.Netlify?.env?.get("WEBFACTORY_LEGACY_CHECKOUT_ENABLED") === "true",
    stripeSecret: has("STRIPE_SECRET_KEY"),
    stripePrice: has("STRIPE_PRICE_WEBFACTORY_PREMIUM"),
    stripeWebhook: has("STRIPE_WEBHOOK_SECRET"),
    orderEmail: has("WEBFACTORY_ORDER_EMAIL"),
    mailjetApiKey: has("MAILJET_API_KEY"),
    mailjetSecretKey: has("MAILJET_SECRET_KEY"),
    gmailFallback: has("WEBFACTORY_GMAIL_USER") && has("WEBFACTORY_GMAIL_APP_PASSWORD"),
  };
  const ready = checks.legacyCheckoutEnabled && checks.stripeSecret && checks.stripePrice &&
    checks.stripeWebhook && checks.orderEmail &&
    ((checks.mailjetApiKey && checks.mailjetSecretKey) || checks.gmailFallback) &&
    globalThis.Netlify?.context?.deploy?.context === "production";

  return Response.json({
    ok:true,
    ready,
    legacyOnly:true,
    checks,
    environment: globalThis.Netlify?.context?.deploy?.context || "unknown",
  }, {
    headers: { "Cache-Control":"no-store" },
  });
};
