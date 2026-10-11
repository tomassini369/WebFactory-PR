// A business URL slug is a public routing identifier, not a tenant identifier.
// Keep aliases for old shared links. Never reassign an alias to another tenant.
const forbidden = new Set([
  "admin", "api", "assets", "billing", "builder", "checkout", "client-admin",
  "login", "payments", "public", "settings", "site", "sites", "support",
  "templates", "webfactory", "webfactory-admin", "www",
]);
const fail = (code, message, status) => Object.assign(new Error(message), { code, status });
export function publicSiteSlugMessage(code, lang = 'en', status = 0) {
  const messages = {
    SLUG_INVALID: ['Usa de 3 a 64 letras, números o guiones simples. El enlace puede estar reservado.', 'Use 3–64 letters, numbers or single hyphens. The address may be reserved.'],
    SLUG_IN_USE: ['Este enlace ya está en uso. Escoge otro.', 'This address is already in use. Choose another.'],
    SLUG_STALE: ['El negocio cambió. Recarga antes de guardar el enlace.', 'The business changed. Reload before saving the address.'],
    SLUG_NOT_FOUND: ['No se encontró el negocio. Recarga el portal.', 'The business was not found. Reload the portal.'],
    SLUG_STORAGE: ['No se pudo confirmar el cambio. Recarga para verificar el enlace antes de reintentar.', 'The change could not be confirmed. Reload to verify the address before retrying.'],
  };
  if (status === 401) return lang === 'es' ? 'La sesión venció. Inicia sesión de nuevo para guardar.' : 'Your session expired. Sign in again to save.';
  if (status === 403) return lang === 'es' ? 'Tu cuenta no tiene permiso para cambiar este enlace.' : 'Your account cannot change this address.';
  return (messages[code] || messages.SLUG_STORAGE)[lang === 'es' ? 0 : 1];
}

export function validatePublicSiteSlug(input) {
  if (typeof input !== "string") {
    throw fail('SLUG_INVALID', 'Enter a valid website link.', 400);
  }
  const slug = input.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/.test(slug) ||
      slug.includes("--") || forbidden.has(slug)) {
    throw fail('SLUG_INVALID', 'Use 3–64 letters, numbers or single hyphens, starting and ending with a letter or number. This link may be reserved.', 400);
  }
  return slug;
}

// Dependencies are explicit to permit race-condition/tenant-isolation tests
// without a production Netlify Blobs account.
export async function claimPublicSiteSlug(store, siteId, slug) {
  const key = `slugs/${slug}.json`;
  const existing = await store.get(key, { type: "json" });
  if (existing && existing.siteId !== siteId) {
    throw fail('SLUG_IN_USE', 'This website link is already in use. Choose another.', 409);
  }
  if (!existing) {
    // Atomic create prevents two businesses from claiming the same public URL.
    const claim = await store.setJSON(key, { siteId }, { onlyIfNew: true });
    if (!claim || typeof claim.modified !== 'boolean') throw fail('SLUG_STORAGE', 'Address reservation could not be verified.', 503);
    if (!claim.modified) {
      const winner = await store.get(key, { type: "json" });
      if (winner?.siteId !== siteId) {
        throw fail(winner ? 'SLUG_IN_USE' : 'SLUG_STORAGE', 'Address reservation could not be verified.', winner ? 409 : 503);
      }
    }
  }
}

export async function renamePublicSiteSlug({ siteId, requestedSlug, expectedRevision, loadSite, patchSite, store }) {
  const slug = validatePublicSiteSlug(requestedSlug);
  const current = await loadSite(siteId);
  if (!current) throw fail('SLUG_NOT_FOUND', 'Business site not found.', 404);
  const revision = Number(current.revision || 0);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== revision) throw fail('SLUG_STALE', 'Business changed. Reload before updating the link.', 409);
  if (slug === current.slug) return current;
  await claimPublicSiteSlug(store, siteId, slug);

  // CAS on the business revision prevents stale tabs from overwriting changes.
  // A failed CAS can leave this slug reserved for the same tenant, but never
  // gives access to another tenant. Existing slug pointers remain intact.
  try { return await patchSite(siteId, { slug }, { expectedRevision }); }
  catch (error) {
    if (error.status === 409) throw fail('SLUG_STALE', 'Business changed. Reload before updating the link.', 409);
    if (error.status === 503) throw fail('SLUG_STORAGE', 'Business concurrency metadata unavailable.', 503);
    throw error;
  }
}
