import {renewPosSession} from '../lib/mfa-security.mjs';
import {customerDisplayStore} from '../lib/customer-display-store.mjs';
import crypto from 'node:crypto';
import { requireCashierPos, requireCustomerDisplay } from '../lib/pos-operations.mjs';
import {assertSameOrigin,requireSiteCapability,errorResponse,membershipHasCapability} from '../lib/client-auth.mjs';
import {getClientSite} from '../lib/client-store.mjs';
import {displayFail,displayExpired,displaySale,displayKey,validDisplayId,hashDisplayToken,matchesDisplayToken,displayActor,mutateDisplay,displayDraft,publicDisplayView} from '../lib/customer-display.mjs';
const cookieName='__Host-wf-customer-display';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const cookieValue=req=>(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
export function createCustomerDisplayHandler({authorize=requireSiteCapability,getStore,getSite=getClientSite,clock=Date.now,randomBytes=crypto.randomBytes,renewSession=renewPosSession}={}){return async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers:{Allow:'GET, POST'}});
  assertSameOrigin(req);const url=new URL(req.url),store=getStore?getStore():customerDisplayStore(req.url),now=clock();
  let input={};if(req.method==='POST'){const raw=await req.text();if(raw.length>16000)throw displayFail('Request too large.',413);input=JSON.parse(raw);if(!input||typeof input!=='object'||Array.isArray(input))throw displayFail('Invalid display request.');}
  const cookie=cookieValue(req),[deviceId,deviceToken]=cookie.split('.');
  if(req.method==='GET'||input.action==='pair'){
   const id=input.action==='pair'?input.id:deviceId;if(!validDisplayId(id))throw displayFail('Screen not paired / Pantalla sin vincular.',401);
   let state=await store.get(displayKey(id),{type:'json'});if(!state||state.revoked||displayExpired(state,now))throw displayFail('Pairing expired / Vinculación vencida.',401);
   await requireCustomerDisplay(state.siteId,store);
   let responseCookie;
   if(input.action==='pair'){
    if(!(deviceId===id&&matchesDisplayToken(deviceToken,state.deviceHash))){
     const token=randomBytes(32).toString('hex');
     state=await mutateDisplay(store,id,current=>{if(!current||current.revoked||displayExpired(current,now)||now>=current.pairExpiresAt||current.deviceHash||!matchesDisplayToken(input.token,current.pairHash))throw displayFail('Pairing link unavailable / Enlace de vinculación no disponible.',401);return {...current,pairHash:null,deviceHash:hashDisplayToken(token)};});
     responseCookie=`${cookieName}=${id}.${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=34560000`;
    }
   }else if(!matchesDisplayToken(deviceToken,state.deviceHash))throw displayFail('Screen not paired.',401);
   const site=await getSite(state.siteId);const member=site?.members?.find(x=>String(x.email).toLowerCase()===state.email);
   if(!site||!membershipHasCapability(member,'pos')||member.userId&&member.userId!==state.actor)throw displayFail('Cashier access revoked / Acceso del cajero revocado.',403);
   if(state.persistent!==true)state=await mutateDisplay(store,id,current=>{
    if(!current||current.revoked||displayExpired(current,now))throw displayFail('Screen unavailable.',401);
    return {...current,persistent:true,expiresAt:null};
   });
   const validToken=responseCookie?responseCookie.split('=')[1].split(';')[0].split('.')[1]:deviceToken;
   responseCookie=`${cookieName}=${id}.${validToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=34560000`;
   const body=await publicDisplayView(store,state,site,now);
   return Response.json({ok:true,...body},{headers:{...headers,...(responseCookie?{'Set-Cookie':responseCookie}:{})}});
  }
  const {site,user,membership}=await authorize(input.siteId,'pos');const actor=displayActor(user);
  if(input.action==='keepalive'){await requireCashierPos(site.siteId,store);await renewSession(user);return Response.json({ok:true},{headers});}
  if(input.action!=='revoke')await requireCustomerDisplay(site.siteId,store);
  if(input.action==='create'){
   const id=randomBytes(16).toString('hex'),token=randomBytes(32).toString('hex');
   if(!site.members?.some(x=>String(x.email).toLowerCase()===String(user.email).toLowerCase()))throw displayFail('A business membership is required to pair this screen.',403);
   await mutateDisplay(store,id,current=>{if(current)throw displayFail('Session collision.',409);return {id,siteId:site.siteId,actor,email:String(user.email).toLowerCase(),createdAt:now,persistent:true,expiresAt:null,pairExpiresAt:now+600000,pairHash:hashDisplayToken(token),deviceHash:null,sequence:0,updatedAt:now,draft:displayDraft(site,membership,{items:[],discountCents:0,tipCents:0}),attemptId:''};});
   return Response.json({ok:true,id,pairUrl:`${url.origin}/customer-display#pair=${id}.${token}`},{headers});
  }
  if(!validDisplayId(input.id))throw displayFail('Invalid display.');
  if(input.action==='resume'){
   const current=await store.get(displayKey(input.id),{type:'json'});
   if(!current||current.siteId!==site.siteId||current.actor!==actor||current.revoked||displayExpired(current,now)||!current.deviceHash)throw displayFail('Display unavailable.',403);
   const sale=await displaySale(store,current);
   const activeAttempt=sale?.payment==='pending'&&sale.totals?{id:current.attemptId,kind:sale.source==='pos_remote'?'card':'direct',transactionId:sale.transactionId,checkoutUrl:sale.checkout?.url||''}:null;
   return Response.json({ok:true,paired:true,sequence:current.sequence,activeAttempt},{headers});
  }
  const state=await mutateDisplay(store,input.id,current=>{
   if(!current||current.siteId!==site.siteId||current.actor!==actor)throw displayFail('Display unavailable.',403);
   if(input.action==='revoke')return {...current,revoked:true,pairHash:null,deviceHash:null,draft:null,attemptId:''};
   if(current.revoked||displayExpired(current,now))throw displayFail('Display expired.',409);
   if(input.action!=='sync'||!Number.isSafeInteger(input.sequence)||input.sequence<1)throw displayFail('Invalid synchronization.');
   if(input.sequence<=current.sequence)return null;
   if(input.attemptId&&!/^[a-zA-Z0-9_-]{8,120}$/.test(input.attemptId))throw displayFail('Invalid sale attempt.');
   return {...current,sequence:input.sequence,updatedAt:now,draft:displayDraft(site,membership,input),attemptId:input.attemptId||''};
  });
  return Response.json({ok:true,paired:Boolean(state.deviceHash),sequence:state.sequence},{headers});
 }catch(e){return errorResponse(e instanceof SyntaxError?displayFail('Invalid JSON.'):e)}
}}
export default createCustomerDisplayHandler();
export const config={rateLimit:{windowLimit:600,windowSize:60,aggregateBy:['ip']}};
