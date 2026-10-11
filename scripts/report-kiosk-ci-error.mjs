import {readFileSync} from 'node:fs';
const [path,phase]=process.argv.slice(2);
if(!path||!['build','chromium','webkit'].includes(phase))throw Error('Select a kiosk QA log and phase.');
const text=readFileSync(path,'utf8').split('\n').slice(-60).join('\n')
 .replace(/([#?]pair=)[^\s)]+/g,'$1[redacted]')
 .replace(/(__Host-wf-kiosk=)[^;\s]+/g,'$1[redacted]')
 .replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
console.error(`::error title=Kiosk QA ${phase}::${text}`);
