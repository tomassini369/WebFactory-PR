import crypto from 'node:crypto';
import {admin} from '@netlify/identity';
import {clientOAuthStore,clientAssetStore,getClientSite} from './client-store.mjs';
import {getGrant,hash,oauthError} from './chatgpt-oauth.mjs';
import {authorizeGrant} from './chatgpt-operations.mjs';
import {requestDirectAction} from './chatgpt-direct.mjs';
import {safeFileName} from './platform-utils.mjs';

export const MAX_MCP_IMAGE_BYTES=4*1024*1024;
const types={'image/png':'png','image/jpeg':'jpeg','image/webp':'webp'};
const uploadKey=id=>{if(!/^[a-f0-9-]{36}$/.test(id||''))throw oauthError('Invalid upload.');return `chatgpt/image-uploads/${id}.json`;};
const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function requireExecute(grant){if(!grant.scopes.includes('webfactory.read')||!grant.scopes.includes('webfactory.execute'))throw oauthError('Read and Execute scopes are required.',403);}
function selectedSite(grant,siteId){if(!grant.platform&&siteId&&siteId!==grant.siteId)throw oauthError('Cross-business access denied.',403);const id=grant.platform?siteId:grant.siteId;if(!id)throw oauthError('Select a business siteId.');return id;}
async function boundUpload(grant,user,id,write=true){
 if(write)requireExecute(grant);else if(!grant.scopes.includes('webfactory.read'))throw oauthError('Read scope is required.',403);
 const store=clientOAuthStore(),stored=await store.getWithMetadata(uploadKey(id),{type:'json'}),p=stored?.data;
 if(!p||p.grantId!==grant.id||p.userId!==user.id)throw oauthError('Upload unavailable.',404);
 const live=await getGrant(store,grant.id);if(write)requireExecute(live);else if(!live.scopes.includes('webfactory.read'))throw oauthError('Read permission revoked.',403);
 await authorizeGrant(live,user,p.siteId,'catalog');
 return {store,stored,p,grant:live};
}
export async function prepareImageUpload(grant,user,args,origin){
 requireExecute(grant);
 const siteId=selectedSite(grant,args.siteId);
 const live=await getGrant(clientOAuthStore(),grant.id);requireExecute(live);await authorizeGrant(live,user,siteId,'catalog');
 if(!Object.hasOwn(types,args.contentType)||!Number.isSafeInteger(args.size)||args.size<1||args.size>MAX_MCP_IMAGE_BYTES||!/^[a-f0-9]{64}$/.test(args.sha256)||!/^[-a-f0-9]{36}$/.test(args.requestId))throw oauthError('Invalid image upload metadata.');
 const id=crypto.createHash('sha256').update(grant.id+args.requestId).digest('hex').slice(0,32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5');
 const store=clientOAuthStore(),fingerprint=hash(JSON.stringify({siteId,contentType:args.contentType,size:args.size,sha256:args.sha256,fileName:args.fileName}));
 let p=await store.get(uploadKey(id),{type:'json'});
 if(p){if(p.fingerprint!==fingerprint)throw oauthError('Use a new requestId for another image.',409);if(p.expiresAt<=Date.now()||p.status!=='prepared')return {uploadId:id,status:p.status,expired:p.expiresAt<=Date.now(),next:'Inspect with wf_image_upload_status. Do not repeat an uncertain upload.'};}
 else {
  const capability=crypto.randomBytes(32).toString('base64url');
  p={id,grantId:grant.id,userId:user.id,siteId,fingerprint,contentType:args.contentType,size:args.size,sha256:args.sha256,fileName:safeFileName(args.fileName,'image'),expiresAt:Date.now()+600000,status:'prepared',capability,capabilityHash:hash(capability),assetKey:`sites/${siteId}/mcp-${id}.webp`};
  const saved=await store.setJSON(uploadKey(id),p,{onlyIfNew:true});if(!saved.modified)throw oauthError('Upload preparation in progress. Retry with the same requestId.',409);
 }
 // This capability is limited to one exact image for ten minutes. It is never an OAuth bearer.
 return {uploadId:id,status:p.status,uploadUrl:`${origin}/.netlify/functions/chatgpt-image-upload?uploadId=${id}&capability=${p.capability}`,method:'PUT',contentType:p.contentType,size:p.size,expiresAt:p.expiresAt,next:'Transfer raw file bytes to uploadUrl outside model context, then call wf_finalize_image_upload. Do not put base64 or a local file path into MCP arguments.'};
}
async function limitedBytes(req,size){
 const declared=req.headers.get('content-length');if(declared&&Number(declared)!==size)throw oauthError('Image size does not match.',413);
 if(!req.body)throw oauthError('Image body required.');
 const reader=req.body.getReader(),chunks=[];let total=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>size||total>MAX_MCP_IMAGE_BYTES){await reader.cancel();throw oauthError('Image exceeds declared size.',413);}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 if(total!==size)throw oauthError('Image size does not match.');return Buffer.concat(chunks,total);
}
export async function receiveImageUpload(req,{getUser=id=>admin.getUser(id)}={}){
 try{
  if(req.method!=='PUT')return new Response(null,{status:405,headers:{...noStore,Allow:'PUT'}});
  const url=new URL(req.url),id=url.searchParams.get('uploadId'),cap=url.searchParams.get('capability');
  if(!/^[A-Za-z0-9_-]{43}$/.test(cap||''))throw oauthError('Upload authorization required.',401);
  const store=clientOAuthStore(),stored=await store.getWithMetadata(uploadKey(id),{type:'json'}),p=stored?.data;
  if(!p||!crypto.timingSafeEqual(Buffer.from(hash(cap)),Buffer.from(p.capabilityHash))||p.expiresAt<=Date.now())throw oauthError('Upload authorization expired or invalid.',401);
  if(p.status!=='prepared')throw oauthError('Upload already used. Inspect its status; do not replay.',409);
  const grant=await getGrant(store,p.grantId);requireExecute(grant);
  const user=await getUser(grant.userId);await authorizeGrant(grant,user,p.siteId,'catalog');
  if(req.headers.get('content-type')?.split(';')[0].trim()!==p.contentType)throw oauthError('Image type does not match.');
  const claimed=await store.setJSON(uploadKey(id),{...p,status:'receiving',capability:null},{onlyIfMatch:stored.etag});if(!claimed.modified)throw oauthError('Upload already claimed.',409);
  try{
   const bytes=await limitedBytes(req,p.size);if(crypto.createHash('sha256').update(bytes).digest('hex')!==p.sha256)throw oauthError('Image checksum does not match.');
   const {default:sharp}=await import('sharp');
   const image=sharp(bytes,{limitInputPixels:25000000,animated:false});const metadata=await image.metadata();
   if(metadata.format!==types[p.contentType]||!metadata.width||!metadata.height)throw oauthError('Invalid image file.');
   const optimized=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
   // Re-check revocation immediately before persisting the asset.
   const live=await getGrant(store,p.grantId);requireExecute(live);await authorizeGrant(live,await getUser(live.userId),p.siteId,'catalog');
   await clientAssetStore().set(p.assetKey,optimized,{metadata:{contentType:'image/webp',originalName:p.fileName,size:optimized.length,uploadedAt:new Date().toISOString(),source:'chatgpt-mcp'}});
   await store.setJSON(uploadKey(id),{...p,capability:null,status:'uploaded',storedSize:optimized.length});
   return Response.json({ok:true,uploadId:id,status:'uploaded'},{headers:noStore});
  }catch(error){await store.setJSON(uploadKey(id),{...p,capability:null,status:'failed'});throw error;}
 }catch(error){return Response.json({ok:false,message:error.status&&error.status<500?error.message:'Image upload failed. Inspect its status before retrying.'},{status:error.status||400,headers:noStore});}
}
export async function imageUploadStatus(grant,user,{uploadId}){
 const {p}=await boundUpload(grant,user,uploadId,false);
 return {uploadId,status:p.status,expired:p.expiresAt<=Date.now(),...(p.status==='attached'?{result:p.result}:{}),next:p.status==='uploaded'?'Call wf_finalize_image_upload to assign the image.':undefined};
}
export async function finalizeImageUpload(grant,user,args,origin,request,context){
 const {store,stored,p,grant:live}=await boundUpload(grant,user,args.uploadId);
 const fingerprint=hash(JSON.stringify(args.target));
 if(p.status==='attached'){if(p.targetFingerprint!==fingerprint)throw oauthError('This image was assigned to another target.',409);return p.result;}
 if(p.expiresAt<=Date.now()||p.status!=='uploaded')throw oauthError('Image is unavailable for assignment. Inspect its status.',409);
 const capability=args.target.kind==='catalog'?'catalog':'website';
 const {site}=await authorizeGrant(live,user,p.siteId,capability);
 const metadata=await clientAssetStore().getMetadata(p.assetKey);if(!metadata?.metadata||metadata.metadata.source!=='chatgpt-mcp')throw oauthError('Uploaded image unavailable.',409);
 if(args.target.kind!=='catalog')throw oauthError('Only catalog image assignments are supported.');
 if(!(site.catalog||[]).some(item=>item.id===args.target.itemId))throw oauthError('Catalog item unavailable.',404);
 const operation='update_catalog',input={value:site.catalog.map(item=>item.id===args.target.itemId?{...item,imageAssetKey:p.assetKey}:item)};
 const claimed=await store.setJSON(uploadKey(p.id),{...p,status:'attaching',targetFingerprint:fingerprint},{onlyIfMatch:stored.etag});if(!claimed.modified)throw oauthError('Image assignment already in progress.',409);
 try{
  const result=await requestDirectAction(live,user,{siteId:p.siteId,operation,input,requestId:args.requestId},origin,request,context);
  const status=result.ok&&result.verified?'attached':'review_required';
  await store.setJSON(uploadKey(p.id),{...p,capability:null,status,targetFingerprint:fingerprint,result});
  return {uploadId:p.id,...result};
 }catch(error){await store.setJSON(uploadKey(p.id),{...p,capability:null,status:'review_required',targetFingerprint:fingerprint});throw error;}
}
