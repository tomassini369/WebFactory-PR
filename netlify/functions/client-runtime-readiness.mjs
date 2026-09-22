function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

export default async (req) => {
  if (req.method !== "GET") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  const checks = {
    stripeApi: Boolean(env("STRIPE_SECRET_KEY")),
    connectedAccountWebhook: Boolean(env("STRIPE_CONNECT_WEBHOOK_SECRET")),
    transactionalEmail: Boolean((env("MAILJET_API_KEY") && env("MAILJET_SECRET_KEY")) || (env("WEBFACTORY_GMAIL_USER") && env("WEBFACTORY_GMAIL_APP_PASSWORD"))),
    googleOAuth: Boolean(env("GOOGLE_OAUTH_CLIENT_ID") && env("GOOGLE_OAUTH_CLIENT_SECRET")),
    tokenEncryption: Boolean(env("WEBFACTORY_TOKEN_ENCRYPTION_KEY")),
  };
  return Response.json({
    ok: true,
    clientPaymentsReady: checks.stripeApi && checks.connectedAccountWebhook && checks.transactionalEmail,
    googleCalendarReady: checks.googleOAuth && checks.tokenEncryption,
    checks,
  }, { headers: { "Cache-Control": "no-store" } });
};
