import {performance} from 'node:perf_hooks';
import {renderTenantHtml,buildTenantSitemap} from '../netlify/lib/tenant-seo.mjs';
const count=Number(process.argv[2]||1000);if(!Number.isInteger(count)||count<1||count>5000)throw Error('Use 1..5000 synthetic tenants');
const sites=Array.from({length:count},(_,i)=>({siteId:`synthetic-${i}`,slug:`synthetic-${i}`,status:'active',business:{name:`Synthetic ${i}`,description:'Synthetic benchmark'},servicePlan:{billingModel:'complimentary'}}));
const durations=[];for(const site of sites){const start=performance.now();renderTenantHtml('<html><head></head><body><div id="root"></div></body></html>',site);durations.push(performance.now()-start)}durations.sort((a,b)=>a-b);
let reads=0;const store={list:()=>({async *[Symbol.asyncIterator](){for(let i=0;i<sites.length;i+=100)yield {blobs:sites.slice(i,i+100).map(site=>({key:`sites/${site.siteId}.json`}))}}}),get:async key=>{reads++;return sites[Number(key.slice(16,-5))]}};
const start=performance.now();const xml=await buildTenantSitemap(store);console.log(JSON.stringify({source:'synthetic-memory-only',tenants:count,htmlP95Ms:durations[Math.floor((count-1)*.95)],htmlP99Ms:durations[Math.floor((count-1)*.99)],sitemapMs:performance.now()-start,sitemapBytes:Buffer.byteLength(xml),reads,productionCapacityProven:false,providerCostsMeasured:false},null,2));
