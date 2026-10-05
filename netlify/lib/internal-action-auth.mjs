import { AsyncLocalStorage } from 'node:async_hooks';

// In-process delegation only: never populated from headers, cookies or payloads.
// The caller must validate the live OAuth grant and operation before entering.
const actionAuth = new AsyncLocalStorage();
export function withAuthorizedAction({user,siteId,platform},callback) {
  return actionAuth.run({user,siteId,platform,active:true},async()=>{
    try { return await callback(); }
    finally { actionAuth.getStore().active=false; }
  });
}
export function authorizedAction() {
  const context=actionAuth.getStore();
  return context?.active ? context : null;
}
