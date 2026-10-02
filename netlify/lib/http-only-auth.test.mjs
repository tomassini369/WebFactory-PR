import test from "node:test";
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { login, refreshSession } from "@netlify/identity";
import { withHttpOnlyIdentityCookies, publicIdentityUser } from "./http-only-auth.mjs";
import { createPortalSession } from "./portal-session.mjs";
import { createCompletePortalAccess } from "./complete-portal-access.mjs";

function setNetlify(t, value) {
  const previous = globalThis.Netlify;
  globalThis.Netlify = value;
  t.after(() => { if(previous === undefined) delete globalThis.Netlify; else globalThis.Netlify = previous; });
}

function contextFor(values = {}) {
  const writes = [];
  const deletes = [];
  return { url: "https://example.com", writes, deletes, cookies: {
    get: name => values[name], set: options => writes.push(options), delete: name => deletes.push(name),
  } };
}
const req = body => new Request("https://example.com/auth", {
  method: "POST", headers: { origin: "https://example.com", "content-type": "application/json" }, body: JSON.stringify(body),
});
function checkCookies(context, jwt, refresh) {
  assert.deepEqual(context.writes.map(cookie => cookie.name), ["nf_jwt", "nf_refresh"]);
  assert.equal(context.writes[0].value, jwt);
  assert.equal(context.writes[1].value, refresh);
  for (const cookie of context.writes) {
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.secure, true);
    assert.equal(cookie.sameSite, "Lax");
    assert.equal(cookie.path, "/");
    assert.equal(cookie.domain, undefined);
  }
}

test("real Identity SDK login emits only protected cookies, isolated across concurrent requests", async t => {
  const scope = new AsyncLocalStorage();
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.endsWith("/token")) {
      const email = new URLSearchParams(options.body).get("username");
      await new Promise(resolve => setImmediate(resolve));
      return Response.json({ access_token: email, refresh_token: `refresh:${email}` });
    }
    assert.ok(url.endsWith("/user"));
    return Response.json({ id: "id", email: options.headers.Authorization.slice(7) });
  });
  setNetlify(t, { get context() { return scope.getStore(); } });
  const contexts = [contextFor(), contextFor()];
  await Promise.all(contexts.map((context,index) => scope.run(context, async () => {
    const original = context.cookies.set;
    const user = await withHttpOnlyIdentityCookies(context, () => login(`user${index}@example.com`, "password"));
    assert.equal(user.email, `user${index}@example.com`);
    checkCookies(context, user.email, `refresh:${user.email}`);
    assert.equal(context.cookies.set, original);
  })));
});

test("failed SDK operation emits no pending auth cookies and restores the request jar", async t => {
  const context = contextFor();
  setNetlify(t, { context });
  const original = context.cookies.set;
  await assert.rejects(withHttpOnlyIdentityCookies(context, async () => {
    context.cookies.set({ name: "nf_jwt", value: "secret", httpOnly: false });
    throw new Error("failure");
  }));
  assert.deepEqual(context.writes, []);
  assert.equal(context.cookies.set, original);
});

test("real SDK refresh rotates HttpOnly cookies without returning tokens to the browser", async t => {
  const jwt = `a.${Buffer.from(JSON.stringify({exp:1})).toString("base64url")}.b`;
  const context = contextFor({ nf_jwt: jwt, nf_refresh: "old-refresh" });
  setNetlify(t, { context });
  t.mock.method(globalThis, "fetch", async (_url,options) => {
    assert.equal(new URLSearchParams(options.body).get("refresh_token"), "old-refresh");
    return Response.json({ access_token: "new-jwt", refresh_token: "new-refresh" });
  });
  const handler = createPortalSession({ getUser: async () => null, refreshSession });
  const response = await handler(req({ action: "refresh" }), context);
  assert.deepEqual(await response.json(), { ok: true });
  checkCookies(context, "new-jwt", "new-refresh");
});

test("session exposes only allowlisted user details and requires origin protection for logout", async () => {
  let loggedOut = false;
  const handler = createPortalSession({
    getUser: async () => ({ id:"id",email:"a@example.com",roles:["owner"],access_token:"private",userMetadata:{secret:"private"} }),
    logout: async () => { loggedOut = true; },
  });
  const response = await handler(new Request("https://example.com/auth"), contextFor());
  const data = await response.json();
  assert.deepEqual(data.user, { id:"id",email:"a@example.com",roles:["owner"] });
  assert.equal(response.headers.get("cache-control"), "no-store");
  const crossOrigin = new Request("https://example.com/auth", {method:"POST",headers:{origin:"https://other.example","content-type":"application/json"},body:JSON.stringify({action:"logout"})});
  assert.equal((await handler(crossOrigin, contextFor())).status,403);
  assert.equal(loggedOut,false);
  assert.equal((await handler(req({action:"logout"}),contextFor())).status,200);
  assert.equal(loggedOut,true);
});

test("recovery and invite verify on the server, require long passwords and expose no provider tokens", async t => {
  const runtime = {context:null};
  setNetlify(t,runtime);
  for (const action of ["invite","recovery"]) {
    const context = contextFor();
    runtime.context = context;
    const calls = [];
    const fetcher = async (url,options) => {
      calls.push({url,options});
      if(url.endsWith("/verify")) return Response.json({access_token:"verification-secret",refresh_token:"must-not-leak"});
      assert.equal(options.headers.Authorization,"Bearer verification-secret");
      return Response.json({id:"id",email:"a@example.com"});
    };
    const identity = { getIdentityConfig:()=>({url:"https://example.com/.netlify/identity",token:"operator-secret"}),login:async(email,password)=>{
      assert.equal(email,"a@example.com");assert.equal(password,"a long password for testing");
      context.cookies.set({name:"nf_jwt",value:"session-secret"});
      context.cookies.set({name:"nf_refresh",value:"refresh-secret"});
      return {id:"id",email,roles:["owner"],access_token:"must-not-leak"};
    } };
    const handler = createCompletePortalAccess(identity,fetcher);
    assert.equal((await handler(req({action,token:"valid-token",password:"short"}),context)).status,400);
    assert.equal(calls.length,0);
    const response = await handler(req({action,token:"valid-token",password:"a long password for testing"}),context);
    assert.equal(response.status,200);
    assert.equal(JSON.stringify(await response.json()).includes("secret"),false);
    checkCookies(context,"session-secret","refresh-secret");
    const verification = JSON.parse(calls[0].options.body);
    assert.equal(verification.type,action==="invite"?"signup":"recovery");
    assert.equal(calls.filter(call=>call.options.method==="PUT").length,action==="recovery"?1:0);
  }
});

test("expired account links and short Unicode passwords do not establish a session", async () => {
  let calls = 0;
  const handler = createCompletePortalAccess({getIdentityConfig:()=>({url:"https://example.com/.netlify/identity"}),login:()=>{throw new Error("must not log in");}},async()=>{
    calls++;return Response.json({msg:"private detail"},{status:400});
  });
  assert.equal((await handler(req({action:"recovery",token:"valid-token",password:"😀".repeat(8)}),contextFor())).status,400);
  assert.equal(calls,0);
  const response = await handler(req({action:"recovery",token:"expired-token",password:"a long password for testing"}),contextFor());
  assert.equal(response.status,400);
  assert.equal(JSON.stringify(await response.json()).includes("private"),false);
});

test("missing or malformed provider users cannot become authenticated UI users", () => {
  assert.equal(publicIdentityUser({email:"a@example.com"}),null);
  assert.equal(publicIdentityUser({id:"id"}),null);
});
