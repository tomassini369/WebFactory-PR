import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {getClientSiteBySlug} from '../lib/client-store.mjs';
import {publicTenant,renderTenantHtml} from '../lib/tenant-seo.mjs';
export function createTenantPageHandler({lookup=getClientSiteBySlug,loadShell=()=>readFile(resolve('dist/index.html'),'utf8')}={}){return async(req,context)=>{
 const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self' https://*.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.pexels.com; connect-src 'self' https://*.stripe.com; frame-src 'self' https://*.stripe.com https://www.google.com; font-src 'self' data:; base-uri 'self'; form-action 'self' https://*.stripe.com; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests"};
 if(!['GET','HEAD'].includes(req.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD'}});
 try{
  const slug=new URL(req.url).searchParams.get('slug')||'';
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return new Response('Business not found',{status:404,headers});
  const site=await lookup(slug);
  if(!publicTenant(site)||site.slug!==slug)return new Response('Business not found',{status:404,headers:{...headers,'X-Robots-Tag':'noindex'}});
  const html=renderTenantHtml(await loadShell(),site,{indexable:context.deploy?.context==='production'});
  return new Response(req.method==='HEAD'?null:html,{headers});
 }catch{return new Response('Business temporarily unavailable',{status:503,headers:{...headers,'X-Robots-Tag':'noindex'}})}
};
}
export default createTenantPageHandler();
