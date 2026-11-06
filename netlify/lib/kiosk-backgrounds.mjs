import {kioskBackgroundKey,kioskBackgroundLimit} from './kiosk-skins.mjs';
import {kioskFail} from './kiosk.mjs';
export function kioskBackgroundAssets(config,siteId,includePending=false){return (Array.isArray(config?.backgroundAssets)?config.backgroundAssets:[]).filter(x=>x&&kioskBackgroundKey(x.key,siteId)&&(!x.pending||Date.now()-Number(x.pendingAt||0)<600000)&&(includePending||!x.pending)).slice(0,kioskBackgroundLimit).map(x=>({key:x.key,name:String(x.name||'Background').slice(0,80),size:Number(x.size)||0,...(includePending?{pending:Boolean(x.pending),pendingAt:Number(x.pendingAt)||0}:{})}));}
export function assertRegisteredBackgrounds(config,appearances,siteId){
 const keys=new Set(kioskBackgroundAssets(config,siteId).map(x=>x.key));
 for(const appearance of appearances)if(appearance.backgroundAssetKey&&!keys.has(appearance.backgroundAssetKey))throw kioskFail('Upload or select this business background first / Sube o selecciona un fondo de este negocio.');
}
