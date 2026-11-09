import {requireClientUser,assertSameOrigin,errorResponse} from '../lib/client-auth.mjs';
import {readAuthPayload,authJson} from '../lib/auth-gateway.mjs';
import {clientSiteStore,getClientSiteBySlug} from '../lib/client-store.mjs';
import {consumerKey,publicConsumer,updateConsumer} from '../lib/marketplace.mjs';
export default async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers:{Allow:'GET, POST'}});
  assertSameOrigin(req);
  const user=await requireClientUser();
  if(!user.confirmedAt)throw Object.assign(new Error('Confirm your email before using your consumer profile.'),{status:403});
  const store=clientSiteStore();
  const profile=req.method==='GET'?publicConsumer(await store.get(consumerKey(user.id),{type:'json'}),user):await updateConsumer(store,user,await readAuthPayload(req),getClientSiteBySlug);
  return authJson({ok:true,profile});
 }catch(error){return errorResponse(error)}
};
export const config={rateLimit:{windowLimit:40,windowSize:60,aggregateBy:['ip']}};
