import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createUploadHandler} from '../functions/marketplace-ad-upload.mjs';
import {assetKey,attachDrafts} from './promotion-media.mjs';
test('interrupted uploads resume at the stored offset and attach only to the uploading account',async()=>{
 const values=new Map();let version=0;
 const store={async getWithMetadata(k){return values.get(k)},async set(k,data,o={}){
  if(o.onlyIfMatch&&o.onlyIfMatch!==values.get(k)?.etag||o.onlyIfNew&&values.has(k))return {modified:false};
  values.set(k,{data,metadata:o.metadata,etag:String(++version)});return {modified:true};
 }};
 let userId='first';
 const handle=createUploadHandler({assets:()=>store,owner:async()=>({user:{id:userId}})});
 const origin='https://example.test',url=origin+'/upload?siteId=shop&slot=0';
 const request=(method,href,headers={},body)=>handle(new Request(href,{method,headers:{origin,...headers},body}));
 const png=await sharp({create:{width:20,height:40,channels:3,background:'red'}}).png().toBuffer();
 const created=await request('POST',url,{'Upload-Length':String(png.length)});
 assert.equal(created.status,201);const resource=new URL(created.headers.get('location'),origin);
 const patch=(offset,part)=>request('PATCH',resource,{'Upload-Offset':String(offset),'Content-Type':'application/offset+octet-stream'},part);
 assert.equal((await patch(0,png.subarray(0,20))).status,204);
 assert.equal((await request('HEAD',resource)).headers.get('Upload-Offset'),'20');
 assert.equal((await patch(0,png)).status,409);
 userId='other';assert.equal((await request('HEAD',resource)).status,404);
 userId='first';assert.equal((await patch(20,png.subarray(20))).status,204);
 const files=[{slot:0,id:resource.searchParams.get('upload')}],row={id:'campaign'};
 await assert.rejects(attachDrafts(store,JSON.stringify(['other','shop']),row,files),{status:409});
 assert.deepEqual(await attachDrafts(store,JSON.stringify(['first','shop']),row,files),[{type:'image/webp'}]);
 assert.equal((await sharp(Buffer.from(values.get(assetKey(row.id,0)).data)).metadata()).format,'webp');
});
