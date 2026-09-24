import test from "node:test";
import assert from "node:assert/strict";
import { assertStripeWriteAllowed, detectStripeKeyMode, stripeRuntimeState } from "./stripe-runtime.mjs";

test("detectStripeKeyMode recognizes Stripe live and test secrets", () => {
  assert.equal(detectStripeKeyMode("sk_live_example"), "live");
  assert.equal(detectStripeKeyMode("rk_live_example"), "live");
  assert.equal(detectStripeKeyMode("sk_test_example"), "test");
  assert.equal(detectStripeKeyMode("rk_test_example"), "test");
  assert.equal(detectStripeKeyMode(""), "missing");
  assert.equal(detectStripeKeyMode("not-a-stripe-key"), "unknown");
});

test("test Stripe keys are write-safe outside production", () => {
  const state = stripeRuntimeState({ context: "deploy-preview", secretKey: "sk_test_example" });
  assert.equal(state.keyMode, "test");
  assert.equal(state.writeSafe, true);
  assert.doesNotThrow(() => assertStripeWriteAllowed({ context: "deploy-preview", secretKey: "sk_test_example" }));
});

test("live Stripe keys are write-safe only in production", () => {
  assert.equal(stripeRuntimeState({ context: "production", secretKey: "sk_live_example" }).writeSafe, true);
  assert.throws(
    () => assertStripeWriteAllowed({ context: "deploy-preview", secretKey: "sk_live_example" }),
    /Live Stripe writes are disabled outside production/,
  );
  assert.throws(
    () => assertStripeWriteAllowed({ context: "branch-deploy", secretKey: "rk_live_example" }),
    /Live Stripe writes are disabled outside production/,
  );
});

test("missing or unknown Stripe keys are rejected for writes", () => {
  assert.throws(
    () => assertStripeWriteAllowed({ context: "deploy-preview", secretKey: "" }),
    /Stripe is not configured/,
  );
  assert.throws(
    () => assertStripeWriteAllowed({ context: "deploy-preview", secretKey: "invalid" }),
    /could not be verified/,
  );
});
