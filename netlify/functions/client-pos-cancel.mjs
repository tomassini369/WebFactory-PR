import {assertSameOrigin,requireSiteCapability,errorResponse} from '../lib/client-auth.mjs';
import {assertOwnPosRecord} from '../lib/commercial-access.mjs';
import {cancelPendingCheckout} from '../lib/cancel-pending-checkout.mjs';
export default async req=>{try{
 if(req.method!=='POST')return new Response(null,{status:405});assertSameOrigin(req);
 const input=await req.json();const {site,membership,user}=await requireSiteCapability(input.siteId,'pos');
 await cancelPendingCheckout(site,input.transactionId,{requestUrl:req.url,authorize:row=>{if(row.source!=='pos_remote')throw Object.assign(new Error('POS checkout unavailable.'),{status:404});assertOwnPosRecord(site,membership,user,row)}});
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}catch(error){return errorResponse(error)}};
