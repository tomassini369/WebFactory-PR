import crypto from 'node:crypto';
import { withBookingLock } from './booking-lock.mjs';

// Index before the record write: a failed record write leaves a harmless index,
// rather than an unindexed authentication record that cannot be collected.
export async function indexAuthExpiry(store,key,expiresAt){
  const hour=new Date(expiresAt).toISOString().slice(0,13);
  await store.setJSON(`expiry/${hour}/${crypto.randomUUID()}.json`,{key,expiresAt});
}

export async function cleanupAuthExpiry(store,{now=Date.now(),clock=Date.now,budgetMs=18000,maxRecords=100}={}){
  const started=clock();
  const summary={scanned:0,deleted:0,indexesDeleted:0,invalid:0,paused:false};
  const currentHour=new Date(now).toISOString().slice(0,13);
  return withBookingLock(store,'maintenance/expiry-lock',async()=>{
    for await(const page of store.list({prefix:'expiry/',directories:true,paginate:true})){
      const hours=(page.directories||[]).filter(key=>/^expiry\/\d{4}-\d{2}-\d{2}T\d{2}\/$/.test(key)&&key.slice(7,20)<currentHour).sort();
      for(const hour of hours){
        for await(const entries of store.list({prefix:hour,paginate:true})){
          for(const {key: indexKey} of entries.blobs||[]){
            if(summary.scanned>=maxRecords||clock()-started>=budgetMs){summary.paused=true;return summary;}
            summary.scanned++;
            const index=await store.get(indexKey,{type:'json'});
            const match=/^(users\/[a-f0-9]{64}\/)(?:sessions\/[a-f0-9]{64}|challenges\/[-a-zA-Z0-9_]{43}|totp-attempts)\.json$/.exec(index?.key||'');
            if(!match||!Number.isFinite(index.expiresAt)||index.expiresAt>now){summary.invalid++;continue;}
            try{
              await withBookingLock(store,`${match[1]}lock`,async()=>{
                const record=await store.get(index.key,{type:'json'});
                if(record&&(!Number.isFinite(record.expiresAt)||record.expiresAt>now)){summary.invalid++;return;}
                if(record){await store.delete(index.key);summary.deleted++;}
                await store.delete(indexKey);summary.indexesDeleted++;
              });
            }catch(error){if(error?.status!==409)throw error;}
          }
        }
      }
    }
    return summary;
  });
}
