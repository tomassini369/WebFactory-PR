import crypto from 'node:crypto';
import {localDay} from './business-accounting.mjs';
export const ERP_BRIDGE_PROTOCOL='webfactory.erp.v1';
const fail=(code,status=503)=>Object.assign(new Error(code),{code,status});
const envValue=name=>globalThis.Netlify?.env?.get(name)||'';
export function erpBinding(siteId,env=envValue){
 let bindings;try{bindings=JSON.parse(env('WEBFACTORY_ERP_BINDINGS_JSON')||'{}')}catch{throw fail('ERP_CONFIGURATION_INVALID')}
 const binding=Object.hasOwn(bindings,siteId)?bindings[siteId]:null;if(!binding)return null;
 const allowed=String(env('WEBFACTORY_ERP_ALLOWED_ORIGINS')).split(',').map(value=>value.trim()).filter(Boolean);
 let url;try{url=new URL(binding.origin)}catch{throw fail('ERP_CONFIGURATION_INVALID')}
 if(url.protocol!=='https:'||url.origin!==binding.origin||url.username||url.password||!allowed.includes(url.origin)||!binding.company||!binding.apiKey||!binding.apiSecret||/[\r\n:]/.test(binding.apiKey)||/[\r\n]/.test(binding.apiSecret))throw fail('ERP_CONFIGURATION_INVALID');
 return{...binding,siteId,origin:url.origin};
}
export function createErpConnector(binding,{fetcher=fetch}={}){
 if(!binding)throw fail('ERP_NOT_CONFIGURED',409);
 async function call(method,args={}){
  if(!['health','ingest_sale','receipt'].includes(method))throw fail('ERP_OPERATION_NOT_ALLOWED',403);
  let response;try{response=await fetcher(`${binding.origin}/api/method/webfactory_bridge.api.${method}`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Authorization:`token ${binding.apiKey}:${binding.apiSecret}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({...args,site_id:binding.siteId})})}catch{throw fail('ERP_UNREACHABLE')}
  if(!response.ok)throw fail(response.status===401||response.status===403?'ERP_AUTHORIZATION_FAILED':'ERP_REQUEST_FAILED',response.status===401||response.status===403?502:503);
  const raw=await response.text();if(raw.length>262144)throw fail('ERP_RESPONSE_TOO_LARGE');
  let message;try{message=JSON.parse(raw).message}catch{throw fail('ERP_RESPONSE_INVALID')}
  if(!message||message.siteId!==binding.siteId||message.company!==binding.company||message.protocol!==ERP_BRIDGE_PROTOCOL)throw fail('ERP_BINDING_MISMATCH',502);
  return message;
 }
 return{health:async()=>{const value=await call('health');return{protocol:value.protocol,siteId:value.siteId,company:value.company,draftJournal:value.draftJournal===true,hrmsInstalled:value.hrmsInstalled===true,payroll:value.payroll===true,scheduling:value.scheduling===true}},ingest:event=>call('ingest_sale',{event}),receipt:externalId=>call('receipt',{external_id:externalId})};
}
export const erpEventHash=event=>crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex');
export function settledSaleEvent(transaction,siteId,timeZone='America/Puerto_Rico'){
 if(transaction?.siteId!==siteId)throw fail('ERP_SOURCE_TENANT_MISMATCH',403);
 if(!['paid','paid_in_person','partially_refunded','refunded'].includes(transaction.paymentStatus))return null;
 if(['partially_refunded','refunded'].includes(transaction.paymentStatus)||Number(transaction.refundedAmount||0)>0)throw fail('ERP_SOURCE_REQUIRES_RECONCILIATION',409);
 if(!transaction.transactionId||!transaction.paidAt)return null;
 if(!Number.isFinite(Date.parse(transaction.paidAt)))throw fail('ERP_SOURCE_REQUIRES_RECONCILIATION',409);
 const total=transaction.amountTotal,tax=transaction.tax||0,tip=transaction.tip||0;
 if([total,tax,tip].some(value=>!Number.isSafeInteger(value)||value<0)||tax+tip>total||String(transaction.currency||'usd').toLowerCase()!=='usd')throw fail('ERP_SOURCE_REQUIRES_RECONCILIATION',409);
 return{version:1,siteId,externalId:`sale:${transaction.transactionId}`,kind:'sale.settled',transactionId:transaction.transactionId,paidAt:transaction.paidAt,postingDate:localDay(transaction.paidAt,timeZone),currency:'USD',totalCents:total,taxCents:tax,tipCents:tip,revenueCents:total-tax-tip};
}
