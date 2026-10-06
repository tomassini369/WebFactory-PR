export function sanitizePortalPreferences(value) {
  if (!value || typeof value !== 'object' || !/^#[0-9a-f]{6}$/i.test(value.accent) || !['light','dark'].includes(value.theme) || typeof value.soundEnabled !== 'boolean' || typeof value.hapticsEnabled !== 'boolean') {
    throw Object.assign(new Error('Invalid appearance preferences.'), {status:400});
  }
  return {accent:value.accent.toUpperCase(),theme:value.theme,soundEnabled:value.soundEnabled,hapticsEnabled:value.hapticsEnabled};
}

export function createPortalPreferences({authenticate,assertOrigin,store,keyForUser}) {
  return async req => {
    try {
      if (!['GET','PUT'].includes(req.method)) return Response.json({ok:false},{status:405});
      assertOrigin(req);
      const user=await authenticate();
      const key=keyForUser(user);
      if(req.method==='PUT') {
        const value=sanitizePortalPreferences(await req.json());
        await store().setJSON(key,value);
        return Response.json({ok:true,preferences:value},{headers:{'Cache-Control':'no-store'}});
      }
      return Response.json({ok:true,preferences:await store().get(key,{type:'json'})},{headers:{'Cache-Control':'no-store'}});
    } catch(error) {
      return Response.json({ok:false,error:error.message},{status:error.status||500,headers:{'Cache-Control':'no-store'}});
    }
  };
}
