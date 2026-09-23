import crypto from "node:crypto";
import { assertSameOrigin, errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { clientCommerceStore, commerceKey } from "../lib/client-store.mjs";
import { cleanText, publicBaseUrl, validEmail } from "../lib/order-store.mjs";
import { calculateTax } from "../lib/webfactory-v3-domain.mjs";

function env(name){return globalThis.Netlify?.env?.get(name)||"";}

async function verifyMerchantCapability(accountId){
  const params=new URLSearchParams();params.append("include[]","configuration.merchant");
  const response=await fetch(`https://api.stripe.com/v2/core/accounts/${encodeURIComponent(accountId)}?${params}`,{headers:{Authorization:`Bearer ${env("STRIPE_SECRET_KEY")}`,"Stripe-Version":"2026-08-26.preview"}});
  const account=await response.json();
  if(!response.ok)throw new Error(account?.error?.message||"Stripe account status could not be verified.");
  return account.configuration?.merchant?.capabilities?.card_payments?.status||"pending";
}

function appendLine(params,index,item){
  params.set(`line_items[${index}][price_data][currency]`,"usd");
  params.set(`line_items[${index}][price_data][product_data][name]`,cleanText(item.name,250));
  params.set(`line_items[${index}][price_data][unit_amount]`,String(item.unitAmount));
  params.set(`line_items[${index}][quantity]`,String(item.quantity));
}

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
    if(!customer.name||!validEmail(customer.email))throw Object.assign(new Error("Customer name and valid email are required for remote card payment."),{status:400});

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
    if(await verifyMerchantCapability(accountId)!=="active")throw Object.assign(new Error("Finish Stripe verification before accepting card payments."),{status:409});

    const transactionId=`txn_${crypto.randomUUID()}`;
    const params=new URLSearchParams();
    params.set("mode","payment");
    params.set("success_url",`${publicBaseUrl()}/client-admin?pos=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url",`${publicBaseUrl()}/client-admin?pos=cancelled`);
    params.set("customer_email",customer.email);
    params.set("client_reference_id",transactionId);
    params.set("metadata[flow]","webfactory_client_commerce");
    params.set("metadata[site_id]",site.siteId);
    params.set("metadata[transaction_id]",transactionId);
    params.set("metadata[kind]","order");
    params.set("metadata[source]","pos_remote");
    appendLine(params,0,{name:`WebFactory POS sale · ${items.length} item${items.length===1?"":"s"}`,unitAmount:total,quantity:1});

    const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:`Bearer ${env("STRIPE_SECRET_KEY")}`,"Stripe-Account":accountId,"Stripe-Version":"2026-07-29.dahlia","Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":`pos-checkout-${transactionId}`},body:params});
    const session=await response.json();
    if(!response.ok)throw new Error(session?.error?.message||"POS checkout could not be created.");

    const now=new Date().toISOString();
    const record={
      transactionId,siteId:site.siteId,kind:"order",source:"pos_remote",customer,
      items:items.map(({taxable,taxRateOverride,...item})=>item),
      subtotal,discounts:discount,tax,tip,amountTotal:total,currency:"usd",
      paymentStatus:"pending",status:"payment_pending",createdAt:now,updatedAt:now,
      createdBy:cleanText(user.email||user.id,320),stripeAccountId:accountId,stripeSessionId:session.id,checkoutUrl:session.url,
    };
    await clientCommerceStore().setJSON(commerceKey(site.siteId,"transactions",transactionId),record);
    return Response.json({ok:true,transactionId,checkoutUrl:session.url},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
};
