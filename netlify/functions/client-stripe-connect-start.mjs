import { assertSameOrigin, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { patchClientSite, normalizeEmail } from "../lib/client-store.mjs";
import { publicBaseUrl } from "../lib/platform-utils.mjs";
import { assertStripeWriteAllowed } from "../lib/stripe-runtime.mjs";

const STRIPE_VERSION="2026-08-26.preview";
function env(name){return globalThis.Netlify?.env?.get(name)||"";}

async function stripeRequest(path,{method="GET",body,idempotencyKey}={}){
  const secretKey=env("STRIPE_SECRET_KEY");
  if(!secretKey)throw Object.assign(new Error("Stripe is not configured."),{status:503});
  const response=await fetch(`https://api.stripe.com${path}`,{
    method,
    headers:{
      Authorization:`Bearer ${secretKey}`,
      "Stripe-Version":STRIPE_VERSION,
      ...(body?{"Content-Type":"application/json"}:{}),
      ...(idempotencyKey?{"Idempotency-Key":idempotencyKey}:{}),
    },
    body:body?JSON.stringify(body):undefined,
  });
  const result=await response.json();
  if(!response.ok)throw Object.assign(new Error(result?.error?.message||"Stripe Connect could not complete the request."),{status:response.status});
  return result;
}

export default async(req)=>{
  try{
    if(req.method!=="POST")return Response.json({ok:false,message:"Method not allowed."},{status:405});
    assertSameOrigin(req);
    const payload=await req.json();
    const {user,site,membership}=await requireSiteAccess(payload.siteId,["owner"]);
    if(!["owner","admin"].includes(membership.role||""))throw Object.assign(new Error("Only the owner can connect Stripe."),{status:403});
    assertStripeWriteAllowed();

    let accountId=String(site.paymentRules?.stripeConnectedAccountId||"").trim();
    let updated=site;
    if(!accountId){
      const ownerEmail=normalizeEmail((site.members||[]).find((member)=>member.role==="owner")?.email||user.email);
      const account=await stripeRequest("/v2/core/accounts",{
        method:"POST",
        idempotencyKey:`webfactory-client-connect-${site.siteId}-r${Number(site.revision||0)}`,
        body:{
          contact_email:ownerEmail,
          display_name:site.business?.name||site.business?.nameEn||"WebFactory client",
          dashboard:"full",
          identity:{
            business_details:{registered_name:site.business?.name||site.business?.nameEn||"WebFactory client"},
            country:"us",
          },
          configuration:{merchant:{capabilities:{card_payments:{requested:true}}}},
          defaults:{
            currency:"usd",
            responsibilities:{fees_collector:"stripe",losses_collector:"stripe"},
            locales:["en-US"],
          },
          include:["configuration.merchant","identity","requirements"],
        },
      });
      accountId=account.id;
      updated=await patchClientSite(site.siteId,{
        paymentRules:{
          ...(site.paymentRules||{}),
          methods:{...(site.paymentRules?.methods||{}),stripe:true},
          stripeConnectedAccountId:accountId,
          stripeCapabilityStatus:account.configuration?.merchant?.capabilities?.card_payments?.status||"pending",
          stripeConnectedAccountCreatedAt:new Date().toISOString(),
        },
      });
    }

    const base=publicBaseUrl();
    const accountLink=await stripeRequest("/v2/core/account_links",{
      method:"POST",
      idempotencyKey:`webfactory-client-link-${site.siteId}-${Date.now()}`,
      body:{
        account:accountId,
        use_case:{
          type:"account_onboarding",
          account_onboarding:{
            collection_options:{fields:"eventually_due"},
            configurations:["merchant"],
            return_url:`${base}/client-admin?stripe=returned`,
            refresh_url:`${base}/client-admin?stripe=refresh`,
          },
        },
      },
    });

    return Response.json({ok:true,url:accountLink.url,site:updated},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
};
