import crypto from 'node:crypto';
export async function recordFinancialAudit(store,{siteId,user,action,entryId='',revision}){
 const id=crypto.randomUUID(),record={id,siteId,action,entryId,revision,actor:String(user.email||user.id||''),actorId:String(user.id||user.sub||''),at:new Date().toISOString()};
 const saved=await store.setJSON(`${siteId}/financial-audit/${id}.json`,record,{onlyIfNew:true});
 if(!saved.modified)throw Object.assign(new Error('Financial audit could not be recorded.'),{status:503});
 return record;
}
export async function financialAuditHistory(store,siteId){
 const result=[];for await(const page of store.list({prefix:`${siteId}/financial-audit/`,paginate:true}))for(const blob of page.blobs||[]){
  if(result.length>=2000)throw Object.assign(new Error('Audit export limit reached. Contact support; no records were deleted.'),{status:413});
  const record=await store.get(blob.key,{type:'json'});if(!record||record.siteId!==siteId)throw Object.assign(new Error('Financial audit tenant mismatch.'),{status:403});result.push(record);
 }return result.sort((a,b)=>a.at.localeCompare(b.at));
}
