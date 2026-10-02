import crypto from 'node:crypto';
import { getStore, getDeployStore } from '@netlify/blobs';
import { withBookingLock } from './booking-lock.mjs';

export const PRIMARY_COOKIE='__Host-wf-session';
export const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
export const userPrefix=user=>`users/${hash(user.id)}/`;
export function mfaStore(){return globalThis.Netlify?.context?.deploy?.context==='production' ? getStore('webfactory-auth-security',{consistency:'strong'}) : getDeployStore('webfactory-auth-security',{consistency:'strong'});}
export function mfaRequiredByPolicy(){return globalThis.Netlify?.env?.get('WEBFACTORY_REQUIRE_MFA')==='true'||globalThis.Netlify?.context?.deploy?.context==='deploy-preview';}
const reject=(message='Second-factor verification required.',status=401)=>Object.assign(new Error(message),{status});
const sessionKey=(user,token)=>`${userPrefix(user)}sessions/${hash(token)}.json`;
const profileKey=user=>`${userPrefix(user)}profile.json`;

export async function issuePrimarySession(user,context,store=mfaStore(),now=Date.now()){
  if(!user?.id||!user?.email)throw reject();
  const token=crypto.randomBytes(32).toString('base64url');
  await store.setJSON(sessionKey(user,token),{issuedAt:now,expiresAt:now+8*3600000,userId:user.id});
  context.cookies.set({name:PRIMARY_COOKIE,value:token,httpOnly:true,secure:true,sameSite:'Lax',path:'/',maxAge:8*3600});
}

export async function securityState(user,context,store=mfaStore(),mandatory=mfaRequiredByPolicy(),now=Date.now()){
  if(!user?.id)return {required:false,enrolled:false,verified:false,needsLogin:false};
  const token=context?.cookies?.get(PRIMARY_COOKIE);
  const [profile,session]=await Promise.all([store.get(profileKey(user),{type:'json'}),token ? store.get(sessionKey(user,token),{type:'json'}) : null]);
  const enrolled=Boolean(profile?.credentials?.length);
  const validSession=session?.userId===user.id&&session.expiresAt>now;
  const verified=Boolean(validSession&&enrolled&&session.verifiedAt&&session.version===profile.version);
  return {required:Boolean(mandatory||enrolled),enrolled,verified,needsLogin:!validSession,credentials:(profile?.credentials||[]).map(({id,label,createdAt})=>({id,label,createdAt})),recoveryCodesRemaining:profile?.codes?.length||0};
}

export async function assertSecondFactor(user,context=globalThis.Netlify?.context,store=mfaStore(),mandatory=mfaRequiredByPolicy()){
  const state=await securityState(user,context,store,mandatory);
  if(state.required&&!state.verified)throw reject();
}

export async function revokePrimarySession(user,context,store=mfaStore()){
  const token=context.cookies.get(PRIMARY_COOKIE);
  if(user?.id&&token)await withBookingLock(store,`${userPrefix(user)}lock`,()=>store.delete(sessionKey(user,token)));
  context.cookies.delete({name:PRIMARY_COOKIE,path:'/'});
}

export async function purgeAccountSecurity(user,store=mfaStore()){
  const {blobs}=await store.list({prefix:userPrefix(user)});
  for(const {key} of blobs)await store.delete(key);
}

