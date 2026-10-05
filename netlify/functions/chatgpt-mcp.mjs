import {admin} from '@netlify/identity';
import {clientOAuthStore} from '../lib/client-store.mjs';
import {authenticateToken} from '../lib/chatgpt-oauth.mjs';
import {serveMcp} from '../lib/chatgpt-mcp.mjs';
export default async (req,context)=>{
 const origin=new URL(req.url).origin,headers={'Cache-Control':'no-store'};
 try{
  const grant=await authenticateToken(clientOAuthStore(),req.headers.get('authorization'),origin);
  const user=await admin.getUser(grant.userId);
  if(req.method!=='POST')return new Response(null,{status:405,headers:{...headers,Allow:'POST'}});
  const raw=await req.text();if(raw.length>100000)return Response.json({error:'Request too large.'},{status:413,headers});
  const response=await serveMcp(new Request(req.url,{method:'POST',headers:req.headers,body:raw}),grant,user,context);
  response.headers.set('Cache-Control','no-store');return response;
 }catch(e){const status=e.status||503;if(status===401)headers['WWW-Authenticate']=`Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`;return Response.json({error:status<500?e.message:'Connection unavailable. Try again from WebFactory.'},{status,headers});}
};
export const config={path:'/mcp',rateLimit:{windowLimit:120,windowSize:60,aggregateBy:['ip']}};
