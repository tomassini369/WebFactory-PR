import { assertSameOrigin, errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { cleanText } from "../lib/platform-utils.mjs";
import { assertStripeWriteAllowed } from "../lib/stripe-runtime.mjs";

function env(name){return globalThis.Netlify?.env?.get(name)||"";}

export default async(req)=>{
  try{
    if(req.method!=="POST")return Response.json({ok:false,message:"Method not allowed."},{status:405});
    assertSameOrigin(req);
    const payload=await req.json();
    const {site}=await requireSiteCapability(payload.siteId,"pos");
    const accountId=cleanText(site.paymentRules?.stripeConnectedAccountId,180);
    if(!accountId||!site.paymentRules?.methods?.stripe)throw Object.assign(new Error("Stripe is not connected for this business."),{status:409});
    assertStripeWriteAllowed();
    const params=new URLSearchParams();
    if(payload.locationId)params.set("location",cleanText(payload.locationId,180));
    const response=await fetch("https://api.stripe.com/v1/terminal/connection_tokens",{method:"POST",headers:{Authorization:`Bearer ${env("STRIPE_SECRET_KEY")}`,"Stripe-Account":accountId,"Content-Type":"application/x-www-form-urlencoded"},body:params});
    const token=await response.json();
    if(!response.ok)throw new Error(token?.error?.message||"Terminal connection token could not be created.");
    return Response.json({ok:true,secret:token.secret},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
};
