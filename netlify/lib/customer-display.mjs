import crypto from 'node:crypto';
import {calculateTax} from './webfactory-v3-domain.mjs';
import {requirePosAdjustments} from './pos-permissions.mjs';
import {commerceKey} from './client-store.mjs';
export const displayFail=(message,status=400)=>Object.assign(new Error(message),{status});
export const displayKey=id=>`pos-displays/${id}.json`;
export const validDisplayId=id=>/^[a-f0-9]{32}$/.test(id||'');
export const hashDisplayToken=token=>crypto.createHash('sha256').update(token).digest('hex');
export const matchesDisplayToken=(token,hash)=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)&&typeof hash==='string'&&hash.length===64&&crypto.timingSafeEqual(Buffer.from(hashDisplayToken(token),'hex'),Buffer.from(hash,'hex'));
export const displayActor=user=>{const id=user?.id||user?.sub;if(!id)throw displayFail('Verified identity required.',403);return String(id)};
export async function mutateDisplay(store,id,change){
 for(let i=0;i<6;i++){
  const row=await store.getWithMetadata(displayKey(id),{type:'json'});
  if(row&&!row.etag)throw displayFail('Concurrency metadata unavailable.',503);
  const next=await change(row?.data||null);
  if(next===null)return row?.data;
  const result=await store.setJSON(displayKey(id),next,row?{onlyIfMatch:row.etag}:{onlyIfNew:true});
  if(result?.modified)return next;
 }
 throw displayFail('Display changed; retry synchronization.',409);
}
export function displayDraft(site,membership,input){
 if(!Array.isArray(input.items)||input.items.length>50)throw displayFail('Invalid display items.');
 requirePosAdjustments(membership,input);
 const ids=new Set(),items=input.items.map(line=>{
  if(!line||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>20||ids.has(line.id))throw displayFail('Invalid quantities.');
  ids.add(line.id);const item=(site.catalog||[]).find(x=>x.id===line.id&&x.active!==false);
  if(!item||!Number.isFinite(item.price)||item.price<0)throw displayFail('Item unavailable.',409);
  return {id:item.id,nameEn:String(item.nameEn||item.name||item.nameEs||item.id).slice(0,220),nameEs:String(item.nameEs||item.nameEn||item.name||item.id).slice(0,220),quantity:line.quantity,unitAmount:Math.round(item.price*100),taxable:item.taxable!==false,taxRateOverride:item.taxRateOverride??null};
 });
 const subtotal=items.reduce((s,x)=>s+x.quantity*x.unitAmount,0),discount=Math.min(subtotal,Number(input.discountCents||0)),tip=Number(input.tipCents||0),base=subtotal-discount;
 const tax=items.reduce((s,x)=>s+calculateTax({amountCents:subtotal?Math.round(base*x.quantity*x.unitAmount/subtotal):0,taxable:x.taxable,taxRateOverride:x.taxRateOverride,config:site.taxConfig||{}}).taxCents,0);
 const total=base+(site.taxConfig?.pricesIncludeTax?0:tax)+tip;
 if(![subtotal,discount,tip,tax,total].every(Number.isSafeInteger))throw displayFail('Invalid total.');
 return {items:items.map(({taxable,taxRateOverride,...item})=>item),subtotal,discount,tip,tax,total,taxIncluded:Boolean(site.taxConfig?.pricesIncludeTax)};
}
function displayCheckout(record, paid) {
 if(paid||record.source!=='pos_remote'||record.paymentStatus!=='pending'||record.status!=='payment_pending')return null;
 if(!record.checkoutExpiresAt||!Number.isFinite(Date.parse(record.checkoutExpiresAt))||Date.parse(record.checkoutExpiresAt)<=Date.now())return null;
 try{const url=new URL(record.checkoutUrl);if(url.protocol==='https:'&&url.hostname==='checkout.stripe.com'&&!url.port&&!url.username&&!url.password&&/^\/(?:c\/)?pay\//.test(url.pathname))return {url:url.href};}catch{}
 return null;
}
export async function displaySale(store,state){
 if(!state.attemptId)return null;
 const marker=await store.get(commerceKey(state.siteId,'pos-attempts',state.attemptId),{type:'json'});
 if(marker&&marker.siteId!==state.siteId)throw displayFail('Sale unavailable.',404);
 const id=marker?.transactionId||`txn_pos_${state.attemptId}`;
 const record=await store.get(commerceKey(state.siteId,'orders',id),{type:'json'})||await store.get(commerceKey(state.siteId,'transactions',id),{type:'json'});
 if(!record)return {payment:'pending'};
 if(record.siteId!==state.siteId||!['pos','pos_remote'].includes(record.source)||String(record.createdBy||'').toLowerCase()!==state.email)throw displayFail('Sale unavailable.',403);
 const paid=record.paymentStatus==='paid'||record.paymentStatus==='paid_in_person'&&record.status==='completed';
 const items=(record.items||[]).map(x=>({id:x.id,nameEn:String(x.name||x.id).slice(0,220),nameEs:String(x.name||x.id).slice(0,220),quantity:x.quantity,unitAmount:x.unitAmount}));
 const totals={items,subtotal:Number(record.subtotal||0),discount:Number(record.discounts||0),tip:Number(record.tip||0),tax:Number(record.tax||0),total:Number(record.amountTotal||0),taxIncluded:Boolean(record.pricesIncludeTax)};
 return {payment:paid?'paid':['expired','cancelled','payment_failed','failed'].includes(record.status)?'failed':'pending',totals,checkout:displayCheckout(record,paid),completedAt:record.v3ArtifactsCreatedAt||record.paidAt||record.createdAt,receipt:paid&&record.receiptId?{id:record.receiptId,createdAt:record.paidAt||record.createdAt}:null};
}
export async function publicDisplayView(store,state,site,now){
 let sale=await displaySale(store,state);
 const completedAt=Date.parse(sale?.completedAt||'');
 const completed=sale?.payment==='paid'&&Number.isFinite(completedAt)&&completedAt<=now&&now-completedAt>=3000;
 if(completed)sale={payment:'draft',totals:{items:[],subtotal:0,discount:0,tax:0,tip:0,total:0,taxIncluded:Boolean(site.taxConfig?.pricesIncludeTax)},receipt:null,checkout:null};
 const cashierConnected=now-state.updatedAt<=20000;
 // A saved payment stays verifiable while mobile browsers suspend the cashier.
 // Drafts still disappear after heartbeat loss; paid receipts have a short window.
 const receiptTime=Date.parse(sale?.receipt?.createdAt||'');
 const verifiedPayment=Boolean(sale?.checkout||sale?.payment==='paid'&&Number.isFinite(receiptTime)&&receiptTime<=now+5000&&now-receiptTime<5*60000);
 const stale=!cashierConnected&&!verifiedPayment&&!completed;
 return {business:{nameEn:site.business?.nameEn||site.business?.name||site.slug,nameEs:site.business?.nameEs||site.business?.nameEn||site.business?.name||site.slug,logoAssetKey:site.business?.logoAssetKey||'',siteId:site.siteId,accent:site.design?.secondary||''},serverNow:now,cashierConnected,updatedAt:state.updatedAt,stale,payment:stale?'disconnected':sale?.payment||'draft',totals:stale?null:sale?.totals||state.draft,receipt:stale?null:sale?.receipt||null,checkout:stale?null:sale?.checkout||null};
}
