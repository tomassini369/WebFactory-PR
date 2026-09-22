import assert from "node:assert/strict";
import test from "node:test";
import { billingStateFor, createComplimentaryServicePlan, createSubscriptionRequiredServicePlan, createTrialServicePlan, siteEntitlement } from "./subscription-billing.mjs";

test("trial lasts exactly 48 hours", () => {
  const started = new Date("2026-09-21T12:00:00.000Z");
  const plan = createTrialServicePlan(started);
  assert.equal(plan.trialStartedAt, "2026-09-21T12:00:00.000Z");
  assert.equal(plan.trialEndsAt, "2026-09-23T12:00:00.000Z");
  assert.equal(siteEntitlement({ servicePlan: plan }, new Date("2026-09-23T11:59:59.999Z")).public, true);
  assert.equal(siteEntitlement({ servicePlan: plan }, new Date("2026-09-23T12:00:00.000Z")).public, false);
});

test("complimentary access is active without an expiration or Stripe subscription", () => {
  const plan = createComplimentaryServicePlan(
    { grantedBy: "owner@webfactorypr.com", note: "Private invitation" },
    new Date("2026-09-22T12:00:00.000Z"),
  );
  assert.equal(plan.billingModel, "complimentary");
  assert.equal(plan.subscriptionStatus, "complimentary");
  assert.equal(plan.trialEndsAt, "");
  assert.deepEqual(siteEntitlement({ servicePlan: plan }), { public: true, reason: "complimentary" });
});

test("revoked complimentary access requires a paid subscription", () => {
  const plan = createSubscriptionRequiredServicePlan(
    { revokedBy: "owner@webfactorypr.com", previousPlan: {} },
    new Date("2026-09-22T13:00:00.000Z"),
  );
  assert.equal(plan.billingModel, "subscription");
  assert.equal(plan.subscriptionStatus, "subscription_required");
  assert.deepEqual(siteEntitlement({ servicePlan: plan }), { public: false, reason: "subscription_required" });
});

test("builder-created setup stays private until the owner starts the trial", () => {
  const site = {
    servicePlan: {
      billingModel: "subscription",
      billingStatus: "pending_activation",
      subscriptionStatus: "not_started",
      trialStartedAt: "",
      trialEndsAt: "",
    },
  };
  assert.deepEqual(siteEntitlement(site), { public: false, reason: "not_started" });
});

test("legacy one-time plans remain public and independent", () => {
  const entitlement = siteEntitlement({ servicePlan: { billingModel: "one_time", billingStatus: "paid" } });
  assert.deepEqual(entitlement, { public: true, reason: "one_time" });
});

test("past-due renewals stay public during Stripe retry lifecycle", () => {
  const entitlement = siteEntitlement({ servicePlan: { billingModel: "subscription", subscriptionStatus: "past_due" } });
  assert.deepEqual(entitlement, { public: true, reason: "payment_retry" });
  assert.equal(siteEntitlement({ servicePlan: { billingModel: "subscription", subscriptionStatus: "unpaid" } }).public, false);
  assert.equal(siteEntitlement({ servicePlan: { billingModel: "subscription", subscriptionStatus: "canceled" } }).public, false);
});

test("cancel-at-period-end remains active until Stripe deletes the subscription", () => {
  const current = { billingModel: "subscription", subscriptionStatus: "active", billingStatus: "paid" };
  const updated = billingStateFor({
    type: "customer.subscription.updated",
    data: { object: { id: "sub_example", status: "active", cancel_at_period_end: true, current_period_end: 1_800_000_000 } },
  }, current);
  assert.equal(updated.cancelAtPeriodEnd, true);
  assert.equal(siteEntitlement({ servicePlan: updated }).public, true);

  const deleted = billingStateFor({
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_example", status: "canceled", cancel_at_period_end: true } },
  }, updated);
  assert.equal(deleted.subscriptionStatus, "canceled");
  assert.equal(siteEntitlement({ servicePlan: deleted }).public, false);
});

test("invoice events preserve cancellation scheduling metadata", () => {
  const current = {
    billingModel: "subscription",
    subscriptionStatus: "active",
    billingStatus: "paid",
    cancelAtPeriodEnd: true,
    currentPeriodEnd: "2027-01-01T00:00:00.000Z",
  };
  const failed = billingStateFor({
    type: "invoice.payment_failed",
    data: { object: { customer: "cus_example", subscription: "sub_example" } },
  }, current);
  assert.equal(failed.subscriptionStatus, "past_due");
  assert.equal(failed.cancelAtPeriodEnd, true);
  assert.equal(failed.currentPeriodEnd, current.currentPeriodEnd);
});
