import {assertSameOrigin,errorResponse,requireSiteAccess} from '../lib/client-auth.mjs';
import {clientCommerceStore} from '../lib/client-store.mjs';
import {emptyWorkforce,workforceKey,updateWorkforce} from '../lib/workforce.mjs';
import {businessModules,moduleAvailability} from '../lib/business-modules.mjs';
export function createBusinessModulesHandler({authorize=requireSiteAccess,getStore=clientCommerceStore,clock=Date.now}={}){return async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers:{Allow:'GET, POST'}});assertSameOrigin(req);
  const raw=req.method==='POST'?await req.text():'';if(raw.length>8000)throw Object.assign(new Error('Request too large.'),{status:413});
  const input=raw?JSON.parse(raw):{},siteId=req.method==='POST'?input.siteId:new URL(req.url).searchParams.get('siteId');
  if(!/^[A-Za-z0-9_-]{1,120}$/.test(siteId||''))throw Object.assign(new Error('Invalid business.'),{status:400});
  const {site,user,membership}=await authorize(siteId,['owner']);const store=getStore();
  const state=req.method==='POST'?await updateWorkforce(store,site,{...input,action:'configure_modules'},user,membership,clock()):await store.get(workforceKey(siteId),{type:'json'})||emptyWorkforce(siteId);
  if(state.siteId!==siteId)throw Object.assign(new Error('Tenant mismatch.'),{status:403});
  return Response.json({ok:true,modules:businessModules(state),availability:moduleAvailability(),revision:state.revision},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return errorResponse(error instanceof SyntaxError?Object.assign(new Error('Invalid JSON.'),{status:400}):error)}
};}
export default createBusinessModulesHandler();
