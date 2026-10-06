import {oauthError} from './chatgpt-oauth.mjs';

const DEFAULT_TIMEOUT_MS=8000;
const MAX_REMOTE_BODY=60000;
const PLATFORM_TOKEN_MAX=1600;
const TENANT_TOKEN_MAX=1000;
const DEFAULT_GRAPHIFY_MCP_URL='https://webfactory-graphify.onrender.com/mcp';

function env(name){
 return String(globalThis.Netlify?.env?.get?.(name)??process.env?.[name]??'').trim();
}

function endpointConfig(){
 const raw=env('GRAPHIFY_MCP_URL')||DEFAULT_GRAPHIFY_MCP_URL;
 const apiKey=env('GRAPHIFY_API_KEY');
 if(!raw||!apiKey)return null;
 let url;
 try{url=new URL(raw);}catch{return null;}
 const local=['localhost','127.0.0.1','::1'].includes(url.hostname);
 if(url.protocol!=='https:'&&!local)return null;
 if(url.username||url.password||url.search||url.hash)return null;
 return {url:url.toString(),apiKey};
}

export function graphifyAvailable({platform=false}={}){
 const base=endpointConfig();
 if(!base)return false;
 if(platform)return true;
 return Boolean(env('GRAPHIFY_TENANT_PROJECT_ROOT'));
}

function safeSiteId(siteId){
 const value=String(siteId||'');
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(value))throw oauthError('Graph context unavailable for this business.',400);
 return value;
}

export function graphifyProjectPath({platform=false,siteId}={}){
 if(platform)return env('GRAPHIFY_PLATFORM_PROJECT_PATH')||undefined;
 const root=env('GRAPHIFY_TENANT_PROJECT_ROOT').replace(/[\\/]+$/,'');
 if(!root)throw oauthError('Tenant graph context is not configured.',503);
 return root+'/'+safeSiteId(siteId);
}

export function shouldUseGraphify(question){
 const q=String(question||'').trim().toLowerCase();
 if(q.length<18)return false;
 const complex=[
  'why ','impact','depend','relation','architecture','flow','conflict','diagnos','troubleshoot','affected',
  'interact','analy','review how','trace','por qué','porque falla','impacto','depende','relación','arquitectura',
  'flujo','conflicto','diagnóst','diagnost','afecta','interact','analiza','analice','revisa cómo','rastre'
 ];
 if(complex.some(term=>q.includes(term)))return true;
 const systemTerms=['booking','calendar','oauth','stripe','inventory','employee','builder','template','portal','payment','email','mcp','tenant','reserva','calendario','inventario','empleado','pago','correo'];
 return systemTerms.filter(term=>q.includes(term)).length>=2;
}

async function postMcp(config,body,sessionId,{allowEmpty=false}={}){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),DEFAULT_TIMEOUT_MS);
 try{
  const headers={
   'Content-Type':'application/json',
   'Accept':'application/json, text/event-stream',
   'Authorization':'Bearer '+config.apiKey
  };
  if(sessionId)headers['mcp-session-id']=sessionId;
  const response=await fetch(config.url,{method:'POST',headers,body:JSON.stringify(body),signal:controller.signal});
  const text=await response.text();
  if(!response.ok)throw oauthError('Graph context service is unavailable.',502);
  if(text.length>MAX_REMOTE_BODY)throw oauthError('Graph context response exceeded the safe limit.',502);
  if(!text){
   if(allowEmpty)return {response,payload:null};
   throw oauthError('Graph context returned an empty response.',502);
  }
  let payload;
  try{payload=JSON.parse(text);}catch{throw oauthError('Graph context returned an invalid response.',502);}
  if(payload?.error)throw oauthError('Graph context service rejected the request.',502);
  return {response,payload};
 }catch(error){
  if(error?.status)throw error;
  if(error?.name==='AbortError')throw oauthError('Graph context service timed out.',504);
  throw oauthError('Graph context service is unavailable.',502);
 }finally{clearTimeout(timer);}
}

export async function queryGraphContext({question,mode='bfs',depth=2,tokenBudget,platform=false,siteId}={}){
 const config=endpointConfig();
 if(!config)throw oauthError('Graph context is not configured.',503);
 const normalized=String(question||'').trim();
 if(!normalized)throw oauthError('A graph context question is required.',400);
 if(normalized.length>800)throw oauthError('Graph context question is too long.',400);
 if(!shouldUseGraphify(normalized)){
  return {used:false,reason:'direct_tools_preferred',message:'Use WebFactory direct read/write tools for this simple request. Graph context was intentionally skipped to reduce unnecessary work.'};
 }
 const max=platform?PLATFORM_TOKEN_MAX:TENANT_TOKEN_MAX;
 const budget=Math.max(200,Math.min(max,Number(tokenBudget)||Math.min(max,platform?1200:800)));
 const graphDepth=Math.max(1,Math.min(4,Number(depth)||2));
 const graphMode=mode==='dfs'?'dfs':'bfs';
 const projectPath=graphifyProjectPath({platform,siteId});

 const init=await postMcp(config,{
  jsonrpc:'2.0',id:1,method:'initialize',
  params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'webfactory-graph-gateway',version:'1.0.0'}}
 });
 const sessionId=init.response.headers.get('mcp-session-id')||'';
 await postMcp(config,{jsonrpc:'2.0',method:'notifications/initialized'},sessionId,{allowEmpty:true});
 const argumentsValue={question:normalized,mode:graphMode,depth:graphDepth,token_budget:budget};
 if(projectPath)argumentsValue.project_path=projectPath;
 const call=await postMcp(config,{
  jsonrpc:'2.0',id:2,method:'tools/call',
  params:{name:'query_graph',arguments:argumentsValue}
 },sessionId);
 const result=call.payload?.result;
 if(result?.isError)throw oauthError('Graph context could not answer this request.',502);
 const text=(result?.content||[]).filter(x=>x?.type==='text').map(x=>String(x.text||'')).join('\n').trim();
 if(!text)throw oauthError('Graph context returned no usable context.',502);
 return {
  used:true,
  scope:platform?'platform-code':'tenant-context',
  mode:graphMode,
  depth:graphDepth,
  tokenBudget:budget,
  context:text.slice(0,24000)
 };
}
