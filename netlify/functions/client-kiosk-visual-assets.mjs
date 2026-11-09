import crypto from 'node:crypto';
import {assertSameOrigin,requireSiteCapability,errorResponse} from '../lib/client-auth.mjs';
import {clientAssetStore,clientCommerceStore} from '../lib/client-store.mjs';
import {kioskConfigKey,mutateKiosk,kioskFail} from '../lib/kiosk.mjs';
import {kioskBackgroundKey,kioskBackgroundLimit} from '../lib/kiosk-skins.mjs';
import {kioskBackgroundAssets} from '../lib/kiosk-backgrounds.mjs';
import {optimizeKioskBackground,kioskBackgroundMaxBytes} from '../lib/kiosk-background-image.mjs';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
async function boundedBytes(req,max){const reader=req.body?.getReader(),parts=[];let size=0;if(!reader)throw kioskFail('File required.');try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw kioskFail('Image request too large / Imagen demasiado grande.',413)}parts.push(value)}}finally{reader.releaseLock()}return Buffer.concat(parts)}
export function createKioskBackgroundHandler({authorize=requireSiteCapability,getAssets=clientAssetStore,getStore=clientCommerceStore,uuid=crypto.randomUUID}={}){
 return async req=>{try{
  if(!['POST','DELETE'].includes(req.method))return new Response(null,{status:405,headers:{...headers,Allow:'POST, DELETE'}});
  assertSameOrigin(req);const siteId=new URL(req.url).searchParams.get('siteId');
  const {site,user,membership}=await authorize(siteId,'settings');
  if(membership?.role!=='owner'||!site.members?.some(m=>m.role==='owner'&&String(m.email).toLowerCase()===String(user.email).toLowerCase()))throw kioskFail('Owner required / Se requiere el dueño.',403);
  const store=getStore(),assets=getAssets(),configKey=kioskConfigKey(site.siteId);
  if(req.method==='DELETE'){
   const input=JSON.parse((await boundedBytes(req,2000)).toString());if(!input||typeof input!=='object'||Array.isArray(input))throw kioskFail('Invalid request / Solicitud inválida.');const key=input.assetKey;
   if(!kioskBackgroundKey(key,site.siteId))throw kioskFail('Invalid background / Fondo inválido.');
   const next=await mutateKiosk(store,configKey,current=>{
    if(current?.appearance?.backgroundAssetKey===key||(Array.isArray(current?.appearancePresets)?current.appearancePresets:[]).some(p=>p.appearance?.backgroundAssetKey===key))throw kioskFail('This background is used by a saved design / Este fondo está en un diseño guardado.',409);
    if(!kioskBackgroundAssets(current,site.siteId).some(x=>x.key===key))throw kioskFail('Background unavailable.',404);
    return {...current,backgroundAssets:kioskBackgroundAssets(current,site.siteId,true).filter(x=>x.key!==key)};
   });
   await assets.delete(key);return Response.json({ok:true,backgroundAssets:kioskBackgroundAssets(next,site.siteId)},{headers});
  }
  const bytes=await boundedBytes(req,kioskBackgroundMaxBytes+65536);
  let form;try{form=await new Request(req.url,{method:'POST',headers:req.headers,body:bytes}).formData()}catch{throw kioskFail('Invalid image request / Solicitud de imagen inválida.')}const file=form.get('file');
  if(!(file instanceof File))throw kioskFail('Image required / Se requiere una imagen.');
  const data=await optimizeKioskBackground(Buffer.from(await file.arrayBuffer()),file.type);
  const key=`sites/${site.siteId}/kiosk-backgrounds/${uuid()}.webp`,name=String(file.name||'Background').replace(/[\u0000-\u001f<>]/g,'').slice(0,80),record={key,name,size:data.length};
  await mutateKiosk(store,configKey,current=>{const rows=kioskBackgroundAssets(current,site.siteId,true);if(rows.length>=kioskBackgroundLimit)throw kioskFail('Maximum 8 backgrounds; remove an unused one / Máximo 8 fondos; elimina uno sin usar.',409);return {...current,backgroundAssets:[...rows,{...record,pending:true,pendingAt:Date.now()}]}});
  try{await assets.set(key,data,{metadata:{contentType:'image/webp',kioskBackground:true,size:data.length,originalName:name}});await mutateKiosk(store,configKey,current=>({...current,backgroundAssets:kioskBackgroundAssets(current,site.siteId,true).map(x=>x.key===key?{...x,pending:false}:x)}))}catch(error){await mutateKiosk(store,configKey,current=>({...current,backgroundAssets:kioskBackgroundAssets(current,site.siteId,true).filter(x=>x.key!==key)}));throw error}
  return Response.json({ok:true,assetKey:key,backgroundAssets:kioskBackgroundAssets(await store.get(configKey,{type:'json'}),site.siteId)},{headers});
 }catch(e){return errorResponse(e instanceof SyntaxError?kioskFail('Invalid request / Solicitud inválida.'):e)}};
}
export default createKioskBackgroundHandler();
export const config={rateLimit:{windowLimit:30,windowSize:60,aggregateBy:['ip']}};
