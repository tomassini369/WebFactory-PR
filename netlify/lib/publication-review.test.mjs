import test from "node:test";
import assert from "node:assert/strict";
import { publicationReview, sanitizePolicies, PUBLICATION_REVIEW_VERSION } from "./publication-review.mjs";

const review = { version: PUBLICATION_REVIEW_VERSION, termsAccepted: true, contentReviewed: true, policiesReviewed: true };
const order = { client: { email: "owner@example.com" }, features: { cart: true }, business: { policies: { privacy: "Our data notice", terms: "Our purchase terms", refund: "Our cancellation rules" } } };

test("publication review cannot be bypassed by omitting checkboxes or using truthy strings", () => {
  for (const field of ["termsAccepted", "contentReviewed", "policiesReviewed"]) {
    assert.throws(() => publicationReview({ publicationReview: { ...review, [field]: "true" } }, order), { status: 400 });
  }
  assert.throws(() => publicationReview({}, order), { status: 400 });
  assert.equal(publicationReview({ publicationReview: review }, order).reviewedBy, order.client.email);
});

test("commerce requires real business policies while an informational page can proceed without commerce policies", () => {
  assert.throws(() => publicationReview({ publicationReview: review }, { ...order, business: { policies: {} } }), { status: 400 });
  assert.doesNotThrow(() => publicationReview({ publicationReview: review }, { ...order, features: { cart: false, bookings: false, form: false }, business: {} }));
  assert.throws(() => publicationReview({ publicationReview: review }, { ...order, features: { cart: false, form: true }, business: {} }), { status: 400 });
  assert.equal(sanitizePolicies({ privacy: "  notice  ", unknown: "discard" }).privacy, "notice");
  assert.equal(sanitizePolicies({ privacy: "x".repeat(13000) }).privacy.length, 12000);
});
