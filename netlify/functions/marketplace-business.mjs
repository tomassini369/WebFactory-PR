import {getClientSiteBySlug} from '../lib/client-store.mjs';
import {directoryEntry} from '../lib/marketplace.mjs';
export default async req=>{
 const headers={'Cache-Control':'no-store'};
 if(req.method!=='GET')return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});
 const slug=new URL(req.url).searchParams.get('slug')||'';
 if(slug.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return Response.json({ok:false},{status:404,headers});
 try{const business=directoryEntry(await getClientSiteBySlug(slug));return Response.json({ok:Boolean(business),business},{status:business?200:404,headers})}
 catch{return Response.json({ok:false},{status:503,headers})}
};
export const config={rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip']}};
