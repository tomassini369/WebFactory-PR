import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

let moduleId = 0;
async function browserAuth(t, responses, hash = "") {
  const requests = [];
  const removed = [];
  const historyCalls = [];
  const channels = [];
  const globals = {
    window: { location: { hash, pathname: "/password-recovery", search: "" }, setInterval: () => 1, clearInterval: () => {} },
    document: { visibilityState: "visible", addEventListener: () => {}, removeEventListener: () => {} },
    localStorage: { removeItem: key => removed.push(key), setItem: () => { throw new Error("No auth secrets may be stored"); } },
    history: { replaceState: (_a,_b,url) => { historyCalls.push(url); globals.window.location.hash = ""; } },
    navigator: { locks: { request: async (_name, callback) => await callback() } },
    BroadcastChannel: class {
      constructor() { channels.push(this); }
      postMessage(message) { this.sent = message; }
      close() {}
    },
    fetch: async (url, options) => {
      requests.push({ url, ...options, payload: options.body ? JSON.parse(options.body) : null });
      const response = responses.shift();
      assert.ok(response, "unexpected authentication request");
      return typeof response === "function" ? response() : Response.json(response.body, { status: response.status || 200 });
    },
  };
  Object.defineProperty(globals.document,"cookie",{get:()=>{throw new Error("Browser auth must not read cookies");},set:()=>{throw new Error("Browser auth must not write cookies");}});
  for(const [key,value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
    t.after(()=>descriptor ? Object.defineProperty(globalThis,key,descriptor) : delete globalThis[key]);
  }
  const source = await readFile(new URL("../../src/portal-auth.ts",import.meta.url),"utf8");
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const api = await import(`data:text/javascript;base64,${Buffer.from(compiled+`\n// test ${moduleId++}`).toString("base64")}`);
  return {api,requests,removed,historyCalls,channels};
}

test("browser session reads coalesce, renew before reading, and never access tokens", async t => {
  const b = await browserAuth(t,[{body:{ok:true}},{body:{ok:true,user:{id:"id",email:"a@example.com"}}}]);
  const [first,second] = await Promise.all([b.api.getUser(),b.api.getUser()]);
  assert.deepEqual(first,second);
  assert.equal(b.requests.length,2);
  assert.deepEqual(b.requests[0].payload,{action:"refresh"});
  assert.equal(b.requests[1].method,"GET");
  assert.ok(b.requests.every(request=>request.credentials==="same-origin"&&request.cache==="no-store"));
  assert.deepEqual(b.removed,["gotrue.user"]);
});

test("recovery callback survives repeated React effects and remains only in memory", async t => {
  const b = await browserAuth(t,[{body:{ok:true,user:{id:"id",email:"a@example.com"}}}],"#recovery_token=email-link-secret");
  assert.deepEqual(await b.api.handleAuthCallback(),await b.api.handleAuthCallback());
  assert.deepEqual(b.historyCalls,["/password-recovery"]);
  await b.api.updateUser({password:"a long password for testing"});
  assert.deepEqual(b.requests[0].payload,{action:"recovery",token:"email-link-secret",password:"a long password for testing"});
  assert.equal(await b.api.handleAuthCallback(),null);
  await assert.rejects(b.api.updateUser({password:"another long password"}));
  assert.equal(b.requests.length,1);
});

test("failed logout preserves UI auth; successful logout broadcasts no private data", async t => {
  const b = await browserAuth(t,[{status:503,body:{ok:false}},{body:{ok:true}}]);
  const events = [];
  const unsubscribe = b.api.onAuthChange((event,user)=>events.push({event,user}));
  await assert.rejects(b.api.logout());
  assert.deepEqual(events,[]);
  await b.api.logout();
  assert.deepEqual(events,[{event:"logout",user:null}]);
  assert.deepEqual(b.channels[0].sent,{event:"logout"});
  unsubscribe();
});

test("login submits the password once and gets account data from the server session", async t => {
  const b = await browserAuth(t,[{body:{ok:true}},{body:{ok:true,user:{id:"id",email:"new@example.com"}}}]);
  const user = await b.api.login("new@example.com","private password");
  assert.equal(user.email,"new@example.com");
  assert.equal(b.requests.filter(request=>request.payload?.password).length,1);
  assert.ok(b.requests[0].url.endsWith("portal-login"));
  assert.ok(b.requests[1].url.endsWith("portal-session"));
});

test("account changes in another tab clear the old account before reading the new session", async t => {
  const b = await browserAuth(t,[{body:{ok:true}},{body:{ok:true,user:{id:"new",email:"new@example.com"}}}]);
  const events = [];
  const unsubscribe = b.api.onAuthChange((event,user)=>events.push({event,user}));
  b.channels[0].onmessage({data:{event:"login"}});
  assert.deepEqual(events,[{event:"logout",user:null}]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(events[1],{event:"login_remote",user:{id:"new",email:"new@example.com"}});
  unsubscribe();
});
