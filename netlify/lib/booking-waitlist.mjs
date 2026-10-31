import crypto from 'node:crypto';
import {clientCommerceStore,commerceKey} from './client-store.mjs';
import {availabilityForDate} from './booking-engine.mjs';
import {sendBusinessEmail} from './business-email.mjs';
import {escapeHtml} from './booking-calendar-export.mjs';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export const tokenHash=token=>crypto.createHash('sha256').update(token).digest('hex');
export const validWaitlistToken=token=>/^[A-Za-z0-9_-]{43}$/.test(token||'');
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function validateWaitlist(site,input,now=Date.now()){
 if(site.settings?.waitlistEnabled!==true)throw fail('Waitlist unavailable. / Lista de espera no disponible.',404);
 const service=site.catalog?.find(s=>s.id===input.serviceId&&s.active!==false&&s.requiresAppointment);
 const locations=(site.business?.locations||[]).filter(l=>l.active!==false);
 if(!service||locations.length&&!locations.some(l=>l.id===input.locationId))throw fail('Choose an active service and location.');
 const professionals=(site.employees||[]).filter(e=>e.active!==false&&e.serviceIds?.includes(service.id)&&(!locations.length||e.locationIds?.includes(input.locationId)));
 if(!professionals.length||input.employeeId&&!professionals.some(e=>e.id===input.employeeId))throw fail('Professional unavailable.');
 if(!validDate(input.from)||!validDate(input.until)||input.from>input.until||Date.parse(input.from)<now-86400000||Date.parse(input.until)>now+90*86400000||Date.parse(input.until)-Date.parse(input.from)>30*86400000)throw fail('Choose up to 30 preferred days within the next 90 days.');
 const name=String(input.name||'').trim(),email=String(input.email||'').trim().toLowerCase();
 if(!name||name.length>180||email.length>320||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||input.consent!==true||input.website)throw fail('Name, email and explicit waitlist consent are required.');
 return {serviceId:service.id,employeeId:input.employeeId||'',locationId:input.locationId||'',from:input.from,until:input.until,customer:{name,email},consentVersion:'waitlist-2026-10-26',consentedAt:new Date(now).toISOString(),language:input.lang==='es'?'es':'en'};
}
export async function joinWaitlist(site,input,{store=clientCommerceStore(),now=Date.now()}={}){
 const data=validateWaitlist(site,input,now),token=crypto.randomBytes(32).toString('base64url'),id=tokenHash(token);
 const throttle=commerceKey(site.siteId,'waitlist-email-limits',tokenHash(data.customer.email)),old=await store.getWithMetadata(throttle,{type:'json'});
 if(old?.data?.expiresAt>now)throw fail('A request was already submitted recently. / Ya se envió una solicitud recientemente.',429);
 const claim=await store.setJSON(throttle,{expiresAt:now+86400000},old?.etag?{onlyIfMatch:old.etag}:{onlyIfNew:true});
 if(!claim.modified)throw fail('Please try later.',429);
 const record={...data,siteId:site.siteId,id,status:'waiting',createdAt:new Date(now).toISOString(),expiresAt:new Date(Math.min(now+30*86400000,Date.parse(data.until)+2*86400000)).toISOString()};
 await store.setJSON(commerceKey(site.siteId,'waitlist',id),record,{onlyIfNew:true});
 return {token,expiresAt:record.expiresAt};
}
export async function maintainWaitlistEntry(siteId,key,{store=clientCommerceStore(),now=Date.now()}={}){
 const saved=await store.getWithMetadata(key,{type:'json'});const row=saved?.data;
 if(!row||row.siteId!==siteId||!saved.etag)return null;
 let next=row;
 if(Date.parse(row.expiresAt)<=now&&row.status!=='cancelled'&&(row.status!=='expired'||row.customer!==null))next={...row,status:'expired',customer:null,contactErasedAt:row.contactErasedAt||new Date(now).toISOString()};
 else if(row.status==='invited'&&row.deliveryStatus==='sent'&&Date.parse(row.invitationExpiresAt)<=now&&Number(row.invitationCount||1)<3){next={...row,invitationCount:Number(row.invitationCount||1),status:'waiting',previousInvitationHash:row.invitationHash};delete next.invitationHash;delete next.deliveryStatus;delete next.invitationExpiresAt;}
 if(next!==row&&!(await store.setJSON(key,next,{onlyIfMatch:saved.etag})).modified)return null;
 return next;
}
export async function readWaitlistPage(site,{store=clientCommerceStore(),after='',limit=50,now=Date.now()}={}){
 if(after&&!/^[a-f0-9]{64}$/.test(after)||!Number.isInteger(limit)||limit<1||limit>50)throw fail('Invalid page.');
 const prefix=site.siteId+'/waitlist/',keys=[];const pages=store.list({prefix,paginate:true});
 for await(const page of pages[Symbol.asyncIterator]?pages:[await pages])for(const blob of page.blobs||[]){const id=blob.key.slice(prefix.length).replace(/\.json$/,'');if(/^[a-f0-9]{64}$/.test(id)&&id>after)keys.push({id,key:blob.key});if(keys.length>100000)throw fail('Waitlist directory requires review.',503);}
 keys.sort((a,b)=>a.id.localeCompare(b.id));const selected=keys.slice(0,limit);
 const requests=(await Promise.all(selected.map(item=>maintainWaitlistEntry(site.siteId,item.key,{store,now})))).filter(Boolean);
 return {requests,nextCursor:keys.length>limit?selected.at(-1).id:null};
}
export async function* iterateWaitlistEntries(site,{store=clientCommerceStore(),now=Date.now()}={}){
 const pages=store.list({prefix:site.siteId+'/waitlist/',paginate:true});
 for await(const page of pages[Symbol.asyncIterator]?pages:[await pages])for(const blob of page.blobs||[]){
  const row=await maintainWaitlistEntry(site.siteId,blob.key,{store,now});if(row)yield row;
 }
}
export async function cancelWaitlist(siteId,id,{store=clientCommerceStore()}={}){
 if(!/^[a-f0-9]{64}$/.test(id))throw fail('Request unavailable.',404);
 const key=commerceKey(siteId,'waitlist',id),saved=await store.getWithMetadata(key,{type:'json'});
 if(!saved?.etag||saved.data.siteId!==siteId)throw fail('Request unavailable.',404);
 const next={...saved.data,status:'cancelled',customer:null,cancelledAt:new Date().toISOString()};
 if(!(await store.setJSON(key,next,{onlyIfMatch:saved.etag})).modified)throw fail('Request changed. Retry.',409);
 return next;
}
export async function offerWaitlist(site,booking,{store=clientCommerceStore(),available=availabilityForDate,send=sendBusinessEmail,now=Date.now(),baseUrl}={}){
 if(site.settings?.waitlistEnabled!==true||booking.status!=='cancelled'||Date.parse(booking.start)<=now)return {offered:0};
 const origin=baseUrl||globalThis.Netlify?.env?.get('DEPLOY_PRIME_URL')||globalThis.Netlify?.env?.get('URL');
 if(!origin||!/^https:\/\//.test(origin))return {offered:0};
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:site.settings?.timezone||'America/Puerto_Rico',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(booking.start));
 const started=Date.now();let offered=0;
 for await(const row of iterateWaitlistEntries(site,{store,now})){
  if(offered>=3||Date.now()-started>20000)break;
  if(row.status!=='waiting'||!row.customer?.email||Date.parse(row.expiresAt)<=now||row.from>date||row.until<date||row.locationId!==(booking.locationId||'')||row.employeeId&&row.employeeId!==booking.employeeId)continue;
  const slots=await available(site,row.serviceId,booking.employeeId,date,row.locationId);
  if(!slots.some(s=>s.start===booking.start))continue;
  const key=commerceKey(site.siteId,'waitlist',row.id),current=await store.getWithMetadata(key,{type:'json'});
  if(current?.data?.status!=='waiting'||!current.etag)continue;
  const token=crypto.randomBytes(32).toString('base64url'),hash=tokenHash(token),expiresAt=new Date(Math.min(now+24*3600000,Date.parse(row.expiresAt),Date.parse(booking.start))).toISOString();
  const invitation={siteId:site.siteId,requestId:row.id,expiresAt,serviceId:row.serviceId,employeeId:booking.employeeId,locationId:row.locationId,start:booking.start};
  await store.setJSON(commerceKey(site.siteId,'waitlist-invitations',hash),invitation,{onlyIfNew:true});
  const next={...current.data,invitationCount:Number(current.data.invitationCount||0)+1,status:'invited',invitationExpiresAt:expiresAt,deliveryStatus:'sending',invitationHash:hash};
  const claimed=await store.setJSON(key,next,{onlyIfMatch:current.etag});if(!claimed.modified)continue;
  const link=new URL('/.netlify/functions/booking-waitlist',origin);link.searchParams.set('siteId',site.siteId);link.searchParams.set('invitation',token);
  const es=row.language==='es',name=site.business?.name||'Business';
  const text=es?`${name}: Hay un horario disponible para tu solicitud. La invitación no confirma ni retiene una cita. Expira: ${expiresAt}. Consulta disponibilidad o cancela tu solicitud: ${link}`:`${name}: An opening matches your request. This invitation does not confirm or hold an appointment. Expires: ${expiresAt}. Check availability or cancel your request: ${link}`;
  let deliveryStatus='uncertain';
  try{const latest=await store.get(key,{type:'json'});if(latest?.status!=='invited')continue;await send(site,{to:row.customer.email,fromName:name,subject:es?'Disponibilidad para tu solicitud':'An opening for your request',text,html:`<p>${escapeHtml(text)}</p><p><a href="${escapeHtml(link.href)}">${es?'Ver invitación y cancelar solicitud':'View invitation and cancel request'}</a></p>`});deliveryStatus='sent'}catch{/* An uncertain send is never automatically repeated. */}
  const saved=await store.getWithMetadata(key,{type:'json'});if(saved?.data?.status==='invited'&&saved.data.invitationHash===hash)await store.setJSON(key,{...saved.data,deliveryStatus},{onlyIfMatch:saved.etag});
  offered++;
 }
 return {offered};
}
