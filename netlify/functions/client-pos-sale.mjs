import crypto from "node:crypto";
import { assertSameOrigin, errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { clientCommerceStore, commerceKey, patchClientSite } from "../lib/client-store.mjs";
import { cleanText, validEmail } from "../lib/order-store.mjs";
import { calculateTax, createCustomerRecord, createInventoryMovement, createReceiptRecord } from "../lib/webfactory-v3-domain.mjs";
import { getV3Record, putV3Record } from "../lib/webfactory-v3-store.mjs";
import { sendCustomerCommerceEmail, sendBusinessCommerceEmail } from "../lib/client-notifications.mjs";

export default async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    assertSameOrigin(req);
    const payload = await req.json();
    const { site, user } = await requireSiteCapability(payload.siteId, "pos");

    const requested = Array.isArray(payload.items) ? payload.items.slice(0, 50) : [];
    if (!requested.length) throw Object.assign(new Error("Add at least one item to the sale."), { status: 400 });

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
    const paymentMethod = ["cash","manual_ath","other"].includes(payload.paymentMethod) ? payload.paymentMethod : "cash";
    const transactionId = `txn_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const customer = {
      name: cleanText(payload.customer?.name, 180),
      email: cleanText(payload.customer?.email, 320).toLowerCase(),
      phone: cleanText(payload.customer?.phone, 80),
    };
    if (customer.email && !validEmail(customer.email)) throw Object.assign(new Error("Customer email is invalid."), { status: 400 });

    let customerId = "";
    if (customer.email || customer.phone) {
      const seed = createCustomerRecord({ siteId: site.siteId, customer });
      const existing = await getV3Record(site.siteId, "customers", seed.customerId);
      const record = createCustomerRecord({
        siteId: site.siteId,
        customer: {
          ...customer,
          totalSpent: Number(existing?.totalSpent || 0) + total,
          orderCount: Number(existing?.orderCount || 0) + 1,
          lastActivityAt: now,
        },
        existing,
      });
      record.totalSpent = Number(existing?.totalSpent || 0) + total;
      record.orderCount = Number(existing?.orderCount || 0) + 1;
      await putV3Record(site.siteId, "customers", record.customerId, record);
      customerId = record.customerId;
    }

    const record = {
      transactionId,
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

    const updatedCatalog = (site.catalog || []).map((catalogItem) => {
      const sold = items.find((item) => item.id === catalogItem.id);
      if (!sold || catalogItem.type !== "product" || !catalogItem.trackInventory || catalogItem.inventory === null || catalogItem.inventory === undefined) return catalogItem;
      return { ...catalogItem, inventory: Number(catalogItem.inventory || 0) - sold.quantity };
    });
    await patchClientSite(site.siteId, { catalog: updatedCatalog });

    for (const sold of items) {
      const original = (site.catalog || []).find((item) => item.id === sold.id);
      if (original?.type === "product" && original.trackInventory && original.inventory !== null && original.inventory !== undefined) {
        const movement = createInventoryMovement({
          siteId: site.siteId,
          itemId: sold.id,
          quantityDelta: -sold.quantity,
          reason: "pos_sale",
          referenceId: transactionId,
        });
        await putV3Record(site.siteId, "inventory-movements", movement.movementId, movement);
      }
    }

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
        customer: { name: customer.name || "", email: customer.email },
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

    return Response.json({ ok: true, record, receiptId: receipt.receiptId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
