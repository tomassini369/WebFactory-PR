import {admin} from '@netlify/identity';
import {clientOAuthStore} from '../lib/client-store.mjs';
import {authenticateToken} from '../lib/chatgpt-oauth.mjs';
import {serveMcp} from '../lib/chatgpt-mcp.mjs';
export function createMcpHandler({getStore=clientOAuthStore,authenticate=authenticateToken,getUser=id=>admin.getUser(id),serve=serveMcp}={}){return async (req,context)=>{
 const origin=new URL(req.url).origin,headers={'Cache-Control':'no-store'};
 try{
  const grant=await authenticate(getStore(),req.headers.get('authorization'),origin);
  const user=await getUser(grant.userId);
  if(req.method!=='POST')return new Response(null,{status:405,headers:{...headers,Allow:'POST'}});
  const raw=await req.text();if(raw.length>100000)return Response.json({error:'Request too large.'},{status:413,headers});
  const response=await serve(new Request(req.url,{method:'POST',headers:req.headers,body:raw}),grant,user,context);
  response.headers.set('Cache-Control','no-store');return response;
 }catch(e){const status=e.status||503;if(status===401)headers['WWW-Authenticate']=`Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`;return Response.json({error:status<500?e.message:'Connection unavailable. Try again from WebFactory.'},{status,headers});}
};}
export default createMcpHandler();
export const config={path:'/mcp',rateLimit:{windowLimit:120,windowSize:60,aggregateBy:['ip']}};
