import {siteEntitlement} from './subscription-billing.mjs';
import {publicClientSite} from './client-store.mjs';
export const CANONICAL_ORIGIN='https://webfactorypr.com';
export const publicTenant=site=>Boolean(site&&['active','preview','setup_pending','trial'].includes(site.status)&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(site.slug||'')&&siteEntitlement(site).public);
const escape=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const text=(value,max)=>String(value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,max);
export function tenantMetadata(site){
 const {business}=publicClientSite(site),es=site.settings?.locale==='es';
 const title=text(es?(business.nameEs||business.nameEn||business.name):(business.nameEn||business.name||business.nameEs),160)||'WebFactory Business';
 const description=text(es?(business.descriptionEs||business.descriptionEn||business.description):(business.descriptionEn||business.description||business.descriptionEs),300);
 const url=`${CANONICAL_ORIGIN}/sites/${encodeURIComponent(site.slug)}`;
 const image=business.heroUrl||business.logoUrl;
 return {title,description,url,image:image?new URL(image,CANONICAL_ORIGIN).href:'',lang:es?'es-PR':'en',locale:es?'es_PR':'en_US'};
}
export function renderTenantHtml(shell,site,{indexable=true}={}){
 const m=tenantMetadata(site),meta=(property,value,attribute='property')=>`<meta ${attribute}="${property}" content="${escape(value)}">`;
 let html=shell.replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,'').replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi,'').replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'');
 const schema=JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:m.title,url:m.url,inLanguage:m.lang,description:m.description}).replace(/</g,'\\u003c');
 const tags=[`<title>${escape(m.title)}</title>`,meta('description',m.description,'name'),meta('robots',indexable?'index, follow, max-image-preview:large':'noindex, nofollow','name'),`<link rel="canonical" href="${escape(m.url)}">`,meta('og:site_name',m.title),meta('og:title',m.title),meta('og:description',m.description),meta('og:url',m.url),meta('og:type','website'),meta('og:locale',m.locale),meta('twitter:card',m.image?'summary_large_image':'summary','name'),meta('twitter:title',m.title,'name'),meta('twitter:description',m.description,'name'),...(m.image?[meta('og:image',m.image),meta('twitter:image',m.image,'name')]:[]),`<script type="application/ld+json">${schema}</script>`].join('\n');
 return html.replace(/<html\b[^>]*>/i,`<html lang="${m.lang}">`).replace(/<\/head>/i,`${tags}\n</head>`);
}
export async function buildTenantSitemap(store,{clock=Date.now,budgetMs=15000,maxSites=5000}={}){
 const started=clock(),urls=[CANONICAL_ORIGIN+'/',CANONICAL_ORIGIN+'/templates',CANONICAL_ORIGIN+'/privacy',CANONICAL_ORIGIN+'/terms',CANONICAL_ORIGIN+'/refund-policy'];let count=0;
 for await(const page of store.list({prefix:'sites/',paginate:true})){
  for(const {key} of page.blobs||[]){
   if(++count>maxSites||clock()-started>budgetMs)throw Object.assign(Error('Sitemap capacity exceeded'),{status:503});
   if(!/^sites\/[a-zA-Z0-9_-]{1,120}\.json$/.test(key))continue;
   const site=await store.get(key,{type:'json'});if(site&&key!==`sites/${site.siteId}.json`)throw Error('Invalid tenant identity');
   if(publicTenant(site))urls.push(tenantMetadata(site).url);
  }
 }
 return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(urls)].map(url=>`<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>`;
}
