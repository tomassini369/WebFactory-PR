import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateTax,
  createCustomerRecord,
  createInventoryMovement,
  createPaymentLinkRecord,
  createReceiptRecord,
  normalizeTaxConfig,
} from "./webfactory-v3-domain.mjs";

test("Puerto Rico default IVU totals 11.5 percent", () => {
  const tax = calculateTax({ amountCents: 10000, config: normalizeTaxConfig({}) });
  assert.equal(tax.taxCents, 1150);
  assert.equal(tax.totalCents, 11150);
});

test("tax inclusive pricing preserves total", () => {
  const tax = calculateTax({ amountCents: 11150, config: { pricesIncludeTax: true } });
  assert.equal(tax.taxCents, 1150);
  assert.equal(tax.totalCents, 11150);
});

test("customer identity is stable for normalized email", () => {
  const a = createCustomerRecord({ siteId: "site-1", customer: { email: " User@Example.com " } });
  const b = createCustomerRecord({ siteId: "site-1", customer: { email: "user@example.com" } });
  assert.equal(a.customerId, b.customerId);
  assert.equal(a.email, "user@example.com");
});

test("payment links require positive server amount", () => {
  assert.throws(() => createPaymentLinkRecord({ siteId: "site-1", slug: "shop", input: { amount: 0 } }));
  const link = createPaymentLinkRecord({ siteId: "site-1", slug: "shop", input: { amount: 2500, title: "Deposit" } });
  assert.equal(link.amount, 2500);
  assert.ok(link.token.length >= 20);
});

test("receipt normalizes transaction totals", () => {
  const receipt = createReceiptRecord({
    siteId: "site-1",
    transaction: {
      transactionId: "tx-1",
      items: [{ name: "Service", quantity: 2, unitAmount: 2500 }],
      tax: 575,
      amountTotal: 5575,
      paymentStatus: "paid",
    },
  });
  assert.equal(receipt.subtotal, 5000);
  assert.equal(receipt.total, 5575);
});

test("inventory movement rejects zero deltas", () => {
  assert.throws(() => createInventoryMovement({ siteId: "site-1", itemId: "item-1", quantityDelta: 0 }));
  const movement = createInventoryMovement({ siteId: "site-1", itemId: "item-1", quantityDelta: -1, reason: "sale" });
  assert.equal(movement.quantityDelta, -1);
});
