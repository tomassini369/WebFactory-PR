import {oauthError} from './chatgpt-oauth.mjs';
import {shadcnCatalog} from './chatgpt-shadcn.mjs';

const slug=/^[a-z0-9][a-z0-9-]{0,99}$/;
const packageName=/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const packageRoot=value=>value.startsWith('@')?value.split('/').slice(0,2).join('/'):value.split('/')[0];
export function parseComponentNames(value){
 const names=typeof value==='string'?value.split(',').map(name=>name.trim()):value;
 if(!Array.isArray(names)||names.length<1||names.length>10||!names.every(name=>typeof name==='string'&&slug.test(name)))throw oauthError('Choose 1–10 official Shadcn component names.',400);
 return [...new Set(names)].sort();
}

/** Create complete, bounded file changes; never execute registry code or accept arbitrary patches. */
export async function planShadcnComponents(names,{catalog=shadcnCatalog}={}){
 names=parseComponentNames(names);
 const seen=new Set(),files=new Map(),packages=new Set(['class-variance-authority','clsx','tailwind-merge']);
 let bytes=0;
 async function visit(name){
  if(seen.has(name))return;seen.add(name);
  if(seen.size>30)throw oauthError('Too many transitive components. Add a smaller selection.',400);
  const item=await catalog.item(name);
  // Pages/blocks, CSS, environment variables and remote registry dependencies require a dedicated adapter.
  if(!['registry:ui','registry:hook','registry:lib'].includes(item.type)||item.css||item.cssVars||item.envVars||item.tailwind)throw oauthError('This item requires manual layout or CSS integration; choose a UI component.',400);
  for(const dependency of item.registryDependencies||[]){if(typeof dependency!=='string'||!slug.test(dependency))throw oauthError('External registry dependencies are not supported.',400);await visit(dependency);}
  for(const dependency of [...(item.dependencies||[]),...(item.devDependencies||[])]){
   if(dependency==='cn')continue;
   if(typeof dependency!=='string'||!packageName.test(dependency))throw oauthError('Unsupported package dependency.',400);
   packages.add(dependency);
  }
  for(const file of item.files){
   const type=file.type;
   const match=file.path.match(/^registry\/new-york-v4\/(ui|hooks|lib)\/([a-z0-9][a-z0-9-]*\.(?:tsx|ts))$/);
   if(!match||!['registry:ui','registry:hook','registry:lib'].includes(type))throw oauthError('Unsupported registry file path.',400);
   const path=`src/${match[1]==='ui'?'components/ui':match[1]}/${match[2]}`;
   if(path==='src/lib/utils.ts')continue; // Local, audited cn adapter is maintained by WebFactory.
   let content=file.content.replace(/from (["'])cn\1/g,'from "@/lib/utils"').replaceAll('@/registry/new-york-v4/ui/','@/components/ui/').replaceAll('@/registry/new-york-v4/hooks/','@/hooks/').replaceAll('@/registry/new-york-v4/lib/','@/lib/');
   // Registry metadata may omit packages referenced by the source (e.g. cva).
   for(const match of content.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g)){
    const specifier=match[2];if(specifier.startsWith('@/')||specifier.startsWith('.'))continue;
    const root=packageRoot(specifier);
    if(!packageName.test(root))throw oauthError('Unsupported module import.',400);
    if(!['react','react-dom'].includes(root))packages.add(root);
   }
   if(files.has(path)&&files.get(path)!==content)throw oauthError('Conflicting component files.',409);
   if(!files.has(path))bytes+=Buffer.byteLength(content);
   if(files.size>=80||bytes>500000)throw oauthError('Component changes are too large.',413);
   files.set(path,content);
  }
 }
 for(const name of names)await visit(name);
 if(packages.size>60)throw oauthError('Too many package dependencies.',400);
 return {repository:'tomassini369/WebFactory-PR',base:'main',components:names,resolvedComponents:[...seen].sort(),dependencies:[...packages].sort(),files:[...files].map(([path,content])=>({path,content})),scope:'Add component source and dependencies; existing screens require explicit integration. Wrap adopted components in .wf-shadcn. No automatic production publication.'};
}
