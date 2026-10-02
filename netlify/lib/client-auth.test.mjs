import test from "node:test";
import assert from "node:assert/strict";
import { siteRoleCapabilities, membershipHasCapability, authorizeSiteUser, isPlatformAdmin, errorResponse, assertSameOrigin } from "./client-auth.mjs";

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

test("employee can manage assigned bookings, kitchen orders and customer work", () => {
  const caps = siteRoleCapabilities("employee");
  assert.deepEqual(caps, ["overview","share","bookings","customers","kitchen"]);
});

test("cashier can use POS but cannot refund or edit catalog", () => {
  assert.equal(membershipHasCapability({ role: "cashier" }, "pos"), true);
  assert.equal(membershipHasCapability({ role: "cashier" }, "payments"), true);
  assert.equal(membershipHasCapability({ role: "cashier" }, "refunds"), false);
  assert.equal(membershipHasCapability({ role: "cashier" }, "catalog"), false);
});

test("unknown or missing roles have no permissions", () => {
  assert.deepEqual(siteRoleCapabilities("unknown"), []);
  assert.deepEqual(siteRoleCapabilities(), []);
  assert.equal(membershipHasCapability({}, "billing"), false);
  for (const role of ["constructor", "toString", "__proto__"]) {
    assert.deepEqual(siteRoleCapabilities(role), []);
    assert.equal(membershipHasCapability({ role }, "billing"), false);
  }
});

test("every client role can view and share its public business QR", () => {
  for (const role of ["owner", "manager", "employee", "cashier", "staff"]) {
    assert.equal(membershipHasCapability({ role }, "share"), true);
  }
});

test("cross-business access and missing membership roles are denied", () => {
  const user = { email: "owner@example.com" };
  assert.throws(() => authorizeSiteUser(user, { members: [{ email: "other@example.com", role: "owner" }] }), { status: 403 });
  assert.throws(() => authorizeSiteUser(user, { members: [{ email: user.email }] }), { status: 403 });
  assert.throws(() => authorizeSiteUser(user, { members: [{ email: user.email, role: "cashier" }] }, ["owner"]), { status: 403 });
  assert.equal(authorizeSiteUser(user, { members: [{ email: "OWNER@example.com", role: "owner" }] }, ["owner"]).membership.role, "owner");
});

test("platform admin roles are resolved consistently from trusted identity metadata", () => {
  assert.equal(isPlatformAdmin({ app_metadata: { roles: ["webfactory_owner"] } }), true);
  assert.equal(isPlatformAdmin({ user_metadata: { roles: ["admin"] } }), false);
  assert.equal(authorizeSiteUser({ email: "admin@example.com", app_metadata: { roles: ["admin"] } }, { members: [] }).membership.role, "admin");
});

test("server errors hide provider details and cannot set an invalid response status", async () => {
  const response = errorResponse({ status: 900, message: "private provider token" });
  assert.equal(response.status, 500);
  assert.equal((await response.json()).message.includes("private"), false);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("write requests require same-origin protection", () => {
  assert.throws(() => assertSameOrigin(new Request("https://webfactorypr.com/api", { method: "POST" })), { status: 403 });
  assert.throws(() => assertSameOrigin(new Request("https://webfactorypr.com/api", { method: "POST", headers: { origin: "https://other.example" } })), { status: 403 });
  assert.doesNotThrow(() => assertSameOrigin(new Request("https://webfactorypr.com/api", { method: "POST", headers: { origin: "https://webfactorypr.com" } })));
});
