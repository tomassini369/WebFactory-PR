import { createReviewProcessor,publicReviewHealth } from '../lib/review-processing.mjs';
import { unsubscribeUrl } from '../lib/marketing-preferences.mjs';
import { clientSiteStore,clientCommerceStore,clientEventStore,getClientSite } from '../lib/client-store.mjs';
import { sendEmail,emailConfigured } from '../lib/email.mjs';
export default async(_req,context)=>{
  if(context.deploy?.context!=='production'||!context.deploy?.published)return;
  const processor=createReviewProcessor({sites:clientSiteStore(),commerce:clientCommerceStore(),events:clientEventStore(),getSite:getClientSite,send:sendEmail,unsubscribe:unsubscribeUrl,configured:emailConfigured});
  try{console.log('review-processing',JSON.stringify(publicReviewHealth(await processor())));}
  catch(error){console.error('review-processing',error?.status===409?'busy':'failed');if(error?.status!==409)throw new Error('Review processing failed.');}
};
export const config={schedule:'*/10 * * * *'};
