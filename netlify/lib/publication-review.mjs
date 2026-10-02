export const PUBLICATION_REVIEW_VERSION = "2026-10-02";

export function sanitizePolicies(value = {}) {
  return Object.fromEntries(["privacy", "terms", "refund"].map(key => [key, String(value?.[key] || "").trim().slice(0, 12000)]));
}

export function publicationReview(payload, order, now = new Date()) {
  const review = payload.publicationReview || {};
  if (review.version !== PUBLICATION_REVIEW_VERSION || review.termsAccepted !== true ||
      review.contentReviewed !== true || review.policiesReviewed !== true) {
    throw Object.assign(new Error("Complete the publication review and accept the platform terms."), { status: 400 });
  }
  const policies = sanitizePolicies(order.business.policies);
  const commerce = order.features.cart !== false || Boolean(order.features.bookings);
  if ((commerce || order.features.form) && !policies.privacy) {
    throw Object.assign(new Error("Add your business privacy notice before creating the website."), { status: 400 });
  }
  if (commerce && (!policies.terms || !policies.refund)) {
    throw Object.assign(new Error("Add your business purchase terms and refund/cancellation policy."), { status: 400 });
  }
  return {
    version: PUBLICATION_REVIEW_VERSION, reviewedAt: now.toISOString(), reviewedBy: order.client.email,
    termsAccepted: true, contentReviewed: true, policiesReviewed: true,
  };
}
