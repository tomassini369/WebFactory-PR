import { createReviewProcessor,publicReviewHealth } from '../lib/review-processing.mjs';
import { unsubscribeUrl } from '../lib/marketing-preferences.mjs';
import { clientSiteStore,clientCommerceStore,clientEventStore,getClientSite } from '../lib/client-store.mjs';
import { businessEmailConnected,sendBusinessEmail } from '../lib/business-email.mjs';
import { googleConfigured } from '../lib/google-calendar.mjs';
export default async(_req,context)=>{
  if(context.deploy?.context!=='production'||!context.deploy?.published)return;
  const processor=createReviewProcessor({sites:clientSiteStore(),commerce:clientCommerceStore(),events:clientEventStore(),getSite:getClientSite,send:sendBusinessEmail,unsubscribe:unsubscribeUrl,configured:googleConfigured,ready:businessEmailConnected});
  try{console.log('review-processing',JSON.stringify(publicReviewHealth(await processor())));}
  catch(error){console.error('review-processing',error?.status===409?'busy':'failed');if(error?.status!==409)throw new Error('Review processing failed.');}
};
export const config={schedule:'*/10 * * * *'};
