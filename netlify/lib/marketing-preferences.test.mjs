import test from "node:test";
import assert from "node:assert/strict";
import { reviewEmailEligible, unsubscribeUrl, unsubscribeToken, preferenceKey } from "./marketing-preferences.mjs";

test("review emails require opt-in and postal address; unsubscribe is scoped to one business and repeatable", async () => {
  const rows = new Map();
  const store = { get: async key => rows.get(key), setJSON: async (key, value) => rows.set(key, value) };
  const site = { siteId: "a", reviewSettings: { postalAddress: "Business mailing address" } };
  const request = { customer: { email: "customer@example.com", reviewOptIn: true } };
  assert.equal(await reviewEmailEligible(site, request, store), true);
  assert.equal(await reviewEmailEligible({ ...site, reviewSettings: {} }, request, store), false);
  assert.equal(await reviewEmailEligible(site, { customer: { email: request.customer.email } }, store), false);
  const url = await unsubscribeUrl(site.siteId, request.customer.email, store);
  const token = new URL(url).searchParams.get("token");
  assert.equal(url.includes(request.customer.email), false);
  assert.equal(await unsubscribeToken(token, "a", store), true);
  assert.equal(await unsubscribeToken(token, "a", store), true);
  assert.equal(await reviewEmailEligible(site, request, store), false);
  assert.equal(await reviewEmailEligible({ ...site, siteId: "b" }, request, store), true);
  assert.equal(await unsubscribeToken("forged", "a", store), false);
  assert.equal(rows.has(preferenceKey("a", "CUSTOMER@example.com")), true);
});
