import crypto from "node:crypto";
import { assertSameOrigin, errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { clientCommerceStore, commerceKey } from "../lib/client-store.mjs";
import { cleanText, validEmail } from "../lib/order-store.mjs";
import { calculateTax } from "../lib/webfactory-v3-domain.mjs";

function env(name){return globalThis.Netlify?.env?.get(name)||"";}

export default async(req)=>{
  try{
    if(req.method!=="POST")return Response.json({ok:false,message:"Method not allowed."},{status:405});
    assertSameOrigin(req);
    const payload=await req.json();
    const {site,user}=await requireSiteCapability(payload.siteId,"pos");
    const requested=Array.isArray(payload.items)?payload.items.slice(0,50):[];
    if(!requested.length)throw Object.assign(new Error("Add at least one item to the sale."),{status:400});

    const customer={
      name:cleanText(payload.customer?.name,180),
      email:cleanText(payload.customer?.email,320).toLowerCase(),
      phone:cleanText(payload.customer?.phone,80),
    };
    if(customer.email&&!validEmail(customer.email))throw Object.assign(new Error("Customer email is invalid."),{status:400});

    const items=requested.map((entry)=>{
      const item=(site.catalog||[]).find((candidate)=>candidate.id===entry.id&&candidate.active!==false);
      if(!item)throw Object.assign(new Error("A selected item is unavailable."),{status:409});
      const quantity=Math.max(1,Math.min(100,Math.floor(Number(entry.quantity||1))));
      if(item.type==="product"&&item.trackInventory&&item.inventory!==null&&item.inventory!==undefined&&!item.allowBackorder&&quantity>Number(item.inventory||0)){
        throw Object.assign(new Error(`${item.name||"Item"} does not have enough inventory.`),{status:409});
      }
      return {id:item.id,name:cleanText(item.nameEn||item.name||item.nameEs,220),quantity,unitAmount:Math.max(0,Math.round(Number(item.price||0)*100)),taxable:item.taxable!==false,taxRateOverride:item.taxRateOverride??null};
    });

    const subtotal=items.reduce((sum,item)=>sum+item.unitAmount*item.quantity,0);
    const discount=Math.max(0,Math.min(subtotal,Math.round(Number(payload.discountCents||0))));
    const tip=Math.max(0,Math.round(Number(payload.tipCents||0)));
    const discountedBase=Math.max(0,subtotal-discount);
    let tax=0;
    for(const item of items){
      const lineGross=item.unitAmount*item.quantity;
      const ratio=subtotal?lineGross/subtotal:0;
      const lineAfterDiscount=Math.max(0,Math.round(discountedBase*ratio));
      tax+=Number(calculateTax({amountCents:lineAfterDiscount,taxable:item.taxable,taxRateOverride:item.taxRateOverride,config:site.taxConfig||{}}).taxCents||0);
    }
    const total=Math.max(0,discountedBase+(site.taxConfig?.pricesIncludeTax?0:tax)+tip);

    const accountId=cleanText(site.paymentRules?.stripeConnectedAccountId,180);
    if(!accountId||!site.paymentRules?.methods?.stripe)throw Object.assign(new Error("Stripe is not connected for this business."),{status:409});

    const transactionId=`txn_${crypto.randomUUID()}`;
    const params=new URLSearchParams();
    params.set("amount",String(total));
    params.set("currency","usd");
    params.append("payment_method_types[]","card_present");
    params.set("capture_method","automatic");
    params.set("description",`WebFactory POS · ${items.length} item${items.length===1?"":"s"}`);
    params.set("metadata[flow]","webfactory_terminal");
    params.set("metadata[site_id]",site.siteId);
    params.set("metadata[transaction_id]",transactionId);
    params.set("metadata[kind]","order");
    params.set("metadata[source]","tap_to_pay");

    const response=await fetch("https://api.stripe.com/v1/payment_intents",{method:"POST",headers:{Authorization:`Bearer ${env("STRIPE_SECRET_KEY")}`,"Stripe-Account":accountId,"Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":`terminal-intent-${transactionId}`},body:params});
    const intent=await response.json();
    if(!response.ok)throw new Error(intent?.error?.message||"Terminal PaymentIntent could not be created.");

    const now=new Date().toISOString();
    const record={
      transactionId,siteId:site.siteId,kind:"order",source:"tap_to_pay",customer,
      items:items.map(({taxable,taxRateOverride,...item})=>item),
      subtotal,discounts:discount,tax,tip,amountTotal:total,currency:"usd",
      paymentStatus:"pending",status:"payment_pending",createdAt:now,updatedAt:now,
      createdBy:cleanText(user.email||user.id,320),stripeAccountId:accountId,stripePaymentIntentId:intent.id,
    };
    await clientCommerceStore().setJSON(commerceKey(site.siteId,"transactions",transactionId),record);
    return Response.json({ok:true,transactionId,paymentIntentId:intent.id,clientSecret:intent.client_secret||""},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
};
