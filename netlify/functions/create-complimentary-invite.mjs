import crypto from "node:crypto";
import { assertSameOrigin, errorResponse, requirePlatformAdmin } from "../lib/client-auth.mjs";
import { clientSiteStore, emailHash, normalizeEmail } from "../lib/client-store.mjs";
import { cleanText, validEmail } from "../lib/platform-utils.mjs";
import { sendEmail } from "../lib/email.mjs";
import { renderInvitationEmail } from "../lib/platform-email-template.mjs";

const hashToken=(token)=>crypto.createHash("sha256").update(String(token||"")).digest("hex");
const inviteKey=(token)=>`complimentary-invites/${hashToken(token)}.json`;

export default async(req)=>{
  try{
    if(req.method!=="POST") return Response.json({ok:false,message:"Method not allowed."},{status:405});
    assertSameOrigin(req);
    const administrator=await requirePlatformAdmin();
    const payload=await req.json();
    const email=normalizeEmail(payload.email);
    if(!validEmail(email)) throw Object.assign(new Error("A valid invitee email is required."),{status:400});

    const token=crypto.randomBytes(32).toString("base64url");
    const now=new Date();
    const expires=new Date(now.getTime()+30*24*60*60*1000);
    const record={
      id:`invite-${crypto.randomUUID()}`,
      email,
      emailHash:emailHash(email),
      status:"pending",
      createdAt:now.toISOString(),
      expiresAt:expires.toISOString(),
      grantedBy:administrator.email,
      redeemedAt:"",
      siteId:"",
    };
    await clientSiteStore().setJSON(inviteKey(token),record);

    const origin=new URL(req.url).origin;
    const builderUrl=`${origin}/builder?complimentary_invite=${encodeURIComponent(token)}`;
    await sendEmail({
      category:"team",
      to:email,
      ...renderInvitationEmail({kind:"complimentary",builderUrl,language:payload.language === "es" || payload.lang === "es" ? "es" : "en"}),
    });

    return Response.json({ok:true,status:"pending",email,invitationSent:true,expiresAt:record.expiresAt},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
};
