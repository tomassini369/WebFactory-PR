import crypto from 'node:crypto';
import { clientOAuthStore,clientCommerceStore,commerceKey } from './client-store.mjs';
import { assertAthProduction,searchAthPayment } from './ath-movil.mjs';
import { athError,decryptAthCredentials,matchAthPayment } from './ath-domain.mjs';
import { settleAthPayment } from './ath-settlement.mjs';

export async function recoverAthOrder(site,record,requestUrl){
  assertAthProduction(requestUrl);
  if(record?.siteId!==site.siteId||record.kind!=='order'||record.paymentProvider!=='ath_movil'||record.paymentStatus!=='paid'||!record.athFulfillmentNeedsReview||!record.athReferenceNumber||!record.athSessionHash)throw athError('Only verified ATH orders with incomplete processing can be recovered.',409);
  const session=await clientOAuthStore().get(`ath/sessions/${site.siteId}/${record.athSessionHash}.json`,{type:'json'});
  if(!session?.encrypted||session.siteId!==site.siteId||session.transactionId!==record.transactionId)throw athError('Original ATH verification credentials are unavailable. Reconcile in ATH Business.',409);
  const credentials=decryptAthCredentials(site.siteId,session.encrypted);
  const payments=await searchAthPayment(credentials,record.athReferenceNumber,session.metadata1,session.metadata2);
  const payment=matchAthPayment(payments,{...session,referenceNumber:record.athReferenceNumber},record);
  const claimKey=commerceKey(site.siteId,'ath-references',crypto.createHash('sha256').update(record.athReferenceNumber).digest('hex'));
  const claim=await clientCommerceStore().get(claimKey,{type:'json'});
  if(claim?.transactionId!==record.transactionId)throw athError('ATH reference requires reconciliation.',409);
  const recovered=await settleAthPayment(session,payment,{recover:true});
  await clientOAuthStore().setJSON(`ath/sessions/${site.siteId}/${record.athSessionHash}.json`,{...session,encrypted:null,completedAt:new Date().toISOString()});
  return recovered;
}
