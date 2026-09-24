import { assertSameOrigin, errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { clientCommerceStore, commerceKey } from "../lib/client-store.mjs";
import { cleanText } from "../lib/platform-utils.mjs";
import posSale from "./client-pos-sale.mjs";

const markerKey=(siteId,attemptId)=>commerceKey(siteId,"pos-attempts",attemptId);

export default async(req)=>{
  try{
    if(req.method!=="POST") return Response.json({ok:false,message:"Method not allowed."},{status:405});
    assertSameOrigin(req);
    const payload=await req.clone().json();
    const {site}=await requireSiteCapability(payload.siteId,"pos");
    const saleAttemptId=cleanText(payload.saleAttemptId,120).replace(/[^a-zA-Z0-9_-]/g,"");
    if(saleAttemptId.length<8) throw Object.assign(new Error("A valid sale attempt ID is required."),{status:400});

    const store=clientCommerceStore();
    const key=markerKey(site.siteId,saleAttemptId);
    const existing=await store.get(key,{type:"json"});
    if(existing?.status==="completed"&&existing?.response){
      return Response.json(existing.response,{headers:{"Cache-Control":"no-store"}});
    }
    if(existing?.status==="processing"){
      throw Object.assign(new Error("This POS sale is already processing. Please wait before trying again."),{status:409});
    }

    await store.setJSON(key,{
      siteId:site.siteId,
      saleAttemptId,
      status:"processing",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
    });

    const response=await posSale(req);
    const body=await response.clone().json().catch(()=>null);

    if(response.ok&&body?.ok){
      await store.setJSON(key,{
        siteId:site.siteId,
        saleAttemptId,
        status:"completed",
        transactionId:body.record?.transactionId||"",
        receiptId:body.receiptId||"",
        response:body,
        createdAt:existing?.createdAt||new Date().toISOString(),
        updatedAt:new Date().toISOString(),
      });
    }else{
      await store.setJSON(key,{
        siteId:site.siteId,
        saleAttemptId,
        status:"failed",
        response:body,
        createdAt:existing?.createdAt||new Date().toISOString(),
        updatedAt:new Date().toISOString(),
      });
    }
    return response;
  }catch(error){return errorResponse(error);}
};
