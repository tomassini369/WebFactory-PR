import { clientSiteStore, siteKey } from './client-store.mjs';
import { reservationId, inventoryLines, inventoryFingerprint, reservedQuantity } from './inventory-availability.mjs';

const fail = (message,status=409) => Object.assign(new Error(message),{status});
export async function reserveInventory(siteId, referenceId, items, store=clientSiteStore(), provider='stripe_checkout') {
  if(!['stripe_checkout','stripe_terminal','ath_movil'].includes(provider))throw fail('Invalid reservation provider.',400);
  if (typeof referenceId !== 'string' || !referenceId || referenceId.length > 180) throw fail('Invalid reservation reference.',400);
  const source = await store.getWithMetadata(siteKey(siteId),{type:'json'});
  if (!source?.etag || source.data?.siteId !== siteId) throw fail('Inventory unavailable.',503);
  const site=source.data, key=reservationId(referenceId), fingerprint=inventoryFingerprint(items);
  const existing=site.stockReservations?.[key];
  if (existing) {
    if (existing.fingerprint !== fingerprint || existing.state !== 'held' || (existing.provider&&existing.provider!==provider)) throw fail('This reservation cannot be reused.');
    return existing;
  }
  if (Object.keys(site.stockReservations||{}).length >= 5000 || Object.keys(site.stockOperations||{}).length >= 5000) throw fail('Inventory journal requires migration.',503);
  const lines=[];
  for (const line of inventoryLines(items)) {
    const item=(site.catalog||[]).find(item=>item.id===line.id && item.active!==false);
    if (!item) throw fail('A selected product is unavailable.');
    if (item.type!=='product'||!item.trackInventory||item.inventory==null) continue;
    const available=Number(item.inventory)-reservedQuantity(site,line.id);
    if (!Number.isSafeInteger(available)||(!item.allowBackorder&&available<line.quantity)) throw fail('There is not enough unreserved inventory.');
    lines.push(line);
  }
  const reservation={referenceId,fingerprint,provider,lines,state:'held',createdAt:new Date().toISOString()};
  const updated={...site,stockReservations:{...site.stockReservations,[key]:reservation},revision:Number(site.revision||0)+1,updatedAt:reservation.createdAt};
  if (Buffer.byteLength(JSON.stringify(updated.stockReservations))+Buffer.byteLength(JSON.stringify(updated.stockOperations||{}))>2*1024*1024) throw fail('Inventory journal requires migration.',503);
  const saved=await store.setJSON(siteKey(siteId),updated,{onlyIfMatch:source.etag});
  if (!saved.modified) throw fail('Inventory changed. Try again.');
  return reservation;
}

// Call only after authenticating a definitive provider failure/cancellation/expiration.
// A local clock, cancel URL, network error or unpaid completed session is NOT proof.
export async function releaseInventory(siteId,referenceId,store=clientSiteStore()) {
  const source=await store.getWithMetadata(siteKey(siteId),{type:'json'});
  if (!source?.etag||source.data?.siteId!==siteId) throw fail('Inventory unavailable.',503);
  const site=source.data,key=reservationId(referenceId),reservation=site.stockReservations?.[key];
  if (!reservation || reservation.state==='released') return false;
  if (reservation.state!=='held') return false;
  const now=new Date().toISOString();
  const result=await store.setJSON(siteKey(siteId),{...site,stockReservations:{...site.stockReservations,[key]:{...reservation,state:'released',releasedAt:now}},revision:Number(site.revision||0)+1,updatedAt:now},{onlyIfMatch:source.etag});
  if (!result.modified) throw fail('Inventory changed. Try again.');
  return true;
}
