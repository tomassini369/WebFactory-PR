export function refundState({ amountTotal, refundedAmount = 0, requestedAmount }) {
  const total = Math.max(0, Math.round(Number(amountTotal || 0)));
  const existing = Math.max(0, Math.round(Number(refundedAmount || 0)));
  const remaining = Math.max(0, total - existing);
  if (remaining <= 0) {
    const error = new Error("This transaction is already fully refunded.");
    error.status = 409;
    throw error;
  }
  const amount = requestedAmount == null || requestedAmount === ""
    ? remaining
    : Math.round(Number(requestedAmount));
  if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
    const error = new Error("Refund amount exceeds the remaining refundable balance.");
    error.status = 400;
    throw error;
  }
  const newRefundedAmount = existing + amount;
  return {
    amount,
    existingRefunded: existing,
    remainingRefundable: remaining,
    newRefundedAmount,
    fullRefund: newRefundedAmount >= total,
  };
}
