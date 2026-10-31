import crypto from 'node:crypto';
import sharp from 'sharp';
import {assertSameOrigin,errorResponse,requireSiteAccess,requirePlatformAdmin} from '../lib/client-auth.mjs';
import {appearanceStore} from './dashboard-appearance.mjs';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Cookie'};
const fail=(message,status)=>Object.assign(new Error(message),{status});
async function boundedBody(req,max){
 const reader=req.body?.getReader();if(!reader)return Buffer.alloc(0);const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw fail('Image or request is too large.',413)}chunks.push(Buffer.from(value))}return Buffer.concat(chunks);
}
export const profileKey=userId=>'profiles/'+crypto.createHash('sha256').update(userId).digest('hex');
export async function purgePortalProfile(requestUrl,userId){if(userId)await appearanceStore(requestUrl).delete(profileKey(userId));}
export function normalizeProfile(input={}){
 const text=(key,max)=>typeof input?.[key]==='string'?input[key].replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max):'';
 return {name:text('name',100),phone:text('phone',40),language:['es','en'].includes(input?.language)?input.language:null,theme:['dark','light'].includes(input?.theme)?input.theme:null};
}
export function createPortalProfileHandler({siteAccess=requireSiteAccess,platformAccess=requirePlatformAdmin,store=appearanceStore,encodeImage=async bytes=>{
 const image=sharp(bytes,{limitInputPixels:40000000,animated:false});const meta=await image.metadata();
 if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1)throw fail('Use a static JPEG, PNG or WebP image.',400);
 return image.rotate().resize({width:512,height:512,fit:'cover',position:'centre',withoutEnlargement:true}).webp({quality:86}).toBuffer();
}}={}){return async req=>{try{
 if(!['GET','PUT','POST','DELETE'].includes(req.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, PUT, POST, DELETE'}});
 assertSameOrigin(req);const url=new URL(req.url);const siteId=url.searchParams.get('siteId');
 if(siteId&&(!/^[a-z0-9_-]{1,120}$/i.test(siteId)))throw fail('Invalid business.',400);
 const actor=siteId?await siteAccess(siteId):{user:await platformAccess()};const user=actor.user;
 if(!user?.id)throw fail('Authentication required.',401);
 const key=profileKey(user.id);
 const storage=store(req.url);
 // Read the value and its storage version together, so CAS protects this exact snapshot.
 const snapshot=await storage.getWithMetadata(key,{type:'json'});const current=snapshot?.data||{};
 const etag='"'+crypto.createHash('sha256').update(JSON.stringify(current)).digest('hex')+'"';
 const respond=record=>Response.json({ok:true,profile:normalizeProfile(record.profile),hasPhoto:Boolean(record.image),revision:record.revision||0,version:crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex')},{headers:{...headers,ETag:'"'+crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex')+'"'}});
 if(req.method==='GET'){
  if(url.searchParams.get('asset')==='1'){
   if(!current.image)throw fail('Photo not found.',404);
   return new Response(Buffer.from(current.image,'base64'),{headers:{...headers,'Content-Type':'image/webp','Content-Disposition':url.searchParams.get('download')==='1'?'attachment; filename="profile-photo.webp"':'inline'}});
  }return respond(current);
 }
 // Refuse stale writes from another tab/device instead of overwriting its image.
 // Keep the application version separate from HTTP validators: CDNs may rewrite ETag.
 const expected=req.headers.get('x-profile-version');
 const matches=expected!==null?expected===etag.slice(1,-1):req.headers.get('if-match')?.replace(/^W\//,'')===etag;
 if(!matches)throw fail('Profile changed. Reload your settings and try again.',409);
 let next={...current,revision:(current.revision||0)+1};
 if(req.method==='DELETE'){delete next.image;}
 else if(req.method==='POST'){
  if(!['image/jpeg','image/png','image/webp'].includes((req.headers.get('content-type')||'').split(';')[0]))throw fail('Use JPEG, PNG or WebP.',400);
  const bytes=await boundedBody(req,4*1024*1024);let image;try{image=await encodeImage(bytes)}catch(error){if(error.status)throw error;throw fail('The image could not be read.',400)}
  if(image.length>2*1024*1024)throw fail('Choose a smaller image.',413);
  next={...next,image:image.toString('base64')};
 }else{
  const bytes=await boundedBody(req,3000);let input;try{input=JSON.parse(bytes.toString())}catch{throw fail('Invalid JSON.',400)}
  if(!input||typeof input!=='object'||Array.isArray(input))throw fail('Invalid settings.',400);
  if(Object.keys(input).some(key=>!['name','phone','language','theme'].includes(key)))throw fail('Unsupported profile field.',400);
  next.profile=normalizeProfile({...normalizeProfile(current.profile),...input});
 }
 // Commit only this authenticated user’s private profile; no public asset URL.
 const options=snapshot?{onlyIfMatch:snapshot.etag}:{onlyIfNew:true};
 if(snapshot&&!snapshot.etag)throw fail('Profile version unavailable. Try again.',503);
 const result=await storage.setJSON(key,next,options);
 if(result?.modified===false)throw fail('Profile changed. Reload your settings.',409);
 return respond(next);
}catch(error){return errorResponse(error)}}}
export default createPortalProfileHandler();
export const config={rateLimit:{action:'rate_limit',aggregateBy:['ip'],windowSize:60,windowLimit:40}};
