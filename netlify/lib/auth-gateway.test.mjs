import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { createAuthGateway } from "./auth-gateway.mjs";

const request = (body, extra = {}) => new Request("https://example.com/auth", {
  method: "POST", headers: { origin: "https://example.com", "content-type": "application/json", ...extra }, body: JSON.stringify(body),
});

test("login normalizes email but preserves the password and never returns provider tokens", async () => {
  let calls = 0;
  const gateway = createAuthGateway("login", { login: async (email, password) => {
    calls++;
    assert.equal(email, "owner@example.com");
    assert.equal(password, " secret password ");
    return { access_token: "secret", email };
  } });
  const response = await gateway(request({ email: " OWNER@example.com ", password: " secret password " }));
  assert.equal(calls, 1);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("cross-origin, oversized and invalid requests never reach Identity", async () => {
  let calls = 0;
  const gateway = createAuthGateway("login", { login: async () => calls++ });
  assert.equal((await gateway(request({}, { origin: "https://attacker.example" }))).status, 403);
  assert.equal((await gateway(request({ email: "a@example.com", password: "x".repeat(9000) }))).status, 413);
  assert.equal((await gateway(request({ email: "a@example.com", password: "x".repeat(1025) }))).status, 401);
  assert.equal((await gateway(request({}, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await gateway(new Request("https://example.com/auth"))).status, 405);
  assert.equal(calls, 0);
});

test("login hides provider messages and distinguishes throttling from provider outages", async () => {
  for (const [provider, expected] of [[400,401],[403,401],[429,429],[500,503],[undefined,503]]) {
    const gateway = createAuthGateway("login", { login: async () => { throw Object.assign(new Error("user exists; private provider details"), { status: provider }); } });
    const response = await gateway(request({ email: "a@example.com", password: "password" }));
    assert.equal(response.status, expected);
    assert.deepEqual(await response.json(), { ok: false, message: "Unable to sign in." });
  }
});

test("recovery has identical responses for known, unknown, malformed and provider-failed accounts", async () => {
  let calls = 0;
  const gateway = createAuthGateway("recovery", { requestPasswordRecovery: async email => {
    calls++;
    if(email === "unknown@example.com") throw new Error("Account not found");
  } });
  for (const email of ["known@example.com", "unknown@example.com", "invalid", null]) {
    const response = await gateway(request({ email }));
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { ok: true });
  }
  assert.equal(calls, 2);
});

test("native rate limits protect both auth gateways", async () => {
  const login = await import("../functions/portal-login.mjs");
  const recovery = await import("../functions/portal-recovery.mjs");
  assert.deepEqual(login.config.rateLimit, { windowLimit: 10, windowSize: 60, aggregateBy: ["ip"] });
  assert.deepEqual(recovery.config.rateLimit, { windowLimit: 5, windowSize: 180, aggregateBy: ["ip"] });
});

test("every declared native rate limit uses Netlify's supported window", async () => {
  const directory = new URL("../functions/", import.meta.url);
  for (const filename of await readdir(directory)) {
    if (!filename.endsWith(".mjs")) continue;
    const source = await readFile(new URL(filename, directory), "utf8");
    for (const match of source.matchAll(/windowSize\s*:\s*(\d+)/g)) {
      assert.ok(Number(match[1]) > 0 && Number(match[1]) <= 180, `${filename} has an unsupported rate-limit window`);
    }
  }
});
