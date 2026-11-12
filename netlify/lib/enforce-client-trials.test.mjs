import test from "node:test";
import assert from "node:assert/strict";
import { createTrialEnforcementHandler } from "../functions/enforce-client-trials.mjs";

test("a payment that wins the trial-expiry race stays active while other expired trials are updated", async () => {
  const clock = () => Date.parse("2026-11-12T19:00:00Z");
  const trial = { subscriptionStatus: "trial", trialEndsAt: "2026-11-12T18:00:00Z" };
  const rows = new Map([
    ["paid", {siteId:"paid",revision:4,status:"trial",servicePlan:trial}],
    ["expired", {siteId:"expired",revision:9,status:"trial",servicePlan:trial}],
    ["unexpired", {siteId:"unexpired",revision:2,status:"trial",servicePlan:{...trial,trialEndsAt:"2026-11-13T18:00:00Z"}}],
  ]);
  const handler = createTrialEnforcementHandler({
    clock,
    getStore: () => ({
      list: async () => ({blobs:[...rows.keys()].map(key=>({key}))}),
      get: async key => structuredClone(rows.get(key)),
    }),
    patchSite: async (id,patch,{expectedRevision}) => {
      if (id==="paid") rows.set(id,{siteId:id,revision:5,status:"active",servicePlan:{subscriptionStatus:"active",stripeSubscriptionId:"sub_paid"}});
      const current=rows.get(id);
      if (current.revision!==expectedRevision) throw Object.assign(new Error("Revision conflict"),{status:409});
      rows.set(id,{...current,...patch});
    },
  });
  assert.deepEqual(await (await handler()).json(),{ok:true,expired:1});
  assert.equal(rows.get("paid").servicePlan.stripeSubscriptionId,"sub_paid");
  assert.equal(rows.get("paid").status,"active");
  assert.equal(rows.get("expired").servicePlan.subscriptionStatus,"trial_expired");
  assert.equal(rows.get("unexpired").servicePlan.subscriptionStatus,"trial");
});
