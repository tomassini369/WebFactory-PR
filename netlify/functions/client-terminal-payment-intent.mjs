import { requirePosAdjustments } from '../lib/pos-permissions.mjs';
import { createReservedTerminalIntent } from '../lib/reserved-terminal-intent.mjs';
import crypto from "node:crypto";
import { assertSameOrigin, errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { cleanText, validEmail } from "../lib/platform-utils.mjs";
import { calculateTax } from "../lib/webfactory-v3-domain.mjs";
import { assertStripeWriteAllowed } from "../lib/stripe-runtime.mjs";

export default async(req)=>{
  try{
    if(req.method!=="POST")return Response.json({ok:false,message:"Method not allowed."},{status:405});
    assertSameOrigin(req);
    const payload=await req.json();
    const {site,user,membership}=await requireSiteCapability(payload.siteId,"pos");
    requirePosAdjustments(membership,payload);
    const requested=Array.isArray(payload.items)?payload.items.slice(0,50):[];
    if(!requested.length)throw Object.assign(new Error("Add at least one item to the sale."),{status:400});

    const customer={
      name:cleanText(payload.customer?.name,180),
      email:cleanText(payload.customer?.email,320).toLowerCase(),
      phone:cleanText(payload.customer?.phone,80),
    };
    if(customer.email&&!validEmail(customer.email))throw Object.assign(new Error("Customer email is invalid."),{status:400});

    const ids=new Set();
    for(const entry of requested){const quantity=Number(entry.quantity??1);if(!entry.id||ids.has(entry.id)||!Number.isSafeInteger(quantity)||quantity<1||quantity>100)throw Object.assign(new Error('Use unique products and whole quantities.'),{status:400});ids.add(entry.id);}
    for(const field of ['discountCents','tipCents'])if(payload[field]!==undefined&&(!Number.isSafeInteger(Number(payload[field]))||Number(payload[field])<0))throw Object.assign(new Error('Discount and tip must be nonnegative integer cents.'),{status:400});
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
    if(!Number.isSafeInteger(total)||total<=0)throw Object.assign(new Error("Terminal payment total must be greater than $0."),{status:400});

    const accountId=cleanText(site.paymentRules?.stripeConnectedAccountId,180);
    if(!accountId||!site.paymentRules?.methods?.stripe)throw Object.assign(new Error("Stripe is not connected for this business."),{status:409});
    assertStripeWriteAllowed({ requestUrl: req.url });

    const attemptId=payload.saleAttemptId;
    if(attemptId!==undefined&&(typeof attemptId!=='string'||!/^[A-Za-z0-9_-]{8,120}$/.test(attemptId)))throw Object.assign(new Error('A valid sale attempt ID is required.'),{status:400});
    const transactionId=attemptId?`txn_terminal_${attemptId}`:`txn_${crypto.randomUUID()}`;
    const now=new Date().toISOString();
    const record={
      transactionId,siteId:site.siteId,kind:"order",source:"tap_to_pay",customer,
      items:items.map(({taxable,taxRateOverride,...item})=>item),
      subtotal,discounts:discount,tax,tip,amountTotal:total,currency:"usd",
      paymentStatus:"pending",status:"payment_pending",createdAt:now,updatedAt:now,
      createdBy:cleanText(user.email||user.id,320),stripeAccountId:accountId,
    };
    const {intent}=await createReservedTerminalIntent(record,{requestUrl:req.url});
    return Response.json({ok:true,transactionId,paymentIntentId:intent.id,clientSecret:intent.client_secret||""},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
};
