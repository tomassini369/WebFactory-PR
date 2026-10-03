import {rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const output='dist/email-preview';
await rm(output,{recursive:true,force:true});
if(process.env.CONTEXT==='deploy-preview'){
  execFileSync(process.execPath,['scripts/preview-emails.mjs',output],{stdio:'inherit'});
}
