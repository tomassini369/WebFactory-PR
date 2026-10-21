import crypto from 'node:crypto';
import {admin,requestPasswordRecovery} from '@netlify/identity';
import {assertSameOrigin,errorResponse,requireSiteAccess} from '../lib/client-auth.mjs';
import {normalizeEmail,saveClientSite} from '../lib/client-store.mjs';
import {validEmail} from '../lib/platform-utils.mjs';
import {changeCommercialMember} from '../lib/commercial-members.mjs';
async function findIdentity(email) {
  for(let page=1;page<=50;page++) {
    const users=await admin.listUsers({page,perPage:100});
    const found=(users || []).find(user=>normalizeEmail(user.email)===email);
    if(found)return found;
    if(!Array.isArray(users)||users.length<100)break;
  }
  return null;
}
export function createMemberAccessHandler({authorize=requireSiteAccess,save=saveClientSite,findUser=findIdentity,createUser=input=>admin.createUser(input),sendInvite=requestPasswordRecovery}={}) { return async req=>{
  try {
    if(req.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
    assertSameOrigin(req);
    const raw=await req.text();if(Buffer.byteLength(raw)>12000)throw Object.assign(new Error('Request too large.'),{status:413});
    let input;try{input=JSON.parse(raw)}catch{throw Object.assign(new Error('Invalid JSON.'),{status:400})}
    if(!input||typeof input!=='object'||Array.isArray(input))throw Object.assign(new Error('Invalid access request.'),{status:400});
    const email=normalizeEmail(input.email);
    const actor=await authorize(input.siteId,['owner']);
    if(!validEmail(email))throw Object.assign(new Error('A valid email is required.'),{status:400});
    // Validate all grants before any Identity side effect. Identity metadata is
    // advisory; canonical site membership is revalidated on every API request.
    changeCommercialMember(actor.site,input,actor,{id:'pending-validation',email});
    let identity;
    if(!['revoke','undo_migration','resend_invite'].includes(input.action)) {
      identity=await findUser(email);
      if(!identity && input.action==='invite')identity=await createUser({email,password:crypto.randomBytes(48).toString('base64url'),data:{role:'client',app_metadata:{roles:['client']}}});
    }
    const updated=await save(changeCommercialMember(actor.site,input,actor,identity));
    let invitationSent=false;
    if(['invite','resend_invite'].includes(input.action)) {try{await sendInvite(email);invitationSent=true}catch{/* Saved access is visible; report delivery failure without pretending success. */}}
    return Response.json({ok:true,site:updated,invitationSent},{headers:{'Cache-Control':'private, no-store'}});
  } catch(error) {return errorResponse(error);}
};}
export default createMemberAccessHandler();
