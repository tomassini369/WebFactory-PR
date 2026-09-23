import { assertSameOrigin, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { cleanText } from "../lib/order-store.mjs";
import { disconnectAth, disconnectGoogle, disconnectStripe } from "../lib/client-lifecycle.mjs";

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
    else throw Object.assign(new Error("Unsupported integration action."),{status:400});

    return Response.json({ok:true,site:updated},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
};
