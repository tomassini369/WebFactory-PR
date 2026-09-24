import crypto from "node:crypto";
import { admin, requestPasswordRecovery } from "@netlify/identity";
import { assertSameOrigin, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { normalizeEmail, saveClientSite } from "../lib/client-store.mjs";
import { cleanText, validEmail } from "../lib/platform-utils.mjs";

async function findIdentityUserByEmail(email){
  const target=normalizeEmail(email);
  const perPage=100;
  for(let page=1;page<=50;page+=1){
    const users=await admin.listUsers({page,perPage});
    const found=(users||[]).find((candidate)=>normalizeEmail(candidate.email)===target);
    if(found)return found;
    if(!Array.isArray(users)||users.length<perPage)break;
  }
  return null;
}

export default async(req)=>{
  try{
    if(req.method!=="POST")return Response.json({ok:false,message:"Method not allowed."},{status:405});
    assertSameOrigin(req);
    const payload=await req.json();
    const {site,membership}=await requireSiteAccess(payload.siteId,["owner"]);
    if((membership.role||"owner")!=="owner"&&membership.role!=="admin")throw Object.assign(new Error("Only the owner can manage portal access."),{status:403});
    const action=cleanText(payload.action,80);

    if(action==="invite"){
      const email=normalizeEmail(payload.email);
      const role=["manager","employee","cashier","staff"].includes(payload.role)?payload.role:"employee";
      if(!validEmail(email))throw Object.assign(new Error("A valid email is required."),{status:400});
      const ownerEmail=normalizeEmail((site.members||[]).find((member)=>member.role==="owner")?.email);
      if(email===ownerEmail)throw Object.assign(new Error("The owner already has access."),{status:409});

      const members=[...(site.members||[]).filter((member)=>normalizeEmail(member.email)!==email),{email,role}];
      const updated=await saveClientSite({...site,members,revision:Number(site.revision||0)+1,updatedAt:new Date().toISOString()});

      let user=await findIdentityUserByEmail(email);
      if(!user){
        user=await admin.createUser({
          email,
          password:crypto.randomBytes(48).toString("base64url"),
          data:{
            role:"client",
            app_metadata:{roles:["client"],webfactory_site_ids:[site.siteId]},
            user_metadata:{business_name:site.business?.name||""},
          },
        });
      }else{
        const previousSites=Array.isArray(user.appMetadata?.webfactory_site_ids)?user.appMetadata.webfactory_site_ids:[];
        await admin.updateUser(user.id,{
          role:user.role==="admin"?"admin":"client",
          app_metadata:{
            ...(user.appMetadata||{}),
            roles:user.role==="admin"?["admin"]:["client"],
            webfactory_site_ids:[...new Set([...previousSites,site.siteId])],
          },
        });
      }

      await requestPasswordRecovery(email);
      return Response.json({ok:true,site:updated,invitationSent:true},{headers:{"Cache-Control":"no-store"}});
    }

    if(action==="revoke"){
      const email=normalizeEmail(payload.email);
      const ownerEmail=normalizeEmail((site.members||[]).find((member)=>member.role==="owner")?.email);
      if(!email||email===ownerEmail)throw Object.assign(new Error("Owner access cannot be revoked here."),{status:409});
      const members=(site.members||[]).filter((member)=>normalizeEmail(member.email)!==email);
      const updated=await saveClientSite({...site,members,revision:Number(site.revision||0)+1,updatedAt:new Date().toISOString()});

      const user=await findIdentityUserByEmail(email);
      if(user){
        const previousSites=Array.isArray(user.appMetadata?.webfactory_site_ids)?user.appMetadata.webfactory_site_ids:[];
        await admin.updateUser(user.id,{
          app_metadata:{
            ...(user.appMetadata||{}),
            webfactory_site_ids:previousSites.filter((id)=>id!==site.siteId),
          },
        });
      }
      return Response.json({ok:true,site:updated},{headers:{"Cache-Control":"no-store"}});
    }

    throw Object.assign(new Error("Unsupported member access action."),{status:400});
  }catch(error){return errorResponse(error);}
};
