import {clientOAuthStore} from '../lib/client-store.mjs';
import {allowedRedirect,beginAuthorization,exchangeToken,key,metadata,registerClient,revokeGrant,scopes} from '../lib/chatgpt-oauth.mjs';
export default async req=>{
 const url=new URL(req.url),origin=url.origin,path=url.pathname;
 const headers={'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff'};
 try{
  if(req.method==='GET'&&path.startsWith('/.well-known/oauth-protected-resource'))return Response.json({resource:origin+'/mcp',authorization_servers:[origin],scopes_supported:scopes,bearer_methods_supported:['header']},{headers});
  if(req.method==='GET'&&path==='/.well-known/oauth-authorization-server')return Response.json(metadata(origin),{headers});
  const store=clientOAuthStore();
  if(req.method==='GET'&&path==='/oauth/chatgpt/authorize'){
   const id=await beginAuthorization(store,Object.fromEntries(url.searchParams),origin);
   return new Response(null,{status:302,headers:{...headers,Location:origin+'/chatgpt?authorize='+encodeURIComponent(id)}});
  }
  if(req.method!=='POST')return new Response(null,{status:405,headers});
  const raw=await req.text();if(raw.length>12000)throw Error('Request too large.');
  if(path==='/oauth/chatgpt/register')return Response.json(await registerClient(store,JSON.parse(raw)),{status:201,headers});
  const input=Object.fromEntries(new URLSearchParams(raw));
  if(path==='/oauth/chatgpt/token')return Response.json(await exchangeToken(store,input,origin),{headers});
  if(path==='/oauth/chatgpt/revoke'){
   const token=await store.get(key(input.token_type_hint==='refresh_token'?'refresh':'access',input.token),{type:'json'});
   if(token&&token.clientId===input.client_id&&token.resource===origin+'/mcp')await revokeGrant(store,token.grantId);
   return new Response(null,{status:200,headers});
  }
  return new Response(null,{status:404,headers});
 }catch(error){return Response.json({error:'invalid_request',error_description:error.status&&error.status<500?error.message:'OAuth request could not be completed.'},{status:error.status||400,headers});}
};
export const config={path:['/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp','/.well-known/oauth-authorization-server','/oauth/chatgpt/authorize','/oauth/chatgpt/token','/oauth/chatgpt/register','/oauth/chatgpt/revoke'],rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip']}};
