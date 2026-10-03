import crypto from 'node:crypto';
import {renderTextEmail} from './email-design.mjs';
import { withBookingLock } from './booking-lock.mjs';
import { reviewEmailEligible } from './marketing-preferences.mjs';
export const REVIEW_HEALTH_KEY='maintenance/review-processing.json';
const fail=(message,status=503)=>Object.assign(new Error(message),{status});
const rotate=(keys,cursor)=>{const sorted=[...new Set(keys)].sort();return [...sorted.filter(key=>key>cursor),...sorted.filter(key=>key<=cursor)];};
async function keys(store,prefix,clock,deadline,max=50000){const result=[];for await(const page of store.list({prefix,paginate:true})){if(clock()>deadline)throw fail('Review listing time limit reached.');for(const row of page.blobs||[]){result.push(row.key);if(result.length>max)throw fail('Review pointer list exceeds the batch scanning limit.');}}return result;}
export function renderReviewEmail(site,request,url){
  const es=site.settings?.locale==='es',name=(es?(site.business?.nameEs||site.business?.name||site.business?.nameEn):(site.business?.nameEn||site.business?.name||site.business?.nameEs))||(es?'el negocio':'the business');
  const greeting=es?`Hola ${request.customer.name||'cliente'},`:`Hello ${request.customer.name||'there'},`;
  const mail={category:'team',fromName:name,to:request.customer.email,subject:es?`¿Cómo fue tu experiencia con ${name}?`:`How was your experience with ${name}?`,text:[greeting,'',es?`Gracias por elegir ${name}.`:`Thank you for choosing ${name}.`,es?'Si tienes un momento, agradeceríamos mucho tu reseña:':'If you have a moment, we would appreciate your review:',request.reviewUrl,'',site.reviewSettings.postalAddress,`${es?'Cancelar emails de reseñas':'Unsubscribe from review emails'}: ${url}`].join('\n'),headers:{'List-Unsubscribe':`<${url}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click','Message-ID':`<review-${crypto.createHash('sha256').update(`${site.siteId}:${request.reviewRequestId}`).digest('hex')}@webfactorypr.com>`},timeoutMs:6000};
  return {...mail,...renderTextEmail({site,language:es?'es':'en',subject:mail.subject,text:mail.text,actions:[{url:request.reviewUrl,label:es?'Escribir una reseña':'Write a review'},{url,label:es?'Cancelar emails de reseñas':'Unsubscribe from review emails',primary:false}]})};
}
export function createReviewProcessor({sites,commerce,events,getSite,send,unsubscribe,configured=()=>true,clock=Date.now}){
  return async({budgetMs=18000,maxSites=10,maxRequests=20,perSite=5}={})=>withBookingLock(events,'locks/review-processing-batch',async()=>{
    const started=clock(),deadline=started+budgetMs,previous=await events.get(REVIEW_HEALTH_KEY,{type:'json'})||{};
    const summary={lastRunAt:new Date(started).toISOString(),sitesVisited:0,requestsVisited:0,attempted:0,sent:0,uncertain:0,suppressed:0,deferred:0,errors:0,paused:false,providerConfigured:configured(),siteCursor:typeof previous.siteCursor==='string'?previous.siteCursor:''};
    async function saveSummary(){await events.setJSON(REVIEW_HEALTH_KEY,{...summary,durationMs:clock()-started});}
    if(!summary.providerConfigured){await saveSummary();return summary;}
    const siteKeys=(await keys(sites,'sites/',clock,deadline)).filter(key=>/^sites\/[a-zA-Z0-9_-]{1,120}\.json$/.test(key));
    summary.listedSites=siteKeys.length;
    for(const pointer of rotate(siteKeys,summary.siteCursor)){
      if(summary.sitesVisited>=maxSites||summary.requestsVisited>=maxRequests||clock()+8000>=deadline){summary.paused=true;break;}
      const siteId=pointer.slice(6,-5);summary.sitesVisited++;summary.siteCursor=pointer;
      const cursorKey=`${siteId}/review-processing.json`;
      try{
        const site=await getSite(siteId);
        if(!site?.reviewSettings?.enabled){await saveSummary();continue;}
        const state=await events.get(cursorKey,{type:'json'});
        const requestKeys=await keys(commerce,`${siteId}/v3/review-requests/`,clock,deadline);
        let visited=0;
        for(const key of rotate(requestKeys,typeof state?.requestCursor==='string'?state.requestCursor:'')){
          if(visited>=perSite||summary.requestsVisited>=maxRequests||clock()+8000>=deadline){summary.paused=true;break;}
          if(!new RegExp(`^${siteId}/v3/review-requests/[a-zA-Z0-9_.-]+\\.json$`).test(key))continue;
          visited++;summary.requestsVisited++;
          try{
            await withBookingLock(events,`locks/review-email/${siteId}/${key.split('/').pop()}`,async()=>{
              const record=await commerce.getWithMetadata(key,{type:'json'}),current=record?.data;
              if(record&&!record.etag)throw fail('Review concurrency metadata unavailable.');
              if(!current||current.siteId!==siteId||`${current.reviewRequestId}.json`!==key.split('/').pop())return;
              if(current.status==='sending'){
                const since=Date.parse(current.deliveryStartedAt||'');
                if(!Number.isFinite(since)||clock()-since>15*60000){const result=await commerce.setJSON(key,{...current,status:'delivery_uncertain',deliveryIssue:'interrupted_attempt',updatedAt:new Date(clock()).toISOString()},{onlyIfMatch:record.etag});if(result.modified)summary.uncertain++;}
                return;
              }
              if(current.status!=='pending')return;
              const due=Date.parse(current.dueAt||''),retry=Date.parse(current.nextAttemptAt||'');
              if(!Number.isFinite(due)){await commerce.setJSON(key,{...current,status:'invalid',deliveryIssue:'invalid_due_date',updatedAt:new Date(clock()).toISOString()},{onlyIfMatch:record.etag});summary.errors++;return;}
              if(due>clock()||Number.isFinite(retry)&&retry>clock()){summary.deferred++;return;}
              const latestSite=await getSite(siteId);
              if(!latestSite?.reviewSettings?.enabled)return;
              if(!current.customer?.email||!current.reviewUrl||!await reviewEmailEligible(latestSite,current,events)){
                const result=await commerce.setJSON(key,{...current,status:'suppressed',updatedAt:new Date(clock()).toISOString()},{onlyIfMatch:record.etag});if(result.modified)summary.suppressed++;return;
              }
              let url;
              try{url=await unsubscribe(siteId,current.customer.email);}
              catch{summary.errors++;await commerce.setJSON(key,{...current,nextAttemptAt:new Date(clock()+15*60000).toISOString(),deliveryIssue:'preparation_failed',updatedAt:new Date(clock()).toISOString()},{onlyIfMatch:record.etag});return;}
              // Re-read opt-out immediately before the durable sending claim.
              if(!await reviewEmailEligible(latestSite,current,events)){const result=await commerce.setJSON(key,{...current,status:'suppressed',updatedAt:new Date(clock()).toISOString()},{onlyIfMatch:record.etag});if(result.modified)summary.suppressed++;return;}
              if(clock()+8000>=deadline){summary.paused=true;return;}
              const sending={...current,status:'sending',deliveryStartedAt:new Date(clock()).toISOString(),attempts:Number(current.attempts||0)+1,updatedAt:new Date(clock()).toISOString()};
              const claimed=await commerce.setJSON(key,sending,{onlyIfMatch:record.etag});if(!claimed.modified)return;
              summary.attempted++;
              try{
                const result=await send(renderReviewEmail(latestSite,current,url));
                if(!result?.accepted?.some(email=>String(email).trim().toLowerCase()===current.customer.email.trim().toLowerCase()))throw fail('Delivery not acknowledged.');
                await commerce.setJSON(key,{...sending,status:'sent',sentAt:new Date(clock()).toISOString(),deliveryIssue:null,updatedAt:new Date(clock()).toISOString()});summary.sent++;
              }catch{
                // SMTP can accept a message before its response fails. Never auto-retry.
                await commerce.setJSON(key,{...sending,status:'delivery_uncertain',deliveryIssue:'provider_or_persistence_failure',updatedAt:new Date(clock()).toISOString()});summary.uncertain++;
              }
            });
          }catch(error){if(error?.status!==409)summary.errors++;}
          await events.setJSON(cursorKey,{requestCursor:key,updatedAt:new Date(clock()).toISOString()});
        }
      }catch{summary.errors++;}
      await saveSummary();
    }
    await saveSummary();return summary;
  });
}
export function publicReviewHealth(value){if(!value)return null;return Object.fromEntries(['lastRunAt','durationMs','listedSites','sitesVisited','requestsVisited','attempted','sent','uncertain','suppressed','deferred','errors','paused','providerConfigured'].filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));}
