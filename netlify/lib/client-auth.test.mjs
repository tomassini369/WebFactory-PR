import test from "node:test";
import assert from "node:assert/strict";
import { siteRoleCapabilities, membershipHasCapability } from "./client-auth.mjs";

test("owner has billing and refund access", () => {
  const caps = siteRoleCapabilities("owner");
  assert.ok(caps.includes("billing"));
  assert.ok(caps.includes("refunds"));
});

test("manager can operate business but cannot manage billing", () => {
  const caps = siteRoleCapabilities("manager");
  assert.ok(caps.includes("orders"));
  assert.ok(caps.includes("payments"));
  assert.ok(caps.includes("refunds"));
  assert.equal(caps.includes("billing"), false);
});

test("employee is limited to booking and customer work", () => {
  const caps = siteRoleCapabilities("employee");
  assert.deepEqual(caps, ["overview","bookings","customers"]);
});

test("cashier can use POS but cannot refund or edit catalog", () => {
  assert.equal(membershipHasCapability({ role: "cashier" }, "pos"), true);
  assert.equal(membershipHasCapability({ role: "cashier" }, "payments"), true);
  assert.equal(membershipHasCapability({ role: "cashier" }, "refunds"), false);
  assert.equal(membershipHasCapability({ role: "cashier" }, "catalog"), false);
});

test("unknown roles fall back to staff capabilities", () => {
  assert.deepEqual(siteRoleCapabilities("unknown"), ["overview","bookings","customers"]);
});
