import {runPreviewBarberBuild} from '../../scripts/seed-preview-barber.mjs';

// Netlify provides the deploy-scoped Blobs context to plugin processes.
export const onPostBuild=async()=>{await runPreviewBarberBuild();};
