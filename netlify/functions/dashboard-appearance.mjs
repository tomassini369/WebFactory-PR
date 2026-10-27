import crypto from 'node:crypto';
import sharp from 'sharp';
import {getStore} from '@netlify/blobs';
import {assertSameOrigin,errorResponse,requireSiteAccess,requirePlatformAdmin} from '../lib/client-auth.mjs';
import {DEFAULT_APPEARANCE,normalizeAppearance} from '../../shared/dashboard-appearance.mjs';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Cookie'};
const fail=(message,status)=>Object.assign(new Error(message),{status});
async function boundedBody(req,max){
 const reader=req.body?.getReader();if(!reader)return Buffer.alloc(0);const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw fail('Image or request is too large.',413)}chunks.push(Buffer.from(value))}return Buffer.concat(chunks);
}
export function appearanceStore(requestUrl){
 const context=globalThis.Netlify?.context?.deploy;
 // Stable within this preview host across releases, separate from production.
 const scope=context?.context==='production'?'production':`preview-${new URL(requestUrl).hostname}`;
 return getStore(`webfactory-dashboard-${crypto.createHash('sha256').update(scope).digest('hex').slice(0,24)}`,{consistency:'strong'});
}
export function createDashboardAppearanceHandler({siteAccess=requireSiteAccess,platformAccess=requirePlatformAdmin,store=appearanceStore,encodeImage=async bytes=>{
 const image=sharp(bytes,{limitInputPixels:40000000,animated:false});const meta=await image.metadata();
 if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1)throw fail('Use a static JPEG, PNG or WebP image.',400);
 return image.rotate().resize({width:2560,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toBuffer();
}}={}){return async req=>{try{
 if(!['GET','PUT','POST','DELETE'].includes(req.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, PUT, POST, DELETE'}});
 assertSameOrigin(req);const url=new URL(req.url);const siteId=url.searchParams.get('siteId');
 if(siteId&&(!/^[a-z0-9_-]{1,120}$/i.test(siteId)))throw fail('Invalid business.',400);
 const actor=siteId?await siteAccess(siteId):{user:await platformAccess()};const user=actor.user;
 if(!user?.id)throw fail('Authentication required.',401);
 const key='users/'+crypto.createHash('sha256').update(JSON.stringify([siteId||'platform',user.id])).digest('hex');
 const storage=store(req.url);const current=await storage.get(key,{type:'json'})||{};
 const etag='"'+crypto.createHash('sha256').update(JSON.stringify(current)).digest('hex')+'"';
 const respond=record=>Response.json({ok:true,prefs:normalizeAppearance(record.prefs||DEFAULT_APPEARANCE),hasCustom:Boolean(record.image),revision:record.revision||0},{headers:{...headers,ETag:'"'+crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex')+'"'}});
 if(req.method==='GET'){
  if(url.searchParams.get('asset')==='1'){
   if(!current.image)throw fail('Background not found.',404);
   return new Response(Buffer.from(current.image,'base64'),{headers:{...headers,'Content-Type':'image/webp','Content-Disposition':url.searchParams.get('download')==='1'?'attachment; filename="dashboard-background.webp"':'inline'}});
  }return respond(current);
 }
 // Refuse stale writes from another tab/device instead of overwriting its image.
 if(req.headers.get('if-match')!==etag)throw fail('Appearance changed. Reload your settings and try again.',409);
 let next={...current,revision:(current.revision||0)+1};
 if(req.method==='DELETE'){next={prefs:{...DEFAULT_APPEARANCE},revision:next.revision};}
 else if(req.method==='POST'){
  if(!['image/jpeg','image/png','image/webp'].includes((req.headers.get('content-type')||'').split(';')[0]))throw fail('Use JPEG, PNG or WebP.',400);
  const bytes=await boundedBody(req,4*1024*1024);let image;try{image=await encodeImage(bytes)}catch(error){if(error.status)throw error;throw fail('The image could not be read.',400)}
  if(image.length>2*1024*1024)throw fail('Choose a smaller image.',413);
  next={...next,image:image.toString('base64'),prefs:{...normalizeAppearance(current.prefs),background:'custom'}};
 }else{
  const bytes=await boundedBody(req,3000);let input;try{input=JSON.parse(bytes.toString())}catch{throw fail('Invalid JSON.',400)}
  if(!input||typeof input!=='object'||Array.isArray(input))throw fail('Invalid settings.',400);
  next.prefs=normalizeAppearance(input);
  if(next.prefs.background==='custom'&&!current.image)throw fail('Upload a background first.',400);
 }
 // One conditional record commits image + settings together; no public asset URL.
 const options=Object.keys(current).length?{onlyIfMatch:etag.slice(1,-1)}:{onlyIfNew:true};
 // Blob ETags are storage-owned; compare the actual storage version for CAS.
 const version=await storage.getMetadata(key);
 if(Object.keys(current).length&&version?.etag)options.onlyIfMatch=version.etag;
 const recheck=await storage.get(key,{type:'json'})||{};
 if(JSON.stringify(recheck)!==JSON.stringify(current))throw fail('Appearance changed. Reload your settings.',409);
 const result=await storage.setJSON(key,next,options);
 if(result?.modified===false)throw fail('Appearance changed. Reload your settings.',409);
 return respond(next);
}catch(error){return errorResponse(error)}}}
export default createDashboardAppearanceHandler();
export const config={rateLimit:{action:'rate_limit',aggregateBy:['ip'],windowSize:60,windowLimit:40}};
