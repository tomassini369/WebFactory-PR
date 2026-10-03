import {clientSiteStore} from '../lib/client-store.mjs';
import {buildTenantSitemap} from '../lib/tenant-seo.mjs';
export default async(req,context)=>{
 const headers={'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'};
 if(!['GET','HEAD'].includes(req.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD'}});
 if(context.deploy?.context!=='production')return new Response('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',{headers:{...headers,'X-Robots-Tag':'noindex'}});
 try{return new Response(req.method==='HEAD'?null:await buildTenantSitemap(clientSiteStore()),{headers})}
 catch{return new Response('Sitemap temporarily unavailable',{status:503,headers:{...headers,'Content-Type':'text/plain'}})}
};
