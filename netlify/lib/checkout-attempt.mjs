import crypto from 'node:crypto';
import { assertSameOrigin, errorResponse } from './client-auth.mjs';

const fail = (message, status = 409) => Object.assign(new Error(message), { status });
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const privateResponse = (body, status) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Only the claim winner may enter payment or inventory code. An uncertain claim
// never expires into permission to create a second checkout.
export function createCheckoutAttemptHandler({ performCheckout, getSite, isAvailable, getStore }) {
  return async req => {
    const attempt = req.headers.get('Idempotency-Key');
    if (!attempt || req.method !== 'POST') return performCheckout(req);
    try {
      assertSameOrigin(req);
      if (!/^[a-f0-9]{64}$/.test(attempt)) throw fail('Use a random 256-bit checkout attempt key.', 400);
      const text = await req.clone().text();
      if (Buffer.byteLength(text) > 65536) throw fail('Checkout request is too large.', 413);
      let payload;
      try { payload = JSON.parse(text); } catch { throw fail('Invalid checkout request.', 400); }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw fail('Invalid checkout request.', 400);
      const site = await getSite(payload);
      if (!site || !isAvailable(site)) throw fail('Business site is not available.', 404);
      const store = getStore();
      const key = `${site.siteId}/checkout-attempts/${digest(attempt)}.json`;
      const fingerprint = digest(text);
      const owner = crypto.randomUUID();
      const claim = { siteId: site.siteId, fingerprint, owner, status: 'processing', createdAt: new Date().toISOString() };
      const write = await store.setJSON(key, claim, { onlyIfNew: true });
      if (!write.modified) {
        const previous = await store.get(key, { type: 'json' });
        if (!previous || previous.siteId !== site.siteId || previous.fingerprint !== fingerprint) throw fail('This attempt belongs to a different checkout.');
        if (previous.status === 'completed') return privateResponse(previous.body, previous.httpStatus);
        throw fail('Checkout outcome is pending or uncertain. Keep this attempt and request reconciliation before another payment.');
      }
      const response = await performCheckout(req);
      const body = await response.clone().json();
      const current = await store.getWithMetadata(key, { type: 'json' });
      if (!current?.etag || current.data?.owner !== owner) throw fail('Checkout outcome requires reconciliation.', 503);
      const completed = { ...claim, status: 'completed', body, httpStatus: response.status, completedAt: new Date().toISOString() };
      const saved = await store.setJSON(key, completed, { onlyIfMatch: current.etag });
      if (!saved.modified) throw fail('Checkout outcome requires reconciliation.', 503);
      return privateResponse(body, response.status);
    } catch (error) {
      // Do not remove the claim on timeout, provider errors, or persistence failure.
      // A charge or inventory reservation may already exist.
      return errorResponse(error);
    }
  };
}
