import { clientSiteStore, normalizeEmail } from "../lib/client-store.mjs";
import crypto from "node:crypto";
const hashToken=(token)=>crypto.createHash("sha256").update(String(token||"")).digest("hex");
export default async(req)=>{
  if(req.method!=="GET") return Response.json({ok:false,message:"Method not allowed."},{status:405});
  const token=new URL(req.url).searchParams.get("token")||"";
  if(token.length<20) return Response.json({ok:false,valid:false},{status:400});
  const record=await clientSiteStore().get(`complimentary-invites/${hashToken(token)}.json`,{type:"json"});
  const valid=Boolean(record&&record.status==="pending"&&new Date(record.expiresAt).getTime()>Date.now());
  return Response.json({ok:true,valid,email:valid?normalizeEmail(record.email):"",expiresAt:valid?record.expiresAt:""},{headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}});
};
