import test from "node:test";
import assert from "node:assert/strict";
import { validatePublicSiteSlug, renamePublicSiteSlug } from "./client-site-slug.mjs";

function fixture() {
  const site = { siteId: "tenant-a", slug: "old-address", revision: 3, catalog: [{ id: "keep-me" }] };
  const pointer = new Map([["slugs/old-address.json", { siteId: site.siteId }]]);
  const writes = [];
  const store = {
    get: async (key) => pointer.get(key) ?? null,
    setJSON: async (key, value, opts = {}) => {
      writes.push({ key, value, opts });
      if (opts.onlyIfNew && pointer.has(key)) return { modified: false };
      pointer.set(key, value);
      return { modified: true };
    },
  };
  let patches = 0;
  const deps = {
    siteId: site.siteId, expectedRevision: site.revision, requestedSlug: "new-address",
    store, loadSite: async () => ({ ...site }),
    patchSite: async (_siteId, update, { expectedRevision }) => {
      assert.equal(expectedRevision, 3);
      patches++;
      site.slug = update.slug;
      site.revision++;
      return { ...site };
    },
  };
  return { site, pointer, writes, deps, get patches() { return patches; } };
}

test("validates readable URL paths; rejects reserved, short, malformed, and untrusted data", () => {
  assert.equal(validatePublicSiteSlug(" My-New-Business "), "my-new-business");
  for (const value of ["", "ab", "bad--slug", "-start", "end-", "www", "builder", "bad/path", "evil.com", "b".repeat(65), null, { slug: "hack" }]) {
    assert.throws(() => validatePublicSiteSlug(value), { status: 400 });
  }
  assert.equal(validatePublicSiteSlug("b".repeat(64)).length, 64);
});

test("reserves a new address without removing old aliases or altering business data", async () => {
  const f = fixture();
  const updated = await renamePublicSiteSlug(f.deps);
  assert.equal(updated.slug, "new-address");
  assert.deepEqual(updated.catalog, [{ id: "keep-me" }]);
  assert.equal(updated.revision, 4);
  assert.deepEqual(f.pointer.get("slugs/old-address.json"), { siteId: "tenant-a" });
  assert.deepEqual(f.pointer.get("slugs/new-address.json"), { siteId: "tenant-a" });
  assert.deepEqual(f.writes[0].opts, { onlyIfNew: true });
  assert.equal(f.patches, 1);
});

test("rejects links claimed by another tenant and never changes either record", async () => {
  const f = fixture();
  f.pointer.set("slugs/new-address.json", { siteId: "tenant-b" });
  await assert.rejects(renamePublicSiteSlug(f.deps), { status: 409 });
  assert.equal(f.patches, 0);
  assert.equal(f.site.slug, "old-address");
});

test("rejects losing a concurrent claim even after an earlier free read", async () => {
  const f = fixture();
  f.deps.store.setJSON = async (key) => {
    f.pointer.set(key, { siteId: "tenant-b" });
    return { modified: false };
  };
  await assert.rejects(renamePublicSiteSlug(f.deps), { status: 409 });
  assert.equal(f.patches, 0);
});

test("rejects stale revisions before taking a URL claim", async () => {
  const f = fixture();
  f.deps.expectedRevision = 2;
  await assert.rejects(renamePublicSiteSlug(f.deps), { status: 409 });
  assert.equal(f.writes.length, 0);
});

test("permits own reserved alias and skips unnecessary changes", async () => {
  const f = fixture();
  f.pointer.set("slugs/new-address.json", { siteId: "tenant-a" });
  await renamePublicSiteSlug(f.deps);
  assert.equal(f.writes.length, 0);
  assert.equal(f.patches, 1);
  f.deps.requestedSlug = "new-address";
  f.deps.expectedRevision = 4;
  const returned = await renamePublicSiteSlug(f.deps);
  assert.equal(returned.slug, "new-address");
  assert.equal(f.patches, 1);
});

test("returns 404 for a missing business without changing a shared URL", async () => {
  const f = fixture();
  f.deps.loadSite = async () => null;
  await assert.rejects(renamePublicSiteSlug(f.deps), { status: 404 });
  assert.equal(f.writes.length, 0);
});
