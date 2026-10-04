import crypto from 'node:crypto';
export const oauthError=(message,status=400)=>Object.assign(new Error(message),{status});
export const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
export const randomToken=()=>crypto.randomBytes(32).toString('base64url');
export const scopes=['webfactory.read','webfactory.propose','webfactory.execute'];
export const key=(kind,id)=>`chatgpt/${kind}/${hash(id)}.json`;
export function allowedRedirect(uri){return uri==='https://chatgpt.com/connector_platform_oauth_redirect'||/^https:\/\/chatgpt\.com\/connector\/oauth\/[a-zA-Z0-9_-]+$/.test(uri);}
export function metadata(origin){return {issuer:origin,authorization_endpoint:origin+'/oauth/chatgpt/authorize',token_endpoint:origin+'/oauth/chatgpt/token',registration_endpoint:origin+'/oauth/chatgpt/register',revocation_endpoint:origin+'/oauth/chatgpt/revoke',response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256'],scopes_supported:scopes,authorization_response_iss_parameter_supported:true};}
const json={type:'json'};
async function setNew(store,k,value){const result=await store.setJSON(k,value,{onlyIfNew:true});if(!result.modified)throw oauthError('Please retry.',409);}
export async function registerClient(store,input){
 if(input.token_endpoint_auth_method&&input.token_endpoint_auth_method!=='none')throw oauthError('Only public PKCE clients are supported.');
 if(!Array.isArray(input.redirect_uris)||!input.redirect_uris.length||input.redirect_uris.length>5||!input.redirect_uris.every(allowedRedirect))throw oauthError('Unapproved ChatGPT redirect URI.');
 const client_id=randomToken(),client={client_id,client_name:'ChatGPT — WebFactory PR',redirect_uris:[...new Set(input.redirect_uris)],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']};
 await setNew(store,key('clients',client_id),client);return client;
}
export async function beginAuthorization(store,input,origin,now=Date.now()){
 const client=await store.get(key('clients',input.client_id),json);
 if(!client||!client.redirect_uris.includes(input.redirect_uri)||!allowedRedirect(input.redirect_uri))throw oauthError('Invalid client or redirect.');
 const requested=String(input.scope||'webfactory.read').split(' ').filter(Boolean);
 if(input.response_type!=='code'||input.code_challenge_method!=='S256'||!/^[-_A-Za-z0-9]{43}$/.test(input.code_challenge||'')||input.resource!==origin+'/mcp'||requested.some(s=>!scopes.includes(s))||!requested.includes('webfactory.read'))throw oauthError('Invalid OAuth request. PKCE S256 and the exact MCP resource are required.');
 if(typeof input.state!=='string'||input.state.length<1||input.state.length>2000)throw oauthError('OAuth state is required.');
 const requestId=randomToken();await setNew(store,key('requests',requestId),{clientId:client.client_id,redirectUri:input.redirect_uri,state:input.state,challenge:input.code_challenge,resource:input.resource,scopes:requested,origin,expiresAt:now+600000});return requestId;
}
export async function consent(store,requestId,user,{siteId='',platform=false,allowWrites=false,allowExecute=false},now=Date.now()){
 const requestKey=key('requests',requestId),stored=await store.getWithMetadata(requestKey,json),request=stored?.data;
 if(!request||request.used||request.expiresAt<now)throw oauthError('Authorization request expired.',409);
 if(!user?.id||!user?.email||(!platform&&!siteId))throw oauthError('Choose an authorized business.',403);
 const grantId=crypto.randomUUID(),code=randomToken();
 const grant={id:grantId,userId:user.id,email:user.email.toLowerCase(),siteId:platform?'':siteId,platform,scopes:request.scopes.filter(s=>s==='webfactory.read'||s==='webfactory.propose'&&allowWrites||s==='webfactory.execute'&&allowExecute&&allowWrites),clientId:request.clientId,resource:request.resource,origin:request.origin,createdAt:now,expiresAt:now+30*86400000,revoked:false};
 const claimed=await store.setJSON(requestKey,{...request,used:true},{onlyIfMatch:stored.etag});if(!claimed.modified)throw oauthError('Authorization request already used.',409);
 await setNew(store,key('grants',grantId),grant);
 await setNew(store,`chatgpt/users/${hash(user.id)}/${grantId}.json`,{userId:user.id,grantId});
 await setNew(store,key('codes',code),{grantId,challenge:request.challenge,redirectUri:request.redirectUri,clientId:request.clientId,resource:request.resource,expiresAt:now+300000,used:false});
 const redirect=new URL(request.redirectUri);redirect.searchParams.set('code',code);redirect.searchParams.set('state',request.state);redirect.searchParams.set('iss',request.origin);return {redirect:redirect.href,grant};
}
export async function getGrant(store,id,now=Date.now()) {const grant=await store.get(key('grants',id),json);if(!grant||grant.revoked||grant.expiresAt<=now)throw oauthError('Connection revoked or expired.',401);return grant;}
export async function revokeGrant(store,id){const k=key('grants',id),old=await store.getWithMetadata(k,json);if(old){const result=await store.setJSON(k,{...old.data,revoked:true},{onlyIfMatch:old.etag});if(!result.modified)throw oauthError('Connection changed. Retry revocation.',409);}}
export async function exchangeToken(store,input,origin,now=Date.now()) {
 if(input.resource!==origin+'/mcp')throw oauthError('Invalid resource.');
 let source,sourceKey;
 if(input.grant_type==='authorization_code')sourceKey=key('codes',input.code);
 else if(input.grant_type==='refresh_token')sourceKey=key('refresh',input.refresh_token);
 else throw oauthError('Unsupported grant type.');
 const saved=await store.getWithMetadata(sourceKey,json);source=saved?.data;
 if(!source||source.expiresAt<=now||source.clientId!==input.client_id||source.resource!==input.resource)throw oauthError('Invalid grant.',400);
 if(source.used){if(input.grant_type==='refresh_token')await revokeGrant(store,source.grantId);throw oauthError('Grant already used.',400);}
 if(input.grant_type==='authorization_code'&&(!/^[A-Za-z0-9._~-]{43,128}$/.test(input.code_verifier||'')||crypto.createHash('sha256').update(input.code_verifier).digest('base64url')!==source.challenge||source.redirectUri!==input.redirect_uri))throw oauthError('Invalid PKCE verifier or redirect.');
 const grant=await getGrant(store,source.grantId,now);
 if(input.scope&&input.scope.split(' ').some(s=>!grant.scopes.includes(s)))throw oauthError('Scope escalation denied.');
 const claimed=await store.setJSON(sourceKey,{...source,used:true},{onlyIfMatch:saved.etag});if(!claimed.modified)throw oauthError('Grant already used.');
 const access=randomToken(),refresh=randomToken();
 const common={grantId:grant.id,clientId:grant.clientId,resource:grant.resource};
 await setNew(store,key('access',access),{...common,expiresAt:Math.min(now+900000,grant.expiresAt)});
 await setNew(store,key('refresh',refresh),{...common,expiresAt:grant.expiresAt,used:false});
 return {access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:Math.min(900,Math.floor((grant.expiresAt-now)/1000)),scope:grant.scopes.join(' ')};
}
export async function authenticateToken(store,header,origin,now=Date.now()){
 if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(header||''))throw oauthError('Authentication required.',401);
 const token=await store.get(key('access',header.slice(7)),json);
 if(!token||token.expiresAt<=now||token.resource!==origin+'/mcp')throw oauthError('Invalid access token.',401);
 const grant=await getGrant(store,token.grantId,now);
 if(grant.resource!==token.resource||grant.clientId!==token.clientId)throw oauthError('Invalid token audience.',401);
 return grant;
}

export async function revokeExecute(store,id){
 const k=key('grants',id),old=await store.getWithMetadata(k,json);
 if(!old)throw oauthError('Connection unavailable.',404);
 const result=await store.setJSON(k,{...old.data,scopes:old.data.scopes.filter(s=>s!=='webfactory.execute')},{onlyIfMatch:old.etag});
 if(!result.modified)throw oauthError('Connection changed. Retry revocation.',409);
}
