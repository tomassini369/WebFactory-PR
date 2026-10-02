import type { User as IdentityUser } from '@netlify/identity'
export type User=IdentityUser & {mfa?:{required:boolean;enrolled:boolean;verified:boolean;needsLogin:boolean;credentials?:Array<{id:string;label:string;createdAt:string}>;recoveryCodesRemaining?:number}}

type AuthResult={ok:boolean;user?:User|null}
const listeners=new Set<(event:string,user:User|null)=>void>()
let recoveryToken=''
let callbackResult:{type:'invite'|'recovery';token:string;user:null}|null=null
let authRevision=0
let remoteLoginPending=false
let sessionRead:Promise<User|null>|null=null
let timer:number|undefined
let channel:BroadcastChannel|undefined
const notify=(event:string,user:User|null)=>listeners.forEach(listener=>listener(event,user))

function clearLegacySession() {
  try { localStorage.removeItem('gotrue.user') } catch { /* Storage may be blocked. */ }
}

async function authRequest(path:string,payload?:Record<string,string>):Promise<AuthResult> {
  const response=await fetch(`/.netlify/functions/${path}`, {
    method:payload?'POST':'GET', credentials:'same-origin', cache:'no-store',
    ...(payload?{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{}),
  })
  if(!response.ok)throw new Error('Unable to complete authentication. Please try again later.')
  return response.json() as Promise<AuthResult>
}

function broadcast(event:string,user:User|null) {
  notify(event,user)
  channel?.postMessage({event}) // No user data or tokens are broadcast across tabs.
}

export async function getUser():Promise<User|null> {
  if(sessionRead)return sessionRead
  clearLegacySession()
  const revision=authRevision
  const read=async()=>{
    await authRequest('portal-session',{action:'refresh'})
    const result=await authRequest('portal-session')
    return revision===authRevision ? result.user||null : null
  }
  // Serialize renewal across tabs when Web Locks is available.
  sessionRead=(async()=>navigator.locks ? await navigator.locks.request('webfactory-auth-refresh',read) : await read())()
  try {return await sessionRead} finally {sessionRead=null}
}

export async function login(email:string,password:string):Promise<User> {
  // Password submissions are never automatically retried.
  await authRequest('portal-login',{email,password})
  authRevision++
  clearLegacySession()
  const result=await authRequest('portal-session')
  if(!result.user)throw new Error('Unable to restore authentication. Please try again later.')
  broadcast('login',result.user)
  return result.user
}

export async function logout():Promise<void> {
  await authRequest('portal-session',{action:'logout'})
  authRevision++
  recoveryToken=''
  callbackResult=null
  clearLegacySession()
  broadcast('logout',null)
}

export async function requestPasswordRecovery(email:string):Promise<void> {
  await authRequest('portal-recovery',{email})
}

export async function handleAuthCallback():Promise<{type:'invite'|'recovery';token:string;user:null}|null> {
  const params=new URLSearchParams(window.location.hash.slice(1))
  const invite=params.get('invite_token')
  const recovery=params.get('recovery_token')
  if(!invite&&!recovery)return callbackResult
  // Email link secrets are held only in memory until submission, never stored.
  history.replaceState(null,'',window.location.pathname+window.location.search)
  clearLegacySession()
  if(invite)return callbackResult={type:'invite',token:invite,user:null}
  recoveryToken=recovery!
  return callbackResult={type:'recovery',token:recovery!,user:null}
}

async function completeAccess(action:'invite'|'recovery',token:string,password:string):Promise<User> {
  await authRequest('portal-complete-access',{action,token,password})
  const result=await authRequest('portal-session')
  if(!result.user)throw new Error('Unable to complete access.')
  authRevision++
  clearLegacySession()
  recoveryToken=''
  callbackResult=null
  broadcast('login',result.user)
  return result.user
}

export const acceptInvite=(token:string,password:string)=>completeAccess('invite',token,password)
export async function updateUser(updates:{password:string}):Promise<User> {
  if(!recoveryToken)throw new Error('A valid recovery link is required.')
  return completeAccess('recovery',recoveryToken,updates.password)
}

async function syncSession() {
  if(document.visibilityState!=='visible')return
  const revision=authRevision
  try {
    const user=await getUser()
    if(revision===authRevision) {
      const event=remoteLoginPending?'login_remote':'token_refresh'
      remoteLoginPending=false
      notify(user?event:'logout',user)
    }
  } catch { /* Transient network failures do not imply logout. */ }
}

export function onAuthChange(callback:(event:string,user:User|null)=>void):()=>void {
  listeners.add(callback)
  if(listeners.size===1) {
    if(typeof BroadcastChannel!=='undefined') {
      channel=new BroadcastChannel('webfactory-auth')
      channel.onmessage=event=>{
        if(event.data?.event==='logout'||event.data?.event==='login') {
          authRevision++
          notify('logout',null)
          if(event.data.event==='login'){remoteLoginPending=true;void syncSession()}
        }
      }
    }
    timer=window.setInterval(()=>void syncSession(),30000)
    document.addEventListener('visibilitychange',syncSession)
  }
  return ()=>{
    listeners.delete(callback)
    if(!listeners.size) {
      window.clearInterval(timer);timer=undefined
      document.removeEventListener('visibilitychange',syncSession)
      channel?.close();channel=undefined
    }
  }
}

export async function refreshPortalUser(){const user=await getUser();broadcast('login',user);return user}
