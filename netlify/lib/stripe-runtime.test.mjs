import test from "node:test";
import assert from "node:assert/strict";
import { assertStripeWriteAllowed, detectDeployContext, detectStripeKeyMode, stripeRuntimeState } from "./stripe-runtime.mjs";

test("detectStripeKeyMode recognizes Stripe live and test secrets", () => {
  assert.equal(detectStripeKeyMode("sk_live_example"), "live");
  assert.equal(detectStripeKeyMode("rk_live_example"), "live");
  assert.equal(detectStripeKeyMode("sk_test_example"), "test");
  assert.equal(detectStripeKeyMode("rk_test_example"), "test");
  assert.equal(detectStripeKeyMode(""), "missing");
  assert.equal(detectStripeKeyMode("not-a-stripe-key"), "unknown");
});

test("detectDeployContext recognizes preview, branch and production hosts", () => {
  const productionUrl = "https://webfactorypr.com";
  assert.equal(detectDeployContext({ requestUrl: "https://deploy-preview-36--webfactorypr.netlify.app/path", productionUrl }), "deploy-preview");
  assert.equal(detectDeployContext({ requestUrl: "https://feature-x--webfactorypr.netlify.app/path", productionUrl }), "branch-deploy");
  assert.equal(detectDeployContext({ requestUrl: "https://webfactorypr.com/path", productionUrl }), "production");
  assert.equal(detectDeployContext({ requestUrl: "https://unknown.example/path", productionUrl }), "unknown");
});

test("test Stripe keys are write-safe outside production", () => {
  const state = stripeRuntimeState({
    requestUrl: "https://deploy-preview-36--webfactorypr.netlify.app",
    productionUrl: "https://webfactorypr.com",
    secretKey: "sk_test_example",
  });
  assert.equal(state.keyMode, "test");
  assert.equal(state.context, "deploy-preview");
  assert.equal(state.writeSafe, true);
  assert.doesNotThrow(() => assertStripeWriteAllowed({
    requestUrl: "https://deploy-preview-36--webfactorypr.netlify.app",
    productionUrl: "https://webfactorypr.com",
    secretKey: "sk_test_example",
  }));
});

test("live Stripe keys are write-safe only in production", () => {
  assert.equal(stripeRuntimeState({
    requestUrl: "https://webfactorypr.com",
    productionUrl: "https://webfactorypr.com",
    secretKey: "sk_live_example",
  }).writeSafe, true);
  assert.throws(
    () => assertStripeWriteAllowed({
      requestUrl: "https://deploy-preview-36--webfactorypr.netlify.app",
      productionUrl: "https://webfactorypr.com",
      secretKey: "sk_live_example",
    }),
    /Live Stripe writes are disabled outside production/,
  );
  assert.throws(
    () => assertStripeWriteAllowed({
      requestUrl: "https://feature-x--webfactorypr.netlify.app",
      productionUrl: "https://webfactorypr.com",
      secretKey: "rk_live_example",
    }),
    /Live Stripe writes are disabled outside production/,
  );
});

test("unknown host with a live Stripe key fails closed", () => {
  const state = stripeRuntimeState({
    requestUrl: "https://unknown.example",
    productionUrl: "https://webfactorypr.com",
    secretKey: "sk_live_example",
  });
  assert.equal(state.context, "unknown");
  assert.equal(state.writeSafe, false);
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
