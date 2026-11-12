import test from "node:test";
import assert from "node:assert/strict";
import { subscriptionConsent, assertSubscriptionBelongsToSite } from "./subscription-consent.mjs";

test("billing requires explicit acceptance of the current renewal disclosure", () => {
  const user = { email: "owner@example.com" };
  for (const renewalAccepted of [false, undefined, "true"]) {
    assert.throws(() => subscriptionConsent({ tier:"basic", interval: "monthly", renewalAccepted, consentVersion: "membership-v1" }, user), { status: 400 });
  }
  assert.throws(() => subscriptionConsent({ tier:"basic", interval: "annual", renewalAccepted: true, consentVersion: "outdated" }, user), { status: 400 });
  const consent = subscriptionConsent({ tier:"basic", interval: "annual", renewalAccepted: true, consentVersion: "membership-v1" }, user, new Date("2026-10-02T00:00:00Z"));
  assert.equal(consent.amountUsd, 300);
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

test("membership consent records the server amount for the selected tier and interval", () => {
  const user = {email:"owner@example.com"};
  const payload = {tier:"standard",interval:"annual",renewalAccepted:true,consentVersion:"membership-v1",amountUsd:1};
  const consent = subscriptionConsent(payload,user);
  assert.equal(consent.tier,"standard");
  assert.equal(consent.amountUsd,490);
  assert.throws(() => subscriptionConsent({...payload,tier:"enterprise"},user), {status:400});
  assert.throws(() => subscriptionConsent({...payload,tier:undefined},user), {status:400});
  assert.throws(() => subscriptionConsent({...payload,consentVersion:"2026-10-02"},user), {status:400});
});
