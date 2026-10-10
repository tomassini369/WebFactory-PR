import { requirePosAdjustments } from '../lib/pos-permissions.mjs';
import { applyCustomerTransaction } from '../lib/customer-transactions.mjs';
import { applyStockOperation,projectStockMovements } from '../lib/inventory-operations.mjs';
import { withBookingLock } from "../lib/booking-lock.mjs";
import crypto from "node:crypto";
import { assertSameOrigin, errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { clientCommerceStore, commerceKey, getClientSite } from "../lib/client-store.mjs";
import { cleanText, validEmail } from "../lib/platform-utils.mjs";
import { calculateTax, createReceiptRecord } from "../lib/webfactory-v3-domain.mjs";
import { putV3Record } from "../lib/webfactory-v3-store.mjs";
import { sendCustomerCommerceEmail, sendBusinessCommerceEmail } from "../lib/client-notifications.mjs";

export default async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    assertSameOrigin(req);
    const payload = await req.json();
    let { site, user, membership } = await requireSiteCapability(payload.siteId, "pos");
    requirePosAdjustments(membership,payload);
    return await withBookingLock(clientCommerceStore(), `locks/commerce/${site.siteId}`, async () => {
    site = await getClientSite(site.siteId);

    const requested = Array.isArray(payload.items) ? payload.items.slice(0, 50) : [];
    if (!requested.length) throw Object.assign(new Error("Add at least one item to the sale."), { status: 400 });

  const ids = new Set();
  for (const entry of requested) {
    const quantity = Number(entry.quantity ?? 1);
    if (!entry.id || ids.has(entry.id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw Object.assign(new Error("Use unique catalog items and quantities between 1 and 20."), { status: 400 });
    }
    ids.add(entry.id);
  }
    const items = requested.map((entry) => {
      const item = (site.catalog || []).find((candidate) => candidate.id === entry.id && candidate.active !== false);
      if (!item) throw Object.assign(new Error("A selected item is unavailable."), { status: 409 });
      const quantity = Math.max(1, Math.min(100, Math.floor(Number(entry.quantity || 1))));
      if (item.type === "product" && item.trackInventory && item.inventory !== null && item.inventory !== undefined) {
        const available = Number(item.inventory || 0);
        if (!item.allowBackorder && quantity > available) {
          throw Object.assign(new Error(`${item.name || "Item"} does not have enough inventory.`), { status: 409 });
        }
      }
      return {
        id: item.id,
        name: cleanText(item.nameEn || item.name || item.nameEs, 220),
        quantity,
        unitAmount: Math.max(0, Math.round(Number(item.price || 0) * 100)),
        taxable: item.taxable !== false,
        taxRateOverride: item.taxRateOverride ?? null,
      };
    });

    for (const field of ['discountCents','tipCents']) {
      if (payload[field] !== undefined && (!Number.isSafeInteger(Number(payload[field])) || Number(payload[field]) < 0)) throw Object.assign(new Error('Discount and tip must be nonnegative integer cents.'), {status:400});
    }
    if (items.some(item => !Number.isSafeInteger(item.unitAmount))) throw Object.assign(new Error('Catalog price is invalid.'), {status:409});
    const subtotal = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
    const discount = Math.max(0, Math.min(subtotal, Math.round(Number(payload.discountCents || 0))));
    const tip = Math.max(0, Math.round(Number(payload.tipCents || 0)));
    const discountedBase = Math.max(0, subtotal - discount);

    let tax = 0;
    if (subtotal > 0) {
      for (const item of items) {
        const lineGross = item.unitAmount * item.quantity;
        const ratio = subtotal ? lineGross / subtotal : 0;
        const lineAfterDiscount = Math.max(0, Math.round(discountedBase * ratio));
        const result = calculateTax({
          amountCents: lineAfterDiscount,
          taxable: item.taxable,
          taxRateOverride: item.taxRateOverride,
          config: site.taxConfig || {},
        });
        tax += Number(result.taxCents || 0);
      }
    }

    const total = Math.max(0, discountedBase + (site.taxConfig?.pricesIncludeTax ? 0 : tax) + tip);
    if (!Number.isSafeInteger(total)) throw Object.assign(new Error('Sale total is invalid.'), {status:400});
    const paymentMethod = ["cash","manual_ath","other"].includes(payload.paymentMethod) ? payload.paymentMethod : "cash";
    const transactionId = `txn_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const customer = {
      name: cleanText(payload.customer?.name, 180),
      email: cleanText(payload.customer?.email, 320).toLowerCase(),
      phone: cleanText(payload.customer?.phone, 80),
      reviewOptIn: payload.customer?.reviewOptIn === true,
    };
    if (customer.email && !validEmail(customer.email)) throw Object.assign(new Error("Customer email is invalid."), { status: 400 });

    let customerId = '';
    const record = {
      transactionId,
      inventoryProtocol:1,
      posAttemptId:cleanText(payload.saleAttemptId,120).replace(/[^a-zA-Z0-9_-]/g,''),
      posAttemptFingerprint:crypto.createHash('sha256').update(JSON.stringify({items:payload.items,customer:payload.customer,discountCents:payload.discountCents,tipCents:payload.tipCents,paymentMethod:payload.paymentMethod})).digest('hex'),
      siteId: site.siteId,
      kind: "order",
      source: "pos",
      customer,
      customerId,
      items: items.map(({ taxable, taxRateOverride, ...item }) => item),
      subtotal,
      discounts: discount,
      tax,
      tip,
      amountTotal: total,
      currency: "usd",
      paymentMethod,
      paymentStatus: "paid_in_person",
      status: "completed",
      paidAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: cleanText(user.email || user.id, 320),
    };

    // Persist the transaction before the stock side effect so an interrupted
    // sale still has a reference for administrative recovery.
    await clientCommerceStore().setJSON(commerceKey(site.siteId,'pos-processing',transactionId),{transactionId});
    await clientCommerceStore().setJSON(commerceKey(site.siteId,'transactions',transactionId),{...record,status:'processing'});
    const applied=await applyStockOperation(site.siteId,{kind:'sale',referenceId:transactionId,items,reason:'pos_sale'});
    await projectStockMovements(site.siteId,applied.operation,clientCommerceStore());
    if(customer.email||customer.phone){const profile=await applyCustomerTransaction(site.siteId,record);customerId=profile.customerId;record.customerId=customerId;}
    record.inventoryAppliedAt=applied.operation.appliedAt;
    record.inventoryOperationId=applied.operation.id;

    const receipt = createReceiptRecord({ siteId: site.siteId, transaction: record });
    await putV3Record(site.siteId, "receipts", receipt.receiptId, receipt);
    record.receiptId = receipt.receiptId;

    if (customer.email) {
      try {
        await sendCustomerCommerceEmail(site, record);
        record.customerEmailSent = true;
      } catch (error) {
        console.error("pos-customer-email", transactionId, error?.message || error);
      }
    }
    if (site.business?.email) {
      try {
        await sendBusinessCommerceEmail(site, record);
        record.businessEmailSent = true;
      } catch (error) {
        console.error("pos-business-email", transactionId, error?.message || error);
      }
    }

    const reviewSettings = site.reviewSettings || {};
    if (reviewSettings.enabled && reviewSettings.reviewUrl && reviewSettings.includeOrders !== false && customer.email) {
      const reviewRequestId = `review-${crypto.randomUUID()}`;
      await putV3Record(site.siteId, "review-requests", reviewRequestId, {
        reviewRequestId,
        siteId: site.siteId,
        transactionId,
        kind: "order",
        customer: { name: customer.name || "", email: customer.email, reviewOptIn: customer.reviewOptIn === true },
        reviewUrl: reviewSettings.reviewUrl,
        status: "pending",
        dueAt: new Date(Date.now() + Math.max(0, Number(reviewSettings.delayHours ?? 2)) * 3600000).toISOString(),
        createdAt: now,
        updatedAt: now,
      });
      record.reviewRequestId = reviewRequestId;
    }

    await clientCommerceStore().setJSON(commerceKey(site.siteId, "orders", transactionId), record);
    await clientCommerceStore().setJSON(commerceKey(site.siteId, "transactions", transactionId), record);

    if(!record.posAttemptId)await clientCommerceStore().delete(commerceKey(site.siteId,'pos-processing',transactionId));
    return Response.json({ ok: true, record, receiptId: receipt.receiptId }, { headers: { "Cache-Control": "no-store" } });
    });
  } catch (error) {
    return errorResponse(error);
  }
};
