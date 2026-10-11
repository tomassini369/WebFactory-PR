import crypto from 'node:crypto';
import { assertSameOrigin, requireSiteCapability, errorResponse, membershipHasCapability } from '../lib/client-auth.mjs';
import { clientCommerceStore, getClientSite } from '../lib/client-store.mjs';
import { cleanText } from '../lib/platform-utils.mjs';
import { siteEntitlement } from '../lib/subscription-billing.mjs';
import { displayActor, validDisplayId, hashDisplayToken, matchesDisplayToken } from '../lib/customer-display.mjs';
import { kioskFail, kioskConfigKey, kioskDeviceKey, kioskHash, mutateKiosk, kioskCheckoutPayload, kioskView, kioskSaleView } from '../lib/kiosk.mjs';
import { createCheckoutAttemptHandler } from '../lib/checkout-attempt.mjs';
import { performCheckout } from './create-client-checkout.mjs';
const cookieName = '__Host-wf-kiosk';
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const cookieValue = req => (req.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';
export function createKioskHandler({ authorize = requireSiteCapability, getStore = clientCommerceStore, getSite = getClientSite, isAvailable = site => siteEntitlement(site).public, clock = Date.now, randomBytes = crypto.randomBytes, checkout } = {}) {
  const executeCheckout = checkout || createCheckoutAttemptHandler({ performCheckout: req => performCheckout(req, { kiosk: true }), getSite: payload => getSite(payload.siteId), isAvailable, getStore });
  return async req => {
    try {
      if (!['GET', 'POST'].includes(req.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
      assertSameOrigin(req);
      const now = clock(), store = getStore(), url = new URL(req.url);
      let input = req.method === 'GET' && url.searchParams.get('action') === 'admin' ? { action: 'admin', siteId: url.searchParams.get('siteId') } : {};
      if (req.method === 'POST') {
        const raw = await req.text(); if (Buffer.byteLength(raw) > 16000) throw kioskFail('Request too large.', 413);
        input = JSON.parse(raw); if (!input || typeof input !== 'object' || Array.isArray(input)) throw kioskFail('Invalid request.');
      }
      if (['admin', 'configure', 'create', 'revoke'].includes(input.action)) {
        const { site, user, membership } = await authorize(input.siteId, 'settings');
        const actor = displayActor(user), email = String(user.email || '').toLowerCase();
        if (!['owner', 'manager'].includes(membership?.role) || !site.members?.some(x => String(x.email).toLowerCase() === email && ['owner', 'manager'].includes(x.role))) throw kioskFail('Business administrator required / Administrador del negocio requerido.', 403);
        const configKey = kioskConfigKey(site.siteId);
        let configuration = await store.get(configKey, { type: 'json' }) || { enabled: false, devices: [] };
        if (input.action === 'configure') {
          if (typeof input.enabled !== 'boolean') throw kioskFail('Choose enabled or disabled.');
          configuration = await mutateKiosk(store, configKey, current => ({ ...(current || {}), enabled: input.enabled, devices: current?.devices || [], updatedAt: now, updatedBy: actor }));
        }
        if (input.action === 'create') {
          if (!configuration.enabled || !isAvailable(site)) throw kioskFail('Enable kiosk first / Habilita el kiosco primero.', 409);
          const locations = (site.business?.locations || []).filter(x => x.active !== false);
          const location = locations.find(x => x.id === input.locationId);
          if (locations.length && !location) throw kioskFail('Choose a location / Escoge una sucursal.');
          if (membership.locationIds?.length && !membership.locationIds.includes(location?.id)) throw kioskFail('Location not authorized / Sucursal no autorizada.', 403);
          const id = randomBytes(16).toString('hex'), token = randomBytes(32).toString('hex');
          const label = cleanText(input.label, 80) || `Kiosk ${id.slice(0, 6)}`;
          const state = { id, label, siteId: site.siteId, actor, email, locationId: location?.id || '', locationName: location?.name || '', createdAt: now, expiresAt: now + 8 * 3600000, pairExpiresAt: now + 600000, pairHash: hashDisplayToken(token), deviceHash: null, saleId: randomBytes(16).toString('hex'), active: null };
          await mutateKiosk(store, configKey, current => {
            if (!current?.enabled) throw kioskFail('Kiosk disabled.', 409);
            const devices = (current.devices || []).filter(x => x.expiresAt > now);
            if (devices.length >= 20) throw kioskFail('Maximum 20 active devices; disconnect one first.', 409);
            return { ...current, devices: [...devices, { id, label, locationName: state.locationName, expiresAt: state.expiresAt, createdAt: now }] };
          });
          await mutateKiosk(store, kioskDeviceKey(id), current => { if (current) throw kioskFail('Device collision.', 409); return state; });
          return Response.json({ ok: true, id, pairUrl: `${url.origin}/kiosk#pair=${id}.${token}` }, { headers });
        }
        if (input.action === 'revoke') {
          if (!validDisplayId(input.id)) throw kioskFail('Invalid device.');
          await mutateKiosk(store, kioskDeviceKey(input.id), current => {
            if (!current || current.siteId !== site.siteId) throw kioskFail('Device unavailable.', 403);
            return { ...current, revoked: true, revokedAt: now, revokedBy: actor, pairHash: null, deviceHash: null };
          });
          configuration = await mutateKiosk(store, configKey, current => ({ ...(current || {}), devices: (current?.devices || []).filter(x => x.id !== input.id) }));
        }
        return Response.json({ ok: true, enabled: Boolean(configuration.enabled), devices: (configuration.devices || []).filter(x => x.expiresAt > now) }, { headers });
      }
      const [deviceId, deviceToken] = cookieValue(req).split('.');
      const id = input.action === 'pair' ? input.id : deviceId;
      if (!validDisplayId(id)) throw kioskFail('Kiosk not paired / Kiosco sin vincular.', 401);
      let state = await store.get(kioskDeviceKey(id), { type: 'json' });
      if (!state || state.revoked || now >= state.expiresAt) throw kioskFail('Device expired / Dispositivo vencido.', 401);
      const site = await getSite(state.siteId);
      const issuer = site?.members?.find(x => String(x.email).toLowerCase() === state.email);
      const configuration = await store.get(kioskConfigKey(state.siteId), { type: 'json' });
      if (!site || site.siteId !== state.siteId || !isAvailable(site) || !membershipHasCapability(issuer, 'settings') || !['owner', 'manager'].includes(issuer.role) || !configuration?.enabled || !configuration.devices?.some(x => x.id === id)) throw kioskFail('Kiosk unavailable / Kiosco no disponible.', 403);
      const location = (site.business?.locations || []).find(x => x.id === state.locationId && x.active !== false);
      if ((state.locationId || (site.business?.locations || []).some(x => x.active !== false)) && !location || issuer.locationIds?.length && !issuer.locationIds.includes(state.locationId)) throw kioskFail('Location unavailable / Sucursal no disponible.', 403);
      let responseCookie;
      if (input.action === 'pair') {
        if (!(deviceId === id && matchesDisplayToken(deviceToken, state.deviceHash))) {
          const token = randomBytes(32).toString('hex');
          state = await mutateKiosk(store, kioskDeviceKey(id), current => {
            if (!current || current.revoked || now >= current.expiresAt || now >= current.pairExpiresAt || current.deviceHash || !matchesDisplayToken(input.token, current.pairHash)) throw kioskFail('Pairing link unavailable / Enlace de vinculación no disponible.', 401);
            return { ...current, pairHash: null, pairedAt: now, deviceHash: hashDisplayToken(token) };
          });
          responseCookie = `${cookieName}=${id}.${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor((state.expiresAt - now) / 1000)}`;
        }
      } else if (!matchesDisplayToken(deviceToken, state.deviceHash)) throw kioskFail('Kiosk not paired.', 401);
      if (req.method === 'POST' && ['checkout', 'resume'].includes(input.action)) {
        if (input.saleId !== state.saleId) throw kioskFail('Sale changed / La venta cambió.', 409);
        if (input.action === 'checkout') {
          if (state.active) throw kioskFail('Resume the existing checkout / Recupera el checkout existente.', 409);
          const payload = kioskCheckoutPayload(site, state, input), encoded = JSON.stringify(payload), fingerprint = kioskHash(encoded);
          const attempt = randomBytes(32).toString('hex');
          state = await mutateKiosk(store, kioskDeviceKey(id), current => {
            if (!current || current.revoked || now >= current.expiresAt || current.saleId !== input.saleId) throw kioskFail('Device or sale changed.', 409);
            if (current.active) { if (current.active.fingerprint !== fingerprint) throw kioskFail('Another checkout is active.', 409); return null; }
            const windowAt = now - Number(current.checkoutWindowAt || 0) >= 60000 ? now : current.checkoutWindowAt;
            const count = windowAt === current.checkoutWindowAt ? Number(current.checkoutCount || 0) : 0;
            if (count >= 20) throw kioskFail('Too many orders; wait a minute / Demasiadas órdenes; espera un minuto.', 429);
            return { ...current, checkoutWindowAt: windowAt, checkoutCount: count + 1, active: { payload: encoded, fingerprint, attempt, startedAt: now, pricesIncludeTax: Boolean(site.taxConfig?.pricesIncludeTax) } };
          });
        }
        if (!state.active) throw kioskFail('No checkout to resume.', 409);
        if (!state.active.response && state.active.payload) {
          const forwarded = new Request(`${url.origin}/.netlify/functions/create-client-checkout`, { method: 'POST', headers: { Origin: url.origin, 'Content-Type': 'application/json', 'Idempotency-Key': state.active.attempt }, body: state.active.payload });
          const result = await executeCheckout(forwarded), body = await result.json();
          if (result.ok && body.ok && body.transactionId) {
            state = await mutateKiosk(store, kioskDeviceKey(id), current => {
              if (!current || current.saleId !== input.saleId || current.active?.attempt !== state.active.attempt) throw kioskFail('Checkout requires reconciliation.', 409);
              return { ...current, active: { ...current.active, response: body, payload: null } };
            });
          } else {
            // Keep the frozen request and server attempt. No new charge key on
            // browser timeout, validation race or provider uncertainty.
            return Response.json({ ok: false, message: body.message || 'Checkout requires review / El checkout requiere revisión.' }, { status: result.status >= 400 ? result.status : 409, headers });
          }
        }
      } else if (input.action === 'reset') {
        if (input.saleId !== state.saleId) throw kioskFail('Sale changed.', 409);
        const sale = await kioskSaleView(store, state);
        if (!sale?.canReset) throw kioskFail('Resolve the existing order before starting another / Resuelve la orden antes de comenzar otra.', 409);
        const nextSale = randomBytes(16).toString('hex');
        state = await mutateKiosk(store, kioskDeviceKey(id), current => {
          if (!current || current.revoked || current.saleId !== input.saleId || current.active?.attempt !== state.active?.attempt) throw kioskFail('Sale changed.', 409);
          return { ...current, saleId: nextSale, active: null };
        });
      } else if (req.method === 'POST' && input.action !== 'pair') throw kioskFail('Unsupported action.');
      return Response.json({ ok: true, ...await kioskView(store, state, site) }, { headers: { ...headers, ...(responseCookie ? { 'Set-Cookie': responseCookie } : {}) } });
    } catch (error) { return errorResponse(error instanceof SyntaxError ? kioskFail('Invalid JSON / JSON inválido.') : error); }
  };
}
export default createKioskHandler();
export const config = { rateLimit: { windowLimit: 600, windowSize: 60, aggregateBy: ['ip'] } };
