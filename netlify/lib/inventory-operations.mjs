import crypto from 'node:crypto';
import { clientSiteStore,siteKey } from './client-store.mjs';
import { reservationId, inventoryFingerprint, reservedQuantity } from './inventory-availability.mjs';
import { archivedInventoryMarker,findStockReservation } from './inventory-archive.mjs';
const fail=(message,status=409,code)=>Object.assign(new Error(message),{status,code});
export const stockOperationId=(kind,reference)=>crypto.createHash('sha256').update(`${kind}:${reference}`).digest('hex');

// Inventory and its replay marker share ONE conditional blob write. The caller
// still owns commerce locks; this module never pretends to transact other blobs.
export async function applyStockOperation(siteId,{kind,referenceId,items,direction=-1,reason=kind,reservationRequired=false},store=clientSiteStore(),now=Date.now()){
  if(!['sale','refund','adjustment'].includes(kind)||typeof referenceId!=='string'||!referenceId||referenceId.length>180||!Array.isArray(items)||!items.length||items.length>100||![-1,1].includes(direction))throw fail('Invalid inventory operation.',400);
  const seen=new Set(),lines=items.map(row=>{if(typeof row.id!=='string'||!row.id||seen.has(row.id)||!Number.isSafeInteger(Number(row.quantity))||Number(row.quantity)<1||Number(row.quantity)>1000000)throw fail('Use unique products and valid whole inventory quantities.',400);seen.add(row.id);return {id:row.id,quantity:Number(row.quantity)};}).sort((a,b)=>a.id.localeCompare(b.id));
  const id=stockOperationId(kind,referenceId),fingerprint=crypto.createHash('sha256').update(JSON.stringify({kind,referenceId,lines,direction})).digest('hex');
  const source=await store.getWithMetadata(siteKey(siteId),{type:'json'});
  if(!source?.data||source.data.siteId!==siteId)throw fail('Business inventory not found.',404);
  if(!source.etag)throw fail('Inventory concurrency metadata unavailable.',503);
  const site=source.data,operations=site.stockOperations||{};
  const existing=Object.hasOwn(operations,id)?operations[id]:await archivedInventoryMarker(site,'operation',id);
  if(existing){if(existing.fingerprint!==fingerprint)throw fail('Inventory operation was reused with different items.');return {site,operation:existing,reused:true};}
  if(Object.keys(operations).length>=5000)throw fail('Inventory journal requires archival before new operations.',503,'INVENTORY_JOURNAL_FULL');
  const reservation=kind==='sale'?await findStockReservation(site,referenceId):null;
  if(reservationRequired&&!reservation)throw fail('Inventory reservation is missing.',409,'INVENTORY_RESERVATION_INVALID');
  if(reservation&&(reservation.state!=='held'||reservation.fingerprint!==inventoryFingerprint(items)))throw fail('Inventory reservation requires reconciliation.',409,'INVENTORY_RESERVATION_INVALID');
  const deltas=[];
  const catalog=(site.catalog||[]).map(item=>{
    const line=lines.find(row=>row.id===item.id);
    if(!line||item.type!=='product'||!item.trackInventory||item.inventory===null||item.inventory===undefined)return item;
    const current=Number(item.inventory),next=current+direction*line.quantity;
    if(!Number.isSafeInteger(current)||!Number.isSafeInteger(next))throw fail('Product inventory requires correction.',409,'INVENTORY_INVALID');
    if(next<0&&!item.allowBackorder)throw fail('There is not enough stock. Review this transaction before fulfillment.',409,'INVENTORY_SHORTAGE');
    if(direction<0&&!item.allowBackorder&&next<reservedQuantity(site,item.id,kind==='sale'?referenceId:''))throw fail('Stock is reserved for another checkout.',409,'INVENTORY_SHORTAGE');
    deltas.push({itemId:item.id,quantityDelta:direction*line.quantity,before:current,after:next});
    return {...item,inventory:next};
  });
  for(const line of lines)if(!(site.catalog||[]).some(item=>item.id===line.id))throw fail('A transaction product is no longer in the catalog.',409,'INVENTORY_PRODUCT_MISSING');
  const operation={id,kind,referenceId,reason:String(reason||kind).slice(0,80),fingerprint,deltas,appliedAt:new Date(now).toISOString()};
  const updated={...site,catalog,stockOperations:{...operations,[id]:operation},...(reservation?{stockReservations:{...site.stockReservations,[reservationId(referenceId)]:{...reservation,state:'consumed',consumedAt:operation.appliedAt}}}:{}),revision:Number(site.revision||0)+1,updatedAt:new Date(now).toISOString()};
  if(Buffer.byteLength(JSON.stringify(updated.stockOperations))+Buffer.byteLength(JSON.stringify(updated.stockReservations||{}))>2*1024*1024)throw fail('Inventory journal size requires archival.',503,'INVENTORY_JOURNAL_FULL');
  const result=await store.setJSON(siteKey(siteId),updated,{onlyIfMatch:source.etag});
  if(!result.modified)throw fail('Inventory changed. Retry this operation.');
  return {site:updated,operation,reused:false};
}

export async function projectStockMovements(siteId,operation,store){
  for(const delta of operation.deltas){
    const movementId=`stock-${operation.id}-${crypto.createHash('sha256').update(delta.itemId).digest('hex').slice(0,16)}`;
    await store.setJSON(`${siteId}/v3/inventory-movements/${movementId}.json`,{siteId,movementId,itemId:delta.itemId,quantityDelta:delta.quantityDelta,before:delta.before,after:delta.after,reason:operation.reason,referenceId:operation.referenceId,operationId:operation.id,createdAt:operation.appliedAt});
  }
}
