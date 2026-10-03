import {requirePlatformAdmin,assertSameOrigin,errorResponse} from '../lib/client-auth.mjs';
import {readAuthPayload} from '../lib/auth-gateway.mjs';
import {clientBackupStore} from '../lib/client-store.mjs';
import {verifyTenantSnapshot} from '../lib/tenant-snapshot.mjs';
export default async(req)=>{
 try{
  if(req.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST','Cache-Control':'no-store'}});
  assertSameOrigin(req);await requirePlatformAdmin();const body=await readAuthPayload(req);
  if(!/^[a-zA-Z0-9_-]{1,120}$/.test(body.siteId||''))throw Object.assign(Error('Invalid business'),{status:400});
  const store=clientBackupStore(),latest=await store.get(`latest/${body.siteId}.json`,{type:'json'});
  if(!latest||latest.manifestKey!==`snapshots/${body.siteId}/${latest.id}/manifest.json`)throw Object.assign(Error('No completed backup'),{status:404});
  const manifest=await store.get(latest.manifestKey,{type:'json'});if(manifest?.siteId!==body.siteId)throw Error('Backup identity mismatch');
  return Response.json(await verifyTenantSnapshot(store,manifest),{headers:{'Cache-Control':'no-store'}});
 }catch(error){return errorResponse(error)}
};
export const config={rateLimit:{windowLimit:5,windowSize:180,aggregateBy:['ip']}};
