import { assertSameOrigin, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { cleanText } from "../lib/platform-utils.mjs";
import { disconnectAth, disconnectGoogle, disconnectStripe } from "../lib/client-lifecycle.mjs";
import { patchClientSite } from "../lib/client-store.mjs";

export default async(req)=>{
  try{
    if(req.method!=="POST")return Response.json({ok:false,message:"Method not allowed."},{status:405});
    assertSameOrigin(req);
    const payload=await req.json();
    const action=cleanText(payload.action,80);
    const {site,membership}=await requireSiteAccess(payload.siteId,["owner","manager"]);
    if(!["owner","manager","admin"].includes(membership.role||""))throw Object.assign(new Error("This role cannot manage integrations."),{status:403});

    let updated=site;
    if(action==="disconnect_google")updated=await disconnectGoogle(site);
    else if(action==="disconnect_stripe"){
      if((membership.role||"")==="manager")throw Object.assign(new Error("Only the owner can disconnect Stripe."),{status:403});
      updated=await disconnectStripe(site);
    }else if(action==="disconnect_ath")updated=await disconnectAth(site);
    else if(action==="configure_ath"){
      const publicPath=cleanText(payload.publicPath,120);
      if(!publicPath)throw Object.assign(new Error("Enter your ATH Móvil business path."),{status:400});
      updated=await patchClientSite(site.siteId,{paymentRules:{...site.paymentRules,methods:{...site.paymentRules?.methods,ath:true},ath:{...site.paymentRules?.ath,publicPath}}});
    }else if(action==="enable_stripe"){
      if((membership.role||"")==="manager")throw Object.assign(new Error("Only the owner can enable Stripe."),{status:403});
      if(!site.paymentRules?.stripeConnectedAccountId)throw Object.assign(new Error("Connect Stripe first."),{status:409});
      updated=await patchClientSite(site.siteId,{paymentRules:{...site.paymentRules,methods:{...site.paymentRules?.methods,stripe:true}}});
    }
    else throw Object.assign(new Error("Unsupported integration action."),{status:400});

    return Response.json({ok:true,site:updated},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
};
