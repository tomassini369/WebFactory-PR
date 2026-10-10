// A business URL slug is a public routing identifier, not a tenant identifier.
// Keep aliases for old shared links. Never reassign an alias to another tenant.
const forbidden = new Set([
  "admin", "api", "assets", "billing", "builder", "checkout", "client-admin",
  "login", "payments", "public", "settings", "site", "sites", "support",
  "templates", "webfactory", "webfactory-admin", "www",
]);

export function validatePublicSiteSlug(input) {
  if (typeof input !== "string") {
    throw Object.assign(new Error("Enter a valid website link."), { status: 400 });
  }
  const slug = input.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/.test(slug) ||
      slug.includes("--") || forbidden.has(slug)) {
    throw Object.assign(new Error("Use 3–64 letters, numbers or single hyphens, starting and ending with a letter or number. This link may be reserved."), { status: 400 });
  }
  return slug;
}

// Dependencies are explicit to permit race-condition/tenant-isolation tests
// without a production Netlify Blobs account.
export async function renamePublicSiteSlug({ siteId, requestedSlug, expectedRevision, loadSite, patchSite, store }) {
  const slug = validatePublicSiteSlug(requestedSlug);
  const current = await loadSite(siteId);
  if (!current) throw Object.assign(new Error("Business site not found."), { status: 404 });
  const revision = Number(current.revision || 0);
  if (!Number.isInteger(expectedRevision) || expectedRevision !== revision) {
    throw Object.assign(new Error("Business changed. Reload before updating the link."), { status: 409 });
  }
  if (slug === current.slug) return current;

  const key = `slugs/${slug}.json`;
  const existing = await store.get(key, { type: "json" });
  if (existing && existing.siteId !== siteId) {
    throw Object.assign(new Error("This website link is already in use. Choose another."), { status: 409 });
  }
  if (!existing) {
    // Atomic create prevents two businesses from claiming the same public URL.
    const claim = await store.setJSON(key, { siteId }, { onlyIfNew: true });
    if (!claim.modified) {
      const winner = await store.get(key, { type: "json" });
      if (winner?.siteId !== siteId) {
        throw Object.assign(new Error("This website link is already in use. Choose another."), { status: 409 });
      }
    }
  }

  // CAS on the business revision prevents stale tabs from overwriting changes.
  // A failed CAS can leave this slug reserved for the same tenant, but never
  // gives access to another tenant. Existing slug pointers remain intact.
  return patchSite(siteId, { slug }, { expectedRevision });
}
