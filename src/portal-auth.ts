async function postAuth(path:string, payload:Record<string,string>) {
  const response=await fetch(`/.netlify/functions/${path}`, {
    method:'POST', credentials:'same-origin', cache:'no-store',
    headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload),
  })
  if(!response.ok)throw new Error('Unable to complete authentication. Please try again later.')
}

export async function login(email:string,password:string):Promise<never> {
  // Password submissions are never automatically retried.
  await postAuth('portal-login',{email,password})
  // A full navigation restores the SDK from the newly issued cookies and avoids
  // reusing an older in-memory account after accepting an invitation.
  try { localStorage.removeItem('gotrue.user') } catch { /* Storage may be blocked. */ }
  const destination=/^\/client-admin\/?$/.test(window.location.pathname) ? '/client-admin' : '/webfactory-admin'
  window.location.assign(destination)
  return new Promise<never>(()=>{})
}

export async function requestPasswordRecovery(email:string):Promise<void> {
  await postAuth('portal-recovery',{email})
}
