import { subscriptionBillingReadiness } from "../lib/subscription-billing.mjs";
import { emailConfigured, emailProvider } from "../lib/email.mjs";

function env(name){return globalThis.Netlify?.env?.get(name)||"";}

export default async(req)=>{
  if(req.method!=="GET")return Response.json({ok:false,message:"Method not allowed."},{status:405});
  const subscription=subscriptionBillingReadiness();
  const commerce={
    stripeApi:Boolean(env("STRIPE_SECRET_KEY")),
    connectedAccountWebhook:Boolean(env("STRIPE_CONNECT_WEBHOOK_SECRET")),
    transactionalEmail:emailConfigured(),
  };
  const integrations={
    googleCalendar:Boolean(env("GOOGLE_OAUTH_CLIENT_ID")&&env("GOOGLE_OAUTH_CLIENT_SECRET")&&env("WEBFACTORY_TOKEN_ENCRYPTION_KEY")),
  };
  const checks={
    subscriptionBilling:subscription.ready,
    clientCommerce:commerce.stripeApi&&commerce.connectedAccountWebhook&&commerce.transactionalEmail,
    googleCalendar:integrations.googleCalendar,
  };
  return Response.json({
    ok:true,
    readyForV3Web:Object.values(checks).every(Boolean),
    checks,
    subscription:{
      enabled:subscription.enabled,
      monthlyPriceConfigured:subscription.monthlyPriceConfigured,
      annualPriceConfigured:subscription.annualPriceConfigured,
      webhookConfigured:subscription.webhookConfigured,
    },
    commerce,
    integrations,
    email:{configured:emailConfigured(),provider:emailProvider()},
    nativeIos:{deferred:true,releaseBlocker:false},
  },{headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}});
};
