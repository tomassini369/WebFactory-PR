import { getDeployStore } from '@netlify/blobs';
import { requirePlatformAdmin } from '../lib/client-auth.mjs';
import { createRestoreDrillHandler } from '../lib/restore-drill-handler.mjs';
export default createRestoreDrillHandler({authorize:requirePlatformAdmin,createStore:()=>getDeployStore('webfactory-backup-drills',{consistency:'strong'})});
export const config={rateLimit:{windowLimit:3,windowSize:180,aggregateBy:['ip']}};
