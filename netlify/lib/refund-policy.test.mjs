import test from "node:test";
import assert from "node:assert/strict";
import { refundState } from "./refund-policy.mjs";

test("partial refunds accumulate against remaining balance", () => {
  const state = refundState({ amountTotal: 10000, refundedAmount: 2500, requestedAmount: 3000 });
  assert.equal(state.remainingRefundable, 7500);
  assert.equal(state.newRefundedAmount, 5500);
  assert.equal(state.fullRefund, false);
});

test("final partial amount becomes cumulative full refund", () => {
  const state = refundState({ amountTotal: 10000, refundedAmount: 6000, requestedAmount: 4000 });
  assert.equal(state.newRefundedAmount, 10000);
  assert.equal(state.fullRefund, true);
});

test("omitting amount refunds only the remaining balance", () => {
  const state = refundState({ amountTotal: 10000, refundedAmount: 6500 });
  assert.equal(state.amount, 3500);
  assert.equal(state.fullRefund, true);
});

test("refund cannot exceed remaining balance", () => {
  assert.throws(() => refundState({ amountTotal: 10000, refundedAmount: 8000, requestedAmount: 3000 }), /remaining refundable balance/);
});

test("already fully refunded transactions reject new refunds", () => {
  assert.throws(() => refundState({ amountTotal: 10000, refundedAmount: 10000, requestedAmount: 100 }), /already fully refunded/);
});
