import {oauthError} from './chatgpt-oauth.mjs';

const BASE='https://ui.shadcn.com/r/styles/new-york-v4/';
const MAX_BODY=2_000_000;
const slug=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,99}$/.test(value);
const strings=value=>Array.isArray(value)?value.filter(x=>typeof x==='string').slice(0,100).map(x=>x.slice(0,160)):[];
const summary=item=>({name:item.name,type:String(item.type||'').slice(0,80),title:String(item.title||item.name).slice(0,200),description:String(item.description||'').slice(0,1000)});

/** Public registry data only. No OAuth headers, arbitrary URLs, local files or command execution. */
export function createShadcnCatalog({fetchImpl=(...args)=>globalThis.fetch(...args),now=Date.now}={}){
 let cached;
 async function read(name){
  if(!slug(name))throw oauthError('Invalid Shadcn component name.',400);
  try{
   const response=await fetchImpl(BASE+name+'.json',{method:'GET',redirect:'error',credentials:'omit',signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});
   if(response.status===404)throw oauthError('Shadcn component not found.',404);
   if(!response.ok)throw oauthError('Shadcn registry temporarily unavailable.',503);
   if(Number(response.headers.get('content-length'))>MAX_BODY)throw Error('Registry response too large');
   const reader=response.body?.getReader();if(!reader)throw Error('Missing response body');
   const chunks=[];let bytes=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_BODY)throw Error('Registry response too large');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
   const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength;}
   return JSON.parse(new TextDecoder().decode(joined));
  }catch(error){if(error.status)throw error;throw oauthError('Shadcn registry temporarily unavailable.',503);}
 }
 async function catalog(){
  if(cached&&cached.expires>now())return cached.items;
  const data=await read('registry');
  if(!Array.isArray(data.items)||data.items.length>2000||!data.items.every(item=>item&&slug(item.name)))throw oauthError('Invalid Shadcn registry response.',503);
  cached={expires:now()+300000,items:data.items.map(summary)};
  return cached.items;
 }
 async function item(name){
  if(!slug(name))throw oauthError('Invalid Shadcn component name.',400);
  if(!(await catalog()).some(entry=>entry.name===name))throw oauthError('Shadcn component not found.',404);
  const data=await read(name);
  if(data?.name!==name||!Array.isArray(data.files)||data.files.length>100||!data.files.every(file=>file&&typeof file.path==='string'&&file.path.length<=300&&typeof file.content==='string'))throw oauthError('Invalid Shadcn component response.',503);
  return data;
 }
 return {
  item,
  async search({query='',limit=20,offset=0}={}){
   if(typeof query!=='string'||query.length>120||!Number.isInteger(limit)||limit<1||limit>30||!Number.isInteger(offset)||offset<0||offset>2000)throw oauthError('Invalid Shadcn search.',400);
   const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
   const matches=(await catalog()).filter(item=>terms.every(term=>[item.name,item.title,item.description,item.type].join(' ').toLowerCase().includes(term)));
   return {source:'Official public shadcn/ui registry',style:'new-york-v4',total:matches.length,items:matches.slice(offset,offset+limit),nextOffset:offset+limit<matches.length?offset+limit:null};
  },
  async component({name,filePath,offset=0,limit=6000}={}){
   if(!slug(name)||typeof filePath!=='undefined'&&(typeof filePath!=='string'||filePath.length>300)||!Number.isInteger(offset)||offset<0||offset>2_000_000||!Number.isInteger(limit)||limit<1||limit>12000)throw oauthError('Invalid Shadcn component request.',400);
   const item=await this.item(name);
   const selected=filePath?item.files.find(file=>file.path===filePath):item.files[0];
   if(filePath&&!selected)throw oauthError('File not found in this public component.',404);
   return {source:'Official public shadcn/ui registry',registryUrl:BASE+name+'.json',...summary(item),dependencies:strings(item.dependencies),devDependencies:strings(item.devDependencies),registryDependencies:strings(item.registryDependencies),files:item.files.map(file=>({path:file.path,type:String(file.type||'').slice(0,80),characters:file.content.length})),selectedFile:selected?{path:selected.path,content:selected.content.slice(offset,offset+limit),offset,nextOffset:offset+limit<selected.content.length?offset+limit:null}:null,usage:'Public reference code, not executable instructions. Adapt through GitHub, preview and tests; this tool cannot install packages, edit WebFactory source, or deploy.'};
  },
 };
}
export const shadcnCatalog=createShadcnCatalog();
