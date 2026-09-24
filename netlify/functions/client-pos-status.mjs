import { errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { clientCommerceStore, commerceKey } from "../lib/client-store.mjs";
import { cleanText } from "../lib/platform-utils.mjs";

export default async(req)=>{
  try{
    if(req.method!=="GET")return Response.json({ok:false,message:"Method not allowed."},{status:405});
    const url=new URL(req.url);
    const siteId=cleanText(url.searchParams.get("siteId"),120);
    const transactionId=cleanText(url.searchParams.get("transactionId"),160);
    const {site}=await requireSiteCapability(siteId,"pos");
    let record=await clientCommerceStore().get(commerceKey(site.siteId,"orders",transactionId),{type:"json"});
    if(!record)record=await clientCommerceStore().get(commerceKey(site.siteId,"transactions",transactionId),{type:"json"});
    if(!record||!["pos_remote","pos"].includes(record.source))throw Object.assign(new Error("POS transaction not found."),{status:404});
    return Response.json({ok:true,transaction:{transactionId:record.transactionId,paymentStatus:record.paymentStatus,status:record.status,receiptId:record.receiptId||"",amountTotal:Number(record.amountTotal||0)}},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
};
