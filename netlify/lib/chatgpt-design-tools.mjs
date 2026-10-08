import {oauthError} from './chatgpt-oauth.mjs';

const PROVIDERS={
 stitch:{
  endpoint:'https://stitch.googleapis.com/mcp',
  env:'STITCH_API_KEY',
  authHeader:'X-Goog-Api-Key',
  read:new Set(['list_projects','get_project','list_screens','get_screen','list_design_systems']),
  write:new Set(['create_project','generate_screen_from_text','edit_screens','generate_variants','create_design_system','update_design_system','apply_design_system'])
 },
 '21st':{
  endpoint:'https://21st.dev/api/mcp',
  env:'API_KEY_21ST',
  authHeader:'x-api-key',
  read:new Set(['get_usage','search','get_component','get_inspiration','search_logo','get_generation','get_take']),
  write:new Set(['generate','iterate_generation'])
 }
};

const MAX_BODY=80000;
const READ_TIMEOUT_MS=20000;
const WRITE_TIMEOUT_MS=55000;

function env(name){
 return String(globalThis.Netlify?.env?.get?.(name)??process.env?.[name]??'').trim();
}

function providerConfig(provider){
 const config=PROVIDERS[provider];
 if(!config)throw oauthError('Unknown design provider.',400);
 const apiKey=env(config.env);
 return {...config,apiKey,configured:Boolean(apiKey)};
}

export function designProviderStatus(){
 return Object.fromEntries(Object.entries(PROVIDERS).map(([name,config])=>[name,{
  configured:Boolean(env(config.env)),
  readTools:[...config.read],
  writeTools:[...config.write]
 }]));
}

function parseMcpPayload(text){
 const trimmed=String(text||'').trim();
 if(!trimmed)return null;
 try{return JSON.parse(trimmed);}catch{}
 const events=[];
 for(const block of trimmed.split(/\r?\n\r?\n/)){
  for(const line of block.split(/\r?\n/)){
   if(!line.startsWith('data:'))continue;
   const data=line.slice(5).trim();
   if(!data||data==='[DONE]')continue;
   try{events.push(JSON.parse(data));}catch{}
  }
 }
 return events.at(-1)||null;
}

function sanitize(value,secrets=[]){
 const secretSet=secrets.filter(Boolean);
 const walk=(v,depth=0)=>{
  if(depth>12)return null;
  if(Array.isArray(v))return v.slice(0,200).map(x=>walk(x,depth+1));
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v)
   .filter(([k])=>!/(?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|secret|credential)/i.test(k))
   .map(([k,val])=>[k,walk(val,depth+1)]));
  if(typeof v==='string'){
   let out=v.slice(0,30000);
   for(const secret of secretSet)if(secret.length>=8)out=out.split(secret).join('[REDACTED]');
   return out;
  }
  return v;
 };
 return walk(value);
}

async function postJsonRpc(config,payload,sessionId='',timeoutMs=READ_TIMEOUT_MS,{allowEmpty=false}={}){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const headers={
   'Content-Type':'application/json',
   'Accept':'application/json, text/event-stream',
   [config.authHeader]:config.apiKey
  };
  if(sessionId)headers['mcp-session-id']=sessionId;
  const response=await fetch(config.endpoint,{
   method:'POST',
   headers,
   body:JSON.stringify(payload),
   signal:controller.signal,
   redirect:'error',
   credentials:'omit'
  });
  const text=await response.text();
  if(text.length>MAX_BODY)throw oauthError('Design provider response exceeded the safe limit.',502);
  if(!response.ok){
   if(response.status===401||response.status===403)throw oauthError('Design provider credentials are invalid or no longer authorized.',503);
   if(response.status===429)throw oauthError('Design provider rate limit reached.',429);
   throw oauthError('Design provider is temporarily unavailable.',503);
  }
  if(!text){
   if(allowEmpty)return {response,payload:null};
   throw oauthError('Design provider returned an empty response.',502);
  }
  const parsed=parseMcpPayload(text);
  if(!parsed)throw oauthError('Design provider returned an invalid response.',502);
  if(parsed.error)throw oauthError(String(parsed.error?.message||'Design provider rejected the request.').slice(0,300),502);
  return {response,payload:parsed};
 }catch(error){
  if(error?.status)throw error;
  if(error?.name==='AbortError')throw oauthError('Design provider request timed out.',504);
  throw oauthError('Design provider is temporarily unavailable.',503);
 }finally{clearTimeout(timer);}
}

async function mcpCall(provider,toolName,args,write=false){
 const config=providerConfig(provider);
 if(!config.configured)throw oauthError(provider==='stitch'?'Stitch is not configured. Add STITCH_API_KEY in Netlify environment variables.':'21st.dev is not configured. Add API_KEY_21ST in Netlify environment variables.',503);
 const allowed=write?config.write:config.read;
 if(!allowed.has(toolName))throw oauthError('This design tool is not allowed through WebFactory.',403);

 const init=await postJsonRpc(config,{
  jsonrpc:'2.0',id:1,method:'initialize',
  params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'webfactory-design-gateway',version:'1.0.0'}}
 },'',READ_TIMEOUT_MS);
 const sessionId=init.response.headers.get('mcp-session-id')||'';
 await postJsonRpc(config,{jsonrpc:'2.0',method:'notifications/initialized'},sessionId,READ_TIMEOUT_MS,{allowEmpty:true});
 const call=await postJsonRpc(config,{
  jsonrpc:'2.0',id:2,method:'tools/call',
  params:{name:toolName,arguments:args||{}}
 },sessionId,write?WRITE_TIMEOUT_MS:READ_TIMEOUT_MS);
 const result=call.payload?.result;
 if(result?.isError){
  const message=(result.content||[]).find(x=>x?.type==='text')?.text||'Design provider tool failed.';
  throw oauthError(String(message).slice(0,300),502);
 }
 return sanitize(result,[config.apiKey]);
}

export async function callDesignTool({provider,toolName,args={},write=false}){
 return mcpCall(provider,toolName,args,write);
}
