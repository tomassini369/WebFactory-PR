import crypto from "node:crypto";
export async function withBookingLock(store, key, action) {
  const owner=crypto.randomUUID(), value={owner,expiresAt:Date.now()+120000};
  let claim=await store.setJSON(key,value,{onlyIfNew:true});
  if (!claim.modified) {
    const previous=await store.getWithMetadata(key,{type:"json"});
    if (previous?.etag && Number(previous.data?.expiresAt)<Date.now()) claim=await store.setJSON(key,value,{onlyIfMatch:previous.etag});
  }
  if (!claim.modified) throw Object.assign(new Error("Another booking update is in progress. Please try again. / Hay otra actualización en curso. Inténtalo nuevamente."),{status:409});
  try { return await action(); }
  finally { const current=await store.get(key,{type:"json"}); if(current?.owner===owner) await store.delete(key); }
}
