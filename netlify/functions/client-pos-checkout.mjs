import {catalogPriceCents} from '../lib/catalog-price.mjs';
import {verifyMerchantCapability} from '../lib/stripe-merchant-capability.mjs';
import {assertPosLocation} from "../lib/commercial-access.mjs";
import { requirePosAdjustments } from '../lib/pos-permissions.mjs';
import { requireCashierPos } from '../lib/pos-operations.mjs';
import { clientCommerceStore } from '../lib/client-store.mjs';
import { createReservedStripeCheckout } from '../lib/reserved-stripe-checkout.mjs';
import { assertSameOrigin, errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { cleanText, validEmail } from "../lib/platform-utils.mjs";
import { calculateTax } from "../lib/webfactory-v3-domain.mjs";
import { assertStripeWriteAllowed } from "../lib/stripe-runtime.mjs";


function appendLine(params,index,item){
  params.set(`line_items[${index}][price_data][currency]`,"usd");
  params.set(`line_items[${index}][price_data][product_data][name]`,cleanText(item.name,250));
  params.set(`line_items[${index}][price_data][unit_amount]`,String(item.unitAmount));
  params.set(`line_items[${index}][quantity]`,String(item.quantity));
}

export function createPosCheckoutHandler({ authorize = requireSiteCapability, getStore = clientCommerceStore } = {}) { return async(req)=>{
  try{
    if(req.method!=="POST")return Response.json({ok:false,message:"Method not allowed."},{status:405});
    assertSameOrigin(req);
    const payload=await req.json();
    const {site,user,membership}=await authorize(payload.siteId,"pos");
    assertPosLocation(site,membership,payload);
    requirePosAdjustments(membership,payload);
    await requireCashierPos(site.siteId, getStore());
    const requested=Array.isArray(payload.items)?payload.items.slice(0,50):[];
    if(!requested.length)throw Object.assign(new Error("Add at least one item to the sale."),{status:400});

    const customer={
      name:cleanText(payload.customer?.name,180),
      email:cleanText(payload.customer?.email,320).toLowerCase(),
      phone:cleanText(payload.customer?.phone,80),
    };
    if(!customer.name||!validEmail(customer.email))throw Object.assign(new Error("Customer name and valid email are required for remote card payment."),{status:400});

    const ids=new Set();
    for(const entry of requested){const quantity=Number(entry.quantity??1);if(!entry.id||ids.has(entry.id)||!Number.isSafeInteger(quantity)||quantity<1||quantity>100)throw Object.assign(new Error('Use unique items and whole quantities.'),{status:400});ids.add(entry.id);}
    for(const field of ['discountCents','tipCents'])if(payload[field]!==undefined&&(!Number.isSafeInteger(Number(payload[field]))||Number(payload[field])<0))throw Object.assign(new Error('Discount and tip require nonnegative integer cents.'),{status:400});
    const items=requested.map((entry)=>{
      const item=(site.catalog||[]).find((candidate)=>candidate.id===entry.id&&candidate.active!==false);
      if(!item)throw Object.assign(new Error("A selected item is unavailable."),{status:409});
      const quantity=Math.max(1,Math.min(100,Math.floor(Number(entry.quantity||1))));
      if(item.type==="product"&&item.trackInventory&&item.inventory!==null&&item.inventory!==undefined&&!item.allowBackorder&&quantity>Number(item.inventory||0)){
        throw Object.assign(new Error(`${item.name||"Item"} does not have enough inventory.`),{status:409});
      }
      return {id:item.id,name:cleanText(item.nameEn||item.name||item.nameEs,220),quantity,unitAmount:catalogPriceCents(item.price),taxable:item.taxable!==false,taxRateOverride:item.taxRateOverride??null};
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
    if(!Number.isSafeInteger(total)||total<=0)throw Object.assign(new Error("Card checkout total must be greater than $0."),{status:400});
    const saleAttemptId=cleanText(payload.saleAttemptId,120).replace(/[^a-zA-Z0-9_-]/g,"");
    if(saleAttemptId.length<8)throw Object.assign(new Error("A valid sale attempt ID is required."),{status:400});

    const accountId=cleanText(site.paymentRules?.stripeConnectedAccountId,180);
    if(!accountId||!site.paymentRules?.methods?.stripe)throw Object.assign(new Error("Stripe is not connected for this business."),{status:409});
    assertStripeWriteAllowed({ requestUrl: req.url });
    if(await verifyMerchantCapability(accountId)!=="active")throw Object.assign(new Error("Finish Stripe verification before accepting card payments."),{status:409});

    const transactionId=`txn_pos_${saleAttemptId}`;
    const params=new URLSearchParams();
    params.set("mode","payment");
    params.set("customer_email",customer.email);
    params.set("client_reference_id",transactionId);
    params.set("metadata[flow]","webfactory_client_commerce");
    params.set("metadata[site_id]",site.siteId);
    params.set("metadata[transaction_id]",transactionId);
    params.set("metadata[kind]","order");
    params.set("metadata[source]","pos_remote");
    appendLine(params,0,{name:`WebFactory POS sale · ${items.length} item${items.length===1?"":"s"}`,unitAmount:total,quantity:1});

    const now=new Date().toISOString();
    const record={
      transactionId,siteId:site.siteId,kind:"order",source:"pos_remote",customer,
      items:items.map(({taxable,taxRateOverride,...item})=>item),
      subtotal,discounts:discount,tax,tip,amountTotal:total,currency:"usd",
      paymentStatus:"pending",status:"payment_pending",createdAt:now,updatedAt:now,
      createdById:user.id,locationId:cleanText(payload.locationId,120),createdBy:cleanText(user.email||user.id,320),stripeAccountId:accountId,
    };
    const checkout=await createReservedStripeCheckout(site,record,params,{requestUrl:req.url,store:getStore(),buyerReceiptReturn:true});
    return Response.json({ok:true,transactionId,checkoutUrl:checkout.checkoutUrl},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return errorResponse(error);}
}; }
export default createPosCheckoutHandler();
