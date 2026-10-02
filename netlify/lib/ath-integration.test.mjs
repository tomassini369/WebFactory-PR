import test from "node:test";
import assert from "node:assert/strict";
import { getStore } from "@netlify/blobs";
import { validateAthCredentials, encryptAthCredentials, decryptAthCredentials, matchAthPayment } from "./ath-domain.mjs";
import { createAthCheckout, configureAth, getAthSession } from "./ath-movil.mjs";
import { clientSiteStore, clientOAuthStore, clientCommerceStore, commerceKey, getClientSite, publicClientSite } from "./client-store.mjs";
import { disconnectAth } from "./client-lifecycle.mjs";
import integration from "../functions/client-integration-management.mjs";
import checkout from "../functions/ath-checkout.mjs";
import verify from "../functions/ath-payment-status.mjs";

const publicToken = "unit-public-token-abcdefghijklmnop";
const privateToken = "unit-private-token-abcdefghijklmnop";
function fixture(t) {
  const rows = new Map(); const calls = []; const versions=new Map(); let revision=0;
  globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:"unit-netlify-site",token:"unit-blobs-token",deployID:"unit-deploy"})).toString("base64");
  const storePrototype=Object.getPrototypeOf(getStore("unit-test"));
  t.mock.method(storePrototype, "get", async function(key) { return structuredClone(rows.get(`${this.name}/${key}`) || null); });
  t.mock.method(storePrototype, "getWithMetadata",async function(key){const full=`${this.name}/${key}`;return rows.has(full)?{data:structuredClone(rows.get(full)),etag:versions.get(full)}:null});
  t.mock.method(storePrototype, "setJSON", async function(key, value, options = {}) {
    const fullKey = `${this.name}/${key}`;
    if (options.onlyIfNew && rows.has(fullKey)||options.onlyIfMatch&&versions.get(fullKey)!==options.onlyIfMatch) return { modified: false };
    rows.set(fullKey, structuredClone(value));versions.set(fullKey,String(++revision)); return { modified: true, etag: versions.get(fullKey) };
  });
  t.mock.method(storePrototype, "delete", async function(key) { rows.delete(`${this.name}/${key}`); });
  t.mock.method(storePrototype, "list", async function({ prefix = "" } = {}) {
    return { blobs: [...rows.keys()].filter(key => key.startsWith(`${this.name}/${prefix}`)).map(key => ({ key: key.slice(this.name.length + 1) })) };
  });
  globalThis.Netlify = { context: { deploy: { context: "production" } }, env: { get: key => key === "WEBFACTORY_TOKEN_ENCRYPTION_KEY" ? "unit-key-only-not-a-live-secret" : key === "URL" ? "https://webfactorypr.com" : "" } };
  globalThis.netlifyIdentityContext = { user: { sub: "unit-owner", email: "owner@example.invalid", app_metadata: {} } };
  t.after(() => { delete globalThis.Netlify; delete globalThis.netlifyIdentityContext; delete globalThis.netlifyBlobsContext; });
  t.mock.method(globalThis, "fetch", async (...args) => { calls.push(args); throw new Error("Unexpected external request in test."); });
  const site = { siteId: "business-a", slug: "business-a", status: "active", business: { name: "<script>business</script>" }, members: [{ email: "owner@example.invalid", role: "owner" }], servicePlan: { subscriptionStatus: "active" }, catalog: [{ id: "product", type: "product", name: "Product", price: 10, active: true, inventory: 10, trackInventory: true }], paymentRules: { methods: { stripe: true, ath: false }, stripeConnectedAccountId: "acct_unrelated_stripe", stripeCapabilityStatus: "active" } };
  const record = { siteId: site.siteId, transactionId: "txn-unit", kind: "order", items: [{ id: "product", name: "Product", quantity: 2, unitAmount: 1000 }], customer: { name: "Unit customer", email: "unit@example.invalid" }, amountTotal: 2000, subtotal: 2000, tax: 0, currency: "usd", paymentStatus: "pending", status: "payment_pending", createdAt: new Date().toISOString() };
  return { rows, site, record, calls };
}
async function prepare(f) {
  await clientSiteStore().setJSON(`sites/${f.site.siteId}.json`, f.site);
  const site = await configureAth(f.site, { publicToken, privateToken });
  const result = await createAthCheckout(site, f.record, { requestUrl: "https://webfactorypr.com/.netlify/functions/create-client-checkout", returnUrl: "/sites/business-a", lang: "es" });
  const token = new URL(result.checkoutUrl).searchParams.get("token");
  return { site, token, ...await getAthSession(token) };
}
function request(path, body, origin = "https://webfactorypr.com") {
  return new Request(`https://webfactorypr.com/.netlify/functions/${path}`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
function payment(session, extra = {}) { return { transactionType: "ECOMMERCE", status: "COMPLETED", referenceNumber: "ath-unit-reference-123", total: 20, metadata1: session.metadata1, metadata2: session.metadata2, ...extra }; }

test("ATH credentials are encrypted, authenticated to their business, and cannot be substituted", t => {
  fixture(t); const encrypted = encryptAthCredentials("a", { publicToken, privateToken });
  assert.ok(!JSON.stringify(encrypted).includes(privateToken));
  assert.deepEqual(decryptAthCredentials("a", encrypted), { publicToken, privateToken });
  assert.throws(() => decryptAthCredentials("b", encrypted));
  assert.throws(() => decryptAthCredentials("a", { ...encrypted, data: Buffer.from("tampered").toString("base64") }));
  assert.throws(() => validateAthCredentials("/MyBusiness", privateToken));
});

test("saving ATH tokens preserves Stripe and does not claim a verified connection or make a charge", async t => {
  const f = fixture(t); const p = await prepare(f);
  assert.equal(p.site.paymentRules.stripeConnectedAccountId, f.site.paymentRules.stripeConnectedAccountId);
  assert.equal(p.site.paymentRules.methods.stripe, true);
  assert.equal(p.site.paymentRules.ath.status, "credentials_saved");
  assert.ok(!JSON.stringify(p.site).includes(privateToken));
  assert.ok(!JSON.stringify(publicClientSite(p.site)).includes(publicToken));
  assert.equal(f.calls.length, 0);
});

test("integration writes reject other businesses, managers, and cross-origin requests", async t => {
  const f = fixture(t); await clientSiteStore().setJSON(`sites/${f.site.siteId}.json`, f.site);
  const body = { siteId: f.site.siteId, action: "configure_ath", publicToken, privateToken };
  assert.equal((await integration(request("client-integration-management", body, "https://attacker.invalid"))).status, 403);
  globalThis.netlifyIdentityContext.user.email = "unrelated@example.invalid";
  assert.equal((await integration(request("client-integration-management", body))).status, 403);
  globalThis.netlifyIdentityContext.user.email = "owner@example.invalid";
  f.site.members[0].role = "manager"; await clientSiteStore().setJSON(`sites/${f.site.siteId}.json`, f.site);
  assert.equal((await integration(request("client-integration-management", body))).status, 403);
  assert.equal(await clientOAuthStore().get(`ath/tokens/${f.site.siteId}.json`), null);
});

test("preview contexts cannot save live credentials or start live ATH payments", async t => {
  const f = fixture(t); const p = await prepare(f); globalThis.Netlify.context.deploy.context = "deploy-preview";
  assert.equal((await integration(request("client-integration-management", { siteId: f.site.siteId, action: "configure_ath", publicToken, privateToken }))).status, 503);
  await assert.rejects(createAthCheckout(p.site, f.record, { requestUrl: "https://deploy-preview-50--webfactorypr.netlify.app" }), { status: 503 });
  assert.equal(f.calls.length, 0);
});

test("official SDK checkout includes only public credentials, escapes business content, and permits its dependencies", async t => {
  const f = fixture(t); const p = await prepare(f);
  const response = await checkout(new Request(`https://webfactorypr.com/.netlify/functions/ath-checkout?token=${p.token}`));
  const html = await response.text();
  assert.equal(response.status, 200); assert.ok(html.includes("athmovil_base.js"));
  assert.ok(html.includes(publicToken)); assert.ok(!html.includes(privateToken));
  assert.ok(!html.includes("<script>business</script>"));
  assert.match(response.headers.get("Content-Security-Policy"), /www\.gstatic\.com/);
  assert.match(response.headers.get("Content-Security-Policy"), /wss:\/\/\*\.firebaseio\.com/);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("ATH verification requires completed ecommerce, correct amount, unique metadata and an unrefunded payment", t => {
  fixture(t); const session = { referenceNumber: "ath-unit-reference-123", metadata1: "one", metadata2: "business" }; const record = { amountTotal: 2000 };
  for (const extra of [{ status: "CONFIRM" }, { status: "OPEN" }, { total: 19.99 }, { metadata1: "another-order" }, { metadata2: "other-business" }, { transactionType: "PAYMENT" }, { totalRefundedAmount: 1 }]) assert.throws(() => matchAthPayment([payment(session, extra)], session, record));
  assert.throws(() => matchAthPayment([], session, record));
  assert.equal(matchAthPayment([payment(session)], session, record).total, 20);
});

test("a forged callback cannot mark an order paid", async t => {
  const f = fixture(t); const p = await prepare(f);
  t.mock.method(globalThis, "fetch", async () => Response.json([]));
  const response = await verify(request("ath-payment-status", { token: p.token, referenceNumber: "ath-unit-reference-123", paid: true, total: 20 }));
  assert.equal(response.status, 409);
  assert.equal((await getAthSession(p.token)).record.paymentStatus, "pending");
});

test("a server-verified payment settles once, updates inventory and receipt, and never uses Stripe", async t => {
  const f = fixture(t); const p = await prepare(f); let searches = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://www.athmovil.com/api/v4/searchTransaction"); searches++;
    const body = JSON.parse(options.body); assert.equal(body.privateToken, privateToken); assert.equal(body.publicToken, publicToken);
    return Response.json([payment(p.session)]);
  });
  const payload = { token: p.token, referenceNumber: "ath-unit-reference-123" };
  assert.equal((await verify(request("ath-payment-status", payload))).status, 200);
  assert.equal((await verify(request("ath-payment-status", payload))).status, 200);
  const current = await getClientSite(f.site.siteId);
  assert.equal(current.catalog[0].inventory, 8);
  assert.equal(current.paymentRules.ath.status, "connected");
  assert.equal(current.paymentRules.stripeConnectedAccountId, f.site.paymentRules.stripeConnectedAccountId);
  const paid = await clientCommerceStore().get(commerceKey(f.site.siteId, "orders", f.record.transactionId));
  assert.equal(paid.paymentProvider, "ath_movil"); assert.ok(paid.receiptId); assert.equal(searches, 1);
});

test("disconnecting ATH removes its saved tokens without altering Stripe", async t => {
  const f = fixture(t); const p = await prepare(f); const disconnected = await disconnectAth(p.site);
  assert.equal(disconnected.paymentRules.ath.credentialsConfigured, false);
  assert.equal(disconnected.paymentRules.methods.ath, false);
  assert.equal(disconnected.paymentRules.stripeConnectedAccountId, f.site.paymentRules.stripeConnectedAccountId);
  assert.equal(await clientOAuthStore().get(`ath/tokens/${f.site.siteId}.json`), null);
  assert.equal((await checkout(new Request(`https://webfactorypr.com/.netlify/functions/ath-checkout?token=${p.token}`))).status, 409);
});
