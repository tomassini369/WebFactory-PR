import {assertSameOrigin,errorResponse} from '../lib/client-auth.mjs';
import {getClientSite,clientCommerceStore,commerceKey} from '../lib/client-store.mjs';
import {siteEntitlement} from '../lib/subscription-billing.mjs';
import {joinWaitlist,cancelWaitlist,tokenHash,validWaitlistToken} from '../lib/booking-waitlist.mjs';
import {escapeHtml} from '../lib/booking-calendar-export.mjs';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"};
const failure=(message,status=400)=>Object.assign(new Error(message),{status});
export function createWaitlistPublicHandler({getSite=getClientSite,getStore=clientCommerceStore,join=joinWaitlist,cancel=cancelWaitlist}={}){return async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers});
  const url=new URL(req.url);let input={};
  if(req.method==='POST'){
   assertSameOrigin(req);const raw=await req.text();if(Buffer.byteLength(raw)>4000)throw failure('Request too large.',413);
   try{input=req.headers.get('content-type')?.includes('application/json')?JSON.parse(raw):Object.fromEntries(new URLSearchParams(raw))}catch{throw failure('Invalid request.')}
  }
  const siteId=input.siteId||url.searchParams.get('siteId');if(!/^[a-zA-Z0-9_-]{1,120}$/.test(siteId||''))throw failure('Unavailable.',404);
  const site=await getSite(siteId);if(!site)throw failure('Unavailable.',404);
  const store=getStore(),token=input.token||url.searchParams.get('token'),invitation=input.invitation||url.searchParams.get('invitation');
  if(req.method==='POST'&&input.action==='join'){
   if(!siteEntitlement(site).public)throw failure('Unavailable.',404);
   return Response.json({ok:true,...await join(site,input,{store})},{headers});
  }
  const secret=invitation||token;if(!validWaitlistToken(secret))throw failure('Request unavailable.',404);
  const offer=invitation?await store.get(commerceKey(siteId,'waitlist-invitations',tokenHash(secret)),{type:'json'}):null;
  const id=invitation?offer?.siteId===siteId&&offer.requestId:tokenHash(secret);
  if(!id)throw failure('Invitation unavailable.',404);
  const row=await store.get(commerceKey(siteId,'waitlist',id),{type:'json'});if(!row||row.siteId!==siteId)throw failure('Request unavailable.',404);
  if(req.method==='POST'){
   if(input.action!=='cancel')throw failure('Invalid action.');
   await cancel(siteId,id,{store});return new Response('Solicitud cancelada / Request cancelled',{headers});
  }
  const es=row.language==='es',e=escapeHtml,active=row.status!=='cancelled'&&Date.parse(row.expiresAt)>Date.now()&&(!offer||Date.parse(offer.expiresAt)>Date.now())&&siteEntitlement(site).public;
  const link='/sites/'+encodeURIComponent(site.slug);
  const html=`<!doctype html><html lang="${es?'es':'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${es?'Lista de espera':'Waitlist'}</title><style>body{font:16px system-ui;background:#f6f9fe;color:#17263b;margin:0}main{max-width:560px;margin:24px auto;padding:24px;overflow-wrap:anywhere}button,a{display:inline-block;padding:14px;font:inherit;margin:8px 0;background:#285fa6;color:white;border:0;border-radius:10px}p{line-height:1.6}@media(prefers-color-scheme:dark){body{background:#0d1522;color:#f2f6fc}}</style><main><h1>${e(site.business?.name||'')}</h1><h2>${es?'Lista de espera':'Waitlist'}</h2><p>${active?(es?'Tu solicitud está activa. Esta invitación no confirma ni retiene una cita. Consulta los horarios actuales antes de reservar.':'Your request is active. This invitation does not confirm or hold an appointment. Check current availability before booking.'):(es?'Solicitud cancelada o expirada.':'Request cancelled or expired.')}</p>${active?`<a href="${e(link)}">${es?'Consultar horarios y reservar':'Check availability and book'}</a>`:''}${row.status!=='cancelled'?`<form method="post"><input type="hidden" name="siteId" value="${e(siteId)}"><input type="hidden" name="${invitation?'invitation':'token'}" value="${e(secret)}"><input type="hidden" name="action" value="cancel"><button>${es?'Cancelar solicitud y avisos':'Cancel request and notifications'}</button></form>`:''}</main></html>`;
  return new Response(html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
 }catch(error){const response=errorResponse(error);for(const [key,value] of Object.entries(headers))response.headers.set(key,value);return response;}
};}
export default createWaitlistPublicHandler();
export const config={rateLimit:{action:'rate_limit',aggregateBy:['domain','ip'],windowLimit:8,windowSize:60}};
