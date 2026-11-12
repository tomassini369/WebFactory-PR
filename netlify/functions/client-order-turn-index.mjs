import {assertSameOrigin, errorResponse, requireSiteCapability} from '../lib/client-auth.mjs';
import {isBusinessOwner} from '../lib/commercial-access.mjs';
import {clientBackupStore, clientCommerceStore, clientOrderTurnIndexStore, getClientSite} from '../lib/client-store.mjs';
import {buildOrderTurnIndexPage, orderTurnIndexStateKey} from '../lib/order-turn-index.mjs';
import {withBookingLock} from '../lib/booking-lock.mjs';

export function createOrderTurnIndexHandler({
  authorize = requireSiteCapability,
  getCommerce = clientCommerceStore,
  getIndex = clientOrderTurnIndexStore,
  getMaintenance = clientBackupStore,
  getSite = getClientSite,
} = {}) {
  return async req => {
    try {
      if (!['GET', 'POST'].includes(req.method)) return new Response(null, {status: 405});
      let siteId = new URL(req.url).searchParams.get('siteId');
      if (req.method === 'POST') {
        assertSameOrigin(req);
        const raw = await req.text();
        if (raw.length > 1000) throw Object.assign(new Error('Request too large.'), {status: 413});
        siteId = JSON.parse(raw || '{}').siteId;
      }
      const {site, membership} = await authorize(siteId, 'kitchen');
      if (!isBusinessOwner(membership)) throw Object.assign(new Error('Owner access required.'), {status: 403});
      const index = getIndex();
      const state = req.method === 'GET'
        ? await index.get(orderTurnIndexStateKey(site.siteId), {type: 'json'})
        : await withBookingLock(getMaintenance(), 'maintenance/lock', async () => {
          if (!await getSite(site.siteId)) throw Object.assign(new Error('Business site not found.'), {status: 404});
          return buildOrderTurnIndexPage(getCommerce(), index, site.siteId);
        });
      return Response.json({ok: true, state: {status: state?.status || 'pending', processed: state?.processed || 0}}, {
        headers: {'Cache-Control': 'private, no-store'},
      });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export default createOrderTurnIndexHandler();
