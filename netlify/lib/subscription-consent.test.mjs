import test from "node:test";
import assert from "node:assert/strict";
import { subscriptionConsent, assertSubscriptionBelongsToSite, SUBSCRIPTION_CONSENT_VERSION } from "./subscription-consent.mjs";

test("billing requires explicit acceptance of the current renewal disclosure", () => {
  const user = { email: "owner@example.com" };
  for (const renewalAccepted of [false, undefined, "true"]) {
    assert.throws(() => subscriptionConsent({ interval: "monthly", renewalAccepted, consentVersion: SUBSCRIPTION_CONSENT_VERSION }, user), { status: 400 });
  }
  assert.throws(() => subscriptionConsent({ interval: "annual", renewalAccepted: true, consentVersion: "outdated" }, user), { status: 400 });
  const consent = subscriptionConsent({ interval: "annual", renewalAccepted: true, consentVersion: SUBSCRIPTION_CONSENT_VERSION }, user, new Date("2026-10-02T00:00:00Z"));
  assert.equal(consent.amountUsd, 350);
  assert.equal(consent.acceptedBy, user.email);
  assert.equal(consent.acceptedAt, "2026-10-02T00:00:00.000Z");
});

test("cancellation validates subscription, customer and tenant from server state", () => {
  const site = { siteId: "business-a", servicePlan: { stripeSubscriptionId: "sub_a", stripeCustomerId: "cus_a" } };
  const subscription = { id: "sub_a", customer: "cus_a", metadata: { webfactory_site_id: "business-a" } };
  assert.doesNotThrow(() => assertSubscriptionBelongsToSite(subscription, site));
  for (const changed of [{ id: "sub_b" }, { customer: "cus_b" }, { metadata: { webfactory_site_id: "business-b" } }]) {
    assert.throws(() => assertSubscriptionBelongsToSite({ ...subscription, ...changed }, site), { status: 403 });
  }
});
