import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {planShadcnComponents} from '../netlify/lib/shadcn-components.mjs';

const plan=await planShadcnComponents(process.argv[2]);
// Validate all collisions before writing a single file. Never overwrite customized components.
for(const file of plan.files){
 let old;try{old=await readFile(file.path,'utf8')}catch(error){if(error.code!=='ENOENT')throw error;}
 if(old!==undefined&&old!==file.content)throw Error(`Existing component needs review: ${file.path}`);
}
const pkg=JSON.parse(await readFile('package.json','utf8'));
for(const name of plan.dependencies){
 if(pkg.dependencies?.[name]||pkg.devDependencies?.[name])continue;
 // Resolve and pin a registry version; never accept URLs, scripts or caller-supplied versions.
 const response=await fetch('https://registry.npmjs.org/'+encodeURIComponent(name)+'/latest',{redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error(`Package unavailable: ${name}`);
 const data=await response.json();
 if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(data.version))throw Error(`Invalid package version: ${name}`);
 pkg.dependencies||={};pkg.dependencies[name]=data.version;
}
for(const file of plan.files){await mkdir(dirname(file.path),{recursive:true});await writeFile(file.path,file.content);}
await writeFile('package.json',JSON.stringify(pkg,null,2)+'\n');
console.log(JSON.stringify({components:plan.components,files:plan.files.map(file=>file.path),dependencies:plan.dependencies}));
