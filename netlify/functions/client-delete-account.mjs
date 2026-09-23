import { assertSameOrigin, errorResponse, requireClientUser, requireSiteAccess } from "../lib/client-auth.mjs";
import { normalizeEmail, sitesForEmail } from "../lib/client-store.mjs";
import { deleteIdentityUser, purgeClientSite, removeUserFromSite } from "../lib/client-lifecycle.mjs";

export default async(req)=>{
  try{
    if(req.method!=="POST")return Response.json({ok:false,message:"Method not allowed."},{status:405});
    assertSameOrigin(req);
    const payload=await req.json();
    const action=String(payload.action||"");
    const confirmation=String(payload.confirmation||"").trim();

    if(action==="delete_site"){
      if(confirmation!=="DELETE PAGE")throw Object.assign(new Error('Type "DELETE PAGE" to confirm.'),{status:400});
      const {site,membership}=await requireSiteAccess(payload.siteId,["owner"]);
      if(!["owner","admin"].includes(membership.role||""))throw Object.assign(new Error("Only the owner can delete this page."),{status:403});
      const result=await purgeClientSite(site.siteId,{cancelSubscription:true});
      return Response.json({ok:true,...result},{headers:{"Cache-Control":"no-store"}});
    }

    if(action==="delete_account"){
      if(confirmation!=="DELETE ACCOUNT")throw Object.assign(new Error('Type "DELETE ACCOUNT" to confirm.'),{status:400});
      const user=await requireClientUser();
      const email=normalizeEmail(user.email);
      const sites=await sitesForEmail(email);
      const deletedSites=[];
      const leftSites=[];

      for(const site of sites){
        const membership=(site.members||[]).find((member)=>normalizeEmail(member.email)===email);
        if((membership?.role||"")==="owner"){
          const result=await purgeClientSite(site.siteId,{cancelSubscription:true});
          if(result.deleted)deletedSites.push(site.siteId);
        }else{
          await removeUserFromSite(site,email);
          leftSites.push(site.siteId);
        }
      }

      await deleteIdentityUser(user);
      return Response.json({ok:true,accountDeleted:true,deletedSites,leftSites},{headers:{"Cache-Control":"no-store"}});
    }

    throw Object.assign(new Error("Unsupported deletion action."),{status:400});
  }catch(error){return errorResponse(error);}
};