export function createMfaService(store,webAuthn,now=()=>Date.now()){
  async function sessionFor(user,context){
    const token=context.cookies.get(PRIMARY_COOKIE);
    const key=token&&sessionKey(user,token);
    const session=key&&await store.get(key,{type:'json'});
    if(!session||session.userId!==user.id||session.expiresAt<=now())throw reject('Sign in again before verifying security.');
    return {key,session,token};
  }
  async function grant(key,session,profile){await store.setJSON(key,{...session,version:profile.version,verifiedAt:now()});}
  async function freshProof(user,context,profile){
    const current=await sessionFor(user,context);
    if(!profile||!current.session.verifiedAt||current.session.verifiedAt+300000<now()||current.session.version!==profile.version)throw reject('Verify your passkey or recovery code again.');
    return current;
  }
  async function consume(user,context,id,kind,origin){
    if(typeof id!=='string'||!/^[-a-zA-Z0-9_]{43}$/.test(id))throw reject();
    const {token}=await sessionFor(user,context);
    const key=`${userPrefix(user)}challenges/${id}.json`;
    const record=await store.getWithMetadata(key,{type:'json'});
    if(!record||record.data.consumed||record.data.expiresAt<=now()||record.data.primaryHash!==hash(token)||record.data.kind!==kind||record.data.origin!==origin)throw reject('Security challenge expired or invalid.');
    const result=await store.setJSON(key,{...record.data,consumed:true},{onlyIfMatch:record.etag});
    if(!result.modified)throw reject('Security challenge already used.');
    return record.data;
  }
  async function options(user,context,kind,origin){
    const current=await sessionFor(user,context);
    const profile=await store.get(profileKey(user),{type:'json'});
    if(kind==='register'){
      if(profile?.credentials?.length)await freshProof(user,context,profile);
      else if(current.session.issuedAt+300000<now())throw reject('Sign in again before setting up security.');
      if((profile?.credentials?.length||0)>=5)throw reject('Up to five passkeys are supported.',400);
    }else if(!profile?.credentials?.length)throw reject('Set up a passkey first.',400);
    if(profile?.origin&&profile.origin!==origin)throw reject('Use the original portal address for this passkey.',403);
    const rpID=new URL(origin).hostname;
    const credentials=profile?.credentials||[];
    const data=kind==='register' ? await webAuthn.generateRegistrationOptions({rpName:'WebFactory PR',rpID,userName:user.email,userID:new Uint8Array(Buffer.from(hash(user.id),'hex')),attestationType:'none',authenticatorSelection:{residentKey:'preferred',userVerification:'required'},excludeCredentials:credentials.map(({id,transports})=>({id,transports})),timeout:60000}) : await webAuthn.generateAuthenticationOptions({rpID,userVerification:'required',allowCredentials:credentials.map(({id,transports})=>({id,transports})),timeout:60000});
    const id=crypto.randomBytes(32).toString('base64url');
    await store.setJSON(`${userPrefix(user)}challenges/${id}.json`,{challenge:data.challenge,kind,origin,primaryHash:hash(current.token),version:profile?.version||null,expiresAt:now()+300000});
    return {options:data,challengeId:id};
  }
  async function verify(user,context,payload,kind,origin){
    const challenge=await consume(user,context,payload.challengeId,kind,origin);
    return withBookingLock(store,`${userPrefix(user)}lock`,async()=>{
      let profile=await store.get(profileKey(user),{type:'json'});
      if((profile?.version||null)!==challenge.version)throw reject('Security settings changed. Try again.');
      const current=await sessionFor(user,context);
      const rpID=new URL(origin).hostname;
      let codes;
      if(kind==='register'){
        if(profile?.credentials?.length)await freshProof(user,context,profile);
        else if(current.session.issuedAt+300000<now())throw reject('Sign in again before setting up security.');
        const result=await webAuthn.verifyRegistrationResponse({response:payload.response,expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
        if(!result.verified||!result.registrationInfo?.userVerified)throw reject();
        const info=result.registrationInfo,credential=info.credential;
        if(profile?.credentials?.some(c=>c.id===credential.id))throw reject('Passkey already registered.',400);
        if((profile?.credentials?.length||0)>=5)throw reject('Up to five passkeys are supported.',400);
        if(!profile){codes=Array.from({length:10},()=>crypto.randomBytes(16).toString('hex'));profile={version:crypto.randomUUID(),origin,credentials:[],codes:codes.map(hash)};}
        profile.credentials.push({id:credential.id,publicKey:Buffer.from(credential.publicKey).toString('base64url'),counter:credential.counter,transports:credential.transports,label:String(payload.label||'Passkey').slice(0,80),createdAt:new Date(now()).toISOString()});
      }else{
        const stored=profile?.credentials.find(c=>c.id===payload.response?.id);
        if(!stored)throw reject();
        const result=await webAuthn.verifyAuthenticationResponse({response:payload.response,expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true,credential:{...stored,publicKey:new Uint8Array(Buffer.from(stored.publicKey,'base64url'))}});
        if(!result.verified||!result.authenticationInfo.userVerified)throw reject();
        stored.counter=result.authenticationInfo.newCounter;
      }
      await store.setJSON(profileKey(user),profile);
      await grant(current.key,current.session,profile);
      return {ok:true,...(codes?{recoveryCodes:codes}:{})};
    });
  }
  async function recover(user,context,code){
    if(typeof code!=='string'||!/^[a-fA-F0-9]{32}$/.test(code.trim()))throw reject('Invalid recovery code.');
    return withBookingLock(store,`${userPrefix(user)}lock`,async()=>{
      const current=await sessionFor(user,context);
      const profile=await store.get(profileKey(user),{type:'json'});
      const index=profile?.codes?.indexOf(hash(code.trim().toLowerCase()))??-1;
      if(index<0)throw reject('Invalid recovery code.');
      profile.codes.splice(index,1);
      await store.setJSON(profileKey(user),profile);
      await grant(current.key,current.session,profile);
      return {ok:true};
    });
  }
  async function remove(user,context,id){
    return withBookingLock(store,`${userPrefix(user)}lock`,async()=>{
      const profile=await store.get(profileKey(user),{type:'json'});
      const current=await freshProof(user,context,profile);
      if(profile.credentials.length<=1)throw reject('Add a replacement passkey before removing the last one.',400);
      if(!profile.credentials.some(c=>c.id===id))throw reject('Passkey not found.',404);
      profile.credentials=profile.credentials.filter(c=>c.id!==id);
      profile.version=crypto.randomUUID();
      await store.setJSON(profileKey(user),profile);
      await grant(current.key,current.session,profile);
      return {ok:true};
    });
  }
  async function rotateCodes(user,context){
    return withBookingLock(store,`${userPrefix(user)}lock`,async()=>{
      const profile=await store.get(profileKey(user),{type:'json'});
      const current=await freshProof(user,context,profile);
      const codes=Array.from({length:10},()=>crypto.randomBytes(16).toString('hex'));
      profile.codes=codes.map(hash);profile.version=crypto.randomUUID();
      await store.setJSON(profileKey(user),profile);
      await grant(current.key,current.session,profile);
      return {ok:true,recoveryCodes:codes};
    });
  }
  return {options,verify,recover,remove,rotateCodes};
}
