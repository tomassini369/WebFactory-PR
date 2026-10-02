import { assertSameOrigin,errorResponse,requireSiteCapability } from '../lib/client-auth.mjs';
import { inventoryHealth,cleanupCompletedPosPointer,snapshotInventoryJournal } from '../lib/inventory-health.mjs';
import { readAuthPayload } from '../lib/auth-gateway.mjs';
import { archiveInventoryBatch } from '../lib/inventory-archive.mjs';

export default async req=>{
  try{
    if(!['GET','POST'].includes(req.method))return Response.json({ok:false,message:'Method not allowed.'},{status:405,headers:{'Cache-Control':'no-store'}});
    assertSameOrigin(req);
    const payload=req.method==='POST'?await readAuthPayload(req):null;
    const siteId=payload?.siteId||new URL(req.url).searchParams.get('siteId');
    const {site,user}=await requireSiteCapability(siteId,'catalog');
    let result;
    if(req.method==='GET')result=await inventoryHealth(site);
    else if(payload.action==='cleanup_completed_pos')result=await cleanupCompletedPosPointer(site.siteId,payload.transactionId);
    else if(payload.action==='snapshot_journal')result=await snapshotInventoryJournal(site.siteId,user.email);
    else if(payload.action==='archive_journal')result=await archiveInventoryBatch(site.siteId,user.email);
    else throw Object.assign(new Error('Unsupported inventory maintenance action.'),{status:400});
    return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return errorResponse(error)}
};
export const config={rateLimit:{windowLimit:10,windowSize:180,aggregateBy:['ip']}};
