import {readFileSync} from 'node:fs';
const [path,phase]=process.argv.slice(2);
if(!path||!['experience','build','chromium','webkit','capabilities-chromium','capabilities-webkit','public-link-chromium','public-link-webkit','workspace-chromium','workspace-webkit','admin-chromium','admin-webkit','pos-chromium','pos-webkit','training-chromium','training-webkit','auth-contrast-chromium','auth-contrast-webkit','accounting-chromium','accounting-webkit','portal-workspace','portal-menu','marketplace-chromium','marketplace-webkit','marketplace-preview-chromium','marketplace-preview-webkit'].includes(phase))throw Error('Select a browser QA log and phase.');
const text=readFileSync(path,'utf8').split('\n').slice(-60).join('\n')
 .replace(/([#?]pair=)[^\s)]+/g,'$1[redacted]')
 .replace(/([#?&]accountingInvite=)[^&\s)]+/g,'$1[redacted]')
 .replace(/(__Host-wf-kiosk=)[^;\s]+/g,'$1[redacted]')
 .replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
console.error(`::error title=Browser QA ${phase}::${text}`);
