const fail=message=>Object.assign(Error(message),{status:503});
export async function deleteStorePrefix(store,prefix,{clock=Date.now,budgetMs=35000,maxKeys=5000}={}){
 const started=clock(),keys=[];const check=()=>{if(clock()-started>budgetMs)throw fail('Deletion exceeded its time budget; retry required')};
 // Collect before deleting so pagination cannot skip rows after mutations.
 for await(const page of store.list({prefix,paginate:true})){
  check();for(const {key} of page.blobs||[]){if(!key.startsWith(prefix))throw fail('Storage returned a foreign key');keys.push(key);if(keys.length>maxKeys)throw fail('Deletion exceeds the synchronous batch limit')}
 }
 for(const key of keys){check();await store.delete(key);if(await store.get(key)!==null)throw fail('Deletion could not be verified')}
 return keys.length;
}
