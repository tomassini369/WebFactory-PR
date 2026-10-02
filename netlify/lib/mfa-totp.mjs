import crypto from 'node:crypto';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const fail=()=>Object.assign(new Error('Authenticator security is unavailable.'),{status:503});
export const totpKeyValue=()=>globalThis.Netlify?.env?.get('WEBFACTORY_MFA_ENCRYPTION_KEY')||'';
function key(value){const bytes=Buffer.from(value,'base64');if(bytes.length!==32||bytes.toString('base64')!==value)throw fail();return bytes;}
export function totpAvailable(){try{key(totpKeyValue());return true}catch{return false}}
export function encodeBase32(bytes){let bits=0,value=0,result='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){bits-=5;result+=alphabet[(value>>>bits)&31]}}if(bits)result+=alphabet[(value<<(5-bits))&31];return result;}
function decodeBase32(secret){if(!/^[A-Z2-7]{32}$/.test(secret))throw fail();let bits=0,value=0;const bytes=[];for(const char of secret){value=(value<<5)|alphabet.indexOf(char);bits+=5;if(bits>=8){bits-=8;bytes.push((value>>>bits)&255)}}return Buffer.from(bytes);}
export function newTotpSecret(){return encodeBase32(crypto.randomBytes(20));}
export function totpCode(secret,step,digits=6){
  if(!Number.isSafeInteger(step)||step<0||![6,8].includes(digits))throw fail();
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(step));
  const digest=crypto.createHmac('sha1',decodeBase32(secret)).update(counter).digest(),offset=digest.at(-1)&15;
  return String((digest.readUInt32BE(offset)&0x7fffffff)%10**digits).padStart(digits,'0');
}
export function matchingTotpStep(secret,code,now,lastUsedStep=-1){
  if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;
  const current=Math.floor(now/30000);let matched=null;
  for(const step of [current,current-1,current+1]){
    if(step<0)continue;
    if(crypto.timingSafeEqual(Buffer.from(totpCode(secret,step)),Buffer.from(code))&&step>lastUsedStep&&matched===null)matched=step;
  }
  return matched;
}
export function encryptTotp(secret,userId,origin,keyValue){
  decodeBase32(secret);const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(keyValue),iv);
  cipher.setAAD(Buffer.from(JSON.stringify(['webfactory-totp-v1',userId,origin])));
  const data=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
  return {version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};
}
export function decryptTotp(record,userId,origin,keyValue){
  try{
    if(record?.version!==1)throw fail();
    const decipher=crypto.createDecipheriv('aes-256-gcm',key(keyValue),Buffer.from(record.iv,'base64'));
    decipher.setAAD(Buffer.from(JSON.stringify(['webfactory-totp-v1',userId,origin])));decipher.setAuthTag(Buffer.from(record.tag,'base64'));
    const secret=Buffer.concat([decipher.update(Buffer.from(record.data,'base64')),decipher.final()]).toString('utf8');decodeBase32(secret);return secret;
  }catch{throw fail()}
}
export function totpUri(secret,email,origin){const issuer=`WebFactory PR (${new URL(origin).hostname})`;return `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;}
