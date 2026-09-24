import { errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { clientCommerceStore, commerceKey } from "../lib/client-store.mjs";
import { cleanText } from "../lib/platform-utils.mjs";

export default async(req)=>{
  try{
    if(req.method!=="GET")return new Response("Method not allowed",{status:405});
    const url=new URL(req.url);
    const siteId=cleanText(url.searchParams.get("siteId"),120);
    const transactionId=cleanText(url.searchParams.get("transactionId"),160);
    const {site}=await requireSiteCapability(siteId,"pos");
    const record=await clientCommerceStore().get(commerceKey(site.siteId,"transactions",transactionId),{type:"json"});
    if(!record||record.source!=="pos_remote"||!record.checkoutUrl)throw Object.assign(new Error("POS checkout not found."),{status:404});

    const qrUrl=new URL("https://quickchart.io/qr");
    qrUrl.searchParams.set("text",record.checkoutUrl);
    qrUrl.searchParams.set("size","900");
    qrUrl.searchParams.set("format","png");
    qrUrl.searchParams.set("margin","4");
    qrUrl.searchParams.set("ecLevel","M");
    const response=await fetch(qrUrl);
    if(!response.ok)throw new Error("QR image could not be generated.");
    return new Response(await response.arrayBuffer(),{headers:{"Content-Type":"image/png","Content-Disposition":`inline; filename="webfactory-pos-${transactionId}-qr.png"`,"Cache-Control":"private, max-age=300"}});
  }catch(error){return errorResponse(error);}
};
