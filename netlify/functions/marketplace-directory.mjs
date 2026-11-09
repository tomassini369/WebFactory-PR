import {clientSiteStore} from '../lib/client-store.mjs';
import {readDirectory} from '../lib/marketplace.mjs';
export default async req=>{
 if(req.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
 try{return Response.json({ok:true,...await readDirectory(clientSiteStore())},{headers:{'Cache-Control':'public, max-age=15','Netlify-CDN-Cache-Control':'public, s-maxage=30','X-Content-Type-Options':'nosniff'}})}
 catch{return Response.json({ok:false,message:'Directory temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}})}
};
export const config={rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip']}};
