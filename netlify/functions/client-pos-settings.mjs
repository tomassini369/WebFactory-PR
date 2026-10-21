import { assertSameOrigin, errorResponse, membershipHasCapability, requireSiteAccess } from '../lib/client-auth.mjs';
import { clientCommerceStore } from '../lib/client-store.mjs';
import { displayActor } from '../lib/customer-display.mjs';
import { kioskFail } from '../lib/kiosk.mjs';
import { configurePosOperations, readPosOperations } from '../lib/pos-operations.mjs';
import { posCapabilities } from '../lib/pos-capabilities.mjs';
export function createPosSettingsHandler({ authorize = requireSiteAccess, getStore = clientCommerceStore, clock = Date.now } = {}) {
  return async req => {
    try {
      if (!['GET', 'POST'].includes(req.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
      assertSameOrigin(req);
      const raw = req.method === 'POST' ? await req.text() : '';
      if (Buffer.byteLength(raw) > 2000) throw kioskFail('Request too large.', 413);
      const input = raw ? JSON.parse(raw) : {};
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw kioskFail('Invalid request.');
      const siteId = req.method === 'POST' ? input.siteId : new URL(req.url).searchParams.get('siteId');
      if (!/^[a-zA-Z0-9_-]{1,120}$/.test(siteId || '')) throw kioskFail('Invalid business.');
      const { site, user, membership } = await authorize(siteId, ['owner','employee']);
      if (site.siteId !== siteId) throw kioskFail('Business mismatch.', 403);
      const member = site.members?.find(item => String(item.email).toLowerCase() === String(user.email).toLowerCase());
      const canManage = ['owner'].includes(membership?.role) && member?.role === membership.role && membershipHasCapability(member, 'settings');
      if (req.method === 'POST' && !canManage) throw kioskFail('Business administrator required / Administrador del negocio requerido.', 403);
      const store = getStore();
      const operations = req.method === 'POST' ? await configurePosOperations(store, siteId, input, displayActor(user), clock()) : await readPosOperations(siteId, store);
      return Response.json({ ok: true, operations, capabilities: posCapabilities(site, operations), canManage }, { headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
    } catch (error) { return errorResponse(error instanceof SyntaxError ? kioskFail('Invalid JSON.') : error); }
  };
}
export default createPosSettingsHandler();
export const config = { rateLimit: { windowLimit: 90, windowSize: 60, aggregateBy: ['ip'] } };
