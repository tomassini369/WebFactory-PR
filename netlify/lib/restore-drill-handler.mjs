import { assertSameOrigin } from './client-auth.mjs';
import { readAuthPayload,authJson } from './auth-gateway.mjs';
import { createBackupDrillFixture } from './backup-drill-fixture.mjs';
import { MAX_BACKUP_BYTES,runRestoreDrill } from './backup-recovery.mjs';
export function createRestoreDrillHandler({authorize,createStore}){
  return async(req,context)=>{
    if(req.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST','Cache-Control':'no-store'}});
    try{
      if(context.deploy?.context!=='deploy-preview'||context.deploy?.published)throw Object.assign(new Error('Restore drills are available only in a deploy preview.'),{status:403});
      assertSameOrigin(req);await authorize();
      const payload=await readAuthPayload(req,MAX_BACKUP_BYTES);
      const synthetic=payload?.mode==='synthetic';
      if(payload?.mode!==undefined&&(!synthetic||Object.keys(payload).length!==1))throw Object.assign(new Error('Invalid restore drill mode.'),{status:400});
      const backup=synthetic?createBackupDrillFixture():payload;
      const report=await runRestoreDrill(backup,createStore());
      return authJson({...report,source:synthetic?'synthetic-fixture':'uploaded-backup',deployContext:context.deploy.context,deployId:context.deploy.id||'',completedAt:new Date().toISOString()});
    }catch(error){return authJson({ok:false,message:[400,403,409,413,415].includes(error?.status)?error.message||'Invalid backup.':'Restore drill failed.'},[400,401,403,409,413,415,503].includes(error?.status)?error.status:503);}
  };
}
