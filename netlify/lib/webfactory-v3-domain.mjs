import crypto from "node:crypto";
import { cleanText } from "./platform-utils.mjs";

export const V3_SCHEMA_VERSION = 1;

export function moneyCents(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
}

export function normalizedPhone(value) {
  return cleanText(value, 80).replace(/[^0-9+]/g, "");
}

export function customerIdentityKey({ email = "", phone = "" } = {}) {
  const normalizedEmail = cleanText(email, 320).trim().toLowerCase();
  const normalizedPhone = normalizedPhoneValue(phone);
  const source = normalizedEmail ? `email:${normalizedEmail}` : normalizedPhone ? `phone:${normalizedPhone}` : "";
  return source ? crypto.createHash("sha256").update(source).digest("hex") : "";
}

function normalizedPhoneValue(value) {
  return cleanText(value, 80).replace(/[^0-9+]/g, "");
}

export function normalizeTaxConfig(value = {}) {
  const stateRate = clampRate(value.stateRate ?? 10.5);
  const municipalRate = clampRate(value.municipalRate ?? 1);
  return {
    enabled: value.enabled !== false,
    stateRate,
    municipalRate,
    pricesIncludeTax: Boolean(value.pricesIncludeTax),
    defaultTaxable: value.defaultTaxable !== false,
  };
}

function clampRate(value) {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return 0;
  return Math.min(100, Math.max(0, Math.round(rate * 10000) / 10000));
}

export function calculateTax({ amountCents = 0, taxable = true, taxRateOverride = null, config = {} } = {}) {
  const amount = moneyCents(amountCents);
  const normalized = normalizeTaxConfig(config);
  if (!normalized.enabled || !taxable || amount <= 0) {
    return { taxableBase: amount, taxCents: 0, totalCents: amount, rate: 0 };
  }
  const rate = taxRateOverride == null
    ? normalized.stateRate + normalized.municipalRate
    : clampRate(taxRateOverride);

  if (normalized.pricesIncludeTax) {
    const divisor = 1 + rate / 100;
    const base = Math.round(amount / divisor);
    return { taxableBase: base, taxCents: amount - base, totalCents: amount, rate };
  }
  const tax = Math.round(amount * rate / 100);
  return { taxableBase: amount, taxCents: tax, totalCents: amount + tax, rate };
}

export function createCustomerRecord({ siteId, customer = {}, existing = null, now = new Date().toISOString() }) {
  if (!siteId) throw new Error("Customer requires siteId.");
  const email = cleanText(customer.email || existing?.email, 320).trim().toLowerCase();
  const phone = normalizedPhoneValue(customer.phone || existing?.phone);
  const identityKey = customerIdentityKey({ email, phone });
  const id = existing?.customerId || customer.customerId || (identityKey ? `cust-${identityKey.slice(0, 24)}` : `cust-${crypto.randomUUID()}`);
  return {
    schemaVersion: V3_SCHEMA_VERSION,
    customerId: id,
    siteId: cleanText(siteId, 120),
    identityKey,
    name: cleanText(customer.name || existing?.name, 220),
    email,
    phone,
    tags: uniqueStrings(customer.tags ?? existing?.tags, 50, 80),
    notes: cleanText(customer.notes ?? existing?.notes, 4000),
    totalSpent: moneyCents(existing?.totalSpent ?? customer.totalSpent),
    orderCount: Math.max(0, Number(existing?.orderCount ?? customer.orderCount ?? 0)),
    bookingCount: Math.max(0, Number(existing?.bookingCount ?? customer.bookingCount ?? 0)),
    lastActivityAt: customer.lastActivityAt || existing?.lastActivityAt || now,
    createdAt: existing?.createdAt || customer.createdAt || now,
    updatedAt: now,
  };
}

export function createPaymentLinkRecord({ siteId, slug, input = {}, createdBy = "", now = new Date().toISOString() }) {
  if (!siteId) throw new Error("Payment link requires siteId.");
  const amount = moneyCents(input.amount);
  if (!amount) throw new Error("Payment link amount must be greater than zero.");
  const token = input.token || crypto.randomBytes(18).toString("base64url");
  return {
    schemaVersion: V3_SCHEMA_VERSION,
    paymentLinkId: input.paymentLinkId || `plink-${crypto.randomUUID()}`,
    siteId: cleanText(siteId, 120),
    siteSlug: cleanText(slug, 80),
    token,
    title: cleanText(input.title, 220),
    description: cleanText(input.description, 2000),
    catalogItemId: cleanText(input.catalogItemId, 120),
    amount,
    currency: cleanText(input.currency || "usd", 10).toLowerCase(),
    allowQuantity: Boolean(input.allowQuantity),
    active: input.active !== false,
    expiresAt: input.expiresAt || "",
    createdAt: now,
    updatedAt: now,
    createdBy: cleanText(createdBy, 320),
  };
}

export function createReceiptRecord({ siteId, transaction = {}, now = new Date().toISOString() }) {
  if (!siteId || !transaction.transactionId) throw new Error("Receipt requires siteId and transactionId.");
  const items = Array.isArray(transaction.items) ? transaction.items.slice(0, 100).map((item) => ({
    id: cleanText(item.id, 120),
    name: cleanText(item.name, 220),
    quantity: Math.max(1, Number(item.quantity || 1)),
    unitAmount: moneyCents(item.unitAmount),
    amount: moneyCents(item.amount ?? Number(item.unitAmount || 0) * Number(item.quantity || 1)),
  })) : [];
  const subtotal = moneyCents(transaction.subtotal ?? items.reduce((sum, item) => sum + item.amount, 0));
  const discounts = moneyCents(transaction.discounts);
  const tax = moneyCents(transaction.tax);
  const tip = moneyCents(transaction.tip);
  const total = moneyCents(transaction.total ?? transaction.amountTotal ?? Math.max(0, subtotal - discounts + tax + tip));
  return {
    schemaVersion: V3_SCHEMA_VERSION,
    receiptId: transaction.receiptId || `rcpt-${transaction.transactionId}`,
    transactionId: cleanText(transaction.transactionId, 160),
    siteId: cleanText(siteId, 120),
    customer: {
      name: cleanText(transaction.customer?.name, 220),
      email: cleanText(transaction.customer?.email, 320).toLowerCase(),
      phone: normalizedPhoneValue(transaction.customer?.phone),
    },
    items,
    subtotal,
    discounts,
    tax,
    tip,
    total,
    paymentMethod: cleanText(transaction.paymentMethod || transaction.paymentStatus, 80),
    paymentStatus: cleanText(transaction.paymentStatus, 80),
    createdAt: transaction.paidAt || transaction.createdAt || now,
    updatedAt: now,
  };
}

export function createInventoryMovement({ siteId, itemId, quantityDelta, reason, referenceId = "", now = new Date().toISOString() }) {
  if (!siteId || !itemId) throw new Error("Inventory movement requires siteId and itemId.");
  const delta = Number(quantityDelta);
  if (!Number.isInteger(delta) || delta === 0) throw new Error("Inventory movement quantityDelta must be a non-zero integer.");
  return {
    schemaVersion: V3_SCHEMA_VERSION,
    movementId: `inv-${crypto.randomUUID()}`,
    siteId: cleanText(siteId, 120),
    itemId: cleanText(itemId, 120),
    quantityDelta: delta,
    reason: cleanText(reason || "adjustment", 80),
    referenceId: cleanText(referenceId, 160),
    createdAt: now,
  };
}

function uniqueStrings(values, limit, maxLength) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => cleanText(value, maxLength)).filter(Boolean))].slice(0, limit);
}
