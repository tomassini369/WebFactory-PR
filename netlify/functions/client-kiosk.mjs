import {withBookingLock} from '../lib/booking-lock.mjs';
import {availabilityForDate} from '../lib/booking-engine.mjs';
import {kioskBookingModes,lookupKioskBooking,assertKioskBooking,kioskBookingView,bookingBalance} from '../lib/kiosk-bookings.mjs';
import crypto from 'node:crypto';
import {kioskAppearance,validateKioskAppearance,kioskPresets,validateKioskPresets} from '../lib/kiosk-skins.mjs';
import {kioskBackgroundAssets,assertRegisteredBackgrounds} from '../lib/kiosk-backgrounds.mjs';
import { assertSameOrigin, requireSiteCapability, errorResponse, membershipHasCapability } from '../lib/client-auth.mjs';
import { clientCommerceStore, getClientSite, commerceKey } from '../lib/client-store.mjs';
import { cleanText, validEmail } from '../lib/platform-utils.mjs';
import { siteEntitlement } from '../lib/subscription-billing.mjs';
import { displayActor, validDisplayId, hashDisplayToken, matchesDisplayToken } from '../lib/customer-display.mjs';
import { kioskFail, kioskConfigKey, kioskDeviceKey, kioskHash, mutateKiosk, kioskCheckoutPayload, kioskView, kioskSaleView, kioskBookingProviders } from '../lib/kiosk.mjs';
import { createCheckoutAttemptHandler } from '../lib/checkout-attempt.mjs';
import { performCheckout } from './create-client-checkout.mjs';
const cookieName = '__Host-wf-kiosk';
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const cookieValue = req => (req.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';
export function createKioskHandler({ authorize = requireSiteCapability, getStore = clientCommerceStore, getSite = getClientSite, isAvailable = site => siteEntitlement(site).public, clock = Date.now, randomBytes = crypto.randomBytes, checkout, availability = availabilityForDate } = {}) {
  const executeCheckout = checkout || createCheckoutAttemptHandler({ performCheckout: async req => {
    const payload=await req.clone().json();
    let balanceBooking=null;
    if(payload.balanceReference){
      balanceBooking=await getStore().get(commerceKey(payload.siteId,"bookings",payload.balanceReference),{type:"json"});
      if(balanceBooking?.balanceAttempt?.attempt!==req.headers.get("Idempotency-Key"))throw kioskFail("Balance attempt mismatch.",409);
    }
    return performCheckout(req,{kiosk:true,balanceBooking,balanceAttempt:req.headers.get("Idempotency-Key")||""});
  }, getSite: payload => getSite(payload.siteId), isAvailable, getStore });
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
      if (['admin', 'appearance', 'appearance_presets', 'configure', 'create', 'revoke'].includes(input.action)) {
        const { site, user, membership } = await authorize(input.siteId, 'settings');
        const actor = displayActor(user), email = String(user.email || '').toLowerCase();
        if (!['owner', 'manager'].includes(membership?.role) || !site.members?.some(x => String(x.email).toLowerCase() === email && ['owner', 'manager'].includes(x.role))) throw kioskFail('Business administrator required / Administrador del negocio requerido.', 403);
        const configKey = kioskConfigKey(site.siteId);
        let configuration = await store.get(configKey, { type: 'json' }) || { enabled: false, devices: [] };
        if(input.action==='appearance'){
          const appearance=validateKioskAppearance(input.appearance,site.siteId);
          configuration=await mutateKiosk(store,configKey,current=>{assertRegisteredBackgrounds(current,[appearance],site.siteId);return {...current,appearance,updatedAt:now,updatedBy:actor}});
        }
        if(input.action==='appearance_presets'){
          const appearancePresets=validateKioskPresets(input.presets,site.siteId);
          configuration=await mutateKiosk(store,configKey,current=>{assertRegisteredBackgrounds(current,appearancePresets.map(p=>p.appearance),site.siteId);return {...current,appearancePresets,updatedAt:now,updatedBy:actor}});
        }
        if (input.action === 'configure') {
          if (typeof input.enabled !== 'boolean') throw kioskFail('Choose enabled or disabled.');
          if(input.bookingModes && (typeof input.bookingModes.newBookings!=="boolean"||typeof input.bookingModes.existingBookings!=="boolean"))throw kioskFail("Invalid booking modes.");
          configuration = await mutateKiosk(store, configKey, current => ({ ...(current || {}), enabled: input.enabled, ...(input.bookingModes?{bookingModes:input.bookingModes}:{}), devices: current?.devices || [], updatedAt: now, updatedBy: actor }));
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
        return Response.json({ ok: true, appearance:kioskAppearance(configuration.appearance,site.siteId), presets:kioskPresets(configuration.appearancePresets,site.siteId),backgroundAssets:kioskBackgroundAssets(configuration,site.siteId), enabled: Boolean(configuration.enabled), bookingModes:kioskBookingModes(configuration), devices: (configuration.devices || []).filter(x => x.expiresAt > now) }, { headers });
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
      const modes=kioskBookingModes(configuration);
      if(req.method==='POST'&&input.action==='availability'){
        if(!modes.newBookings||site.features?.bookings===false)throw kioskFail('Booking kiosk disabled.',403);
        if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date||'')||Date.parse(input.date)>now+366*86400000||Date.parse(input.date)<now-2*86400000)throw kioskFail('Choose a valid date / Escoge una fecha válida.');
        let slots;
        if(input.employeeId==='any'){const people=(site.employees||[]).filter(x=>x.active!==false&&x.serviceIds?.includes(input.serviceId)&&(!state.locationId||x.locationIds?.includes(state.locationId)));const all=await Promise.all(people.map(async person=>(await availability(site,String(input.serviceId||''),person.id,input.date,state.locationId,{strictGoogle:true})).map(slot=>({...slot,employeeId:person.id}))));slots=[...new Map(all.flat().sort((a,b)=>a.start.localeCompare(b.start)).map(slot=>[slot.start,slot])).values()];}
        else slots=await availability(site,String(input.serviceId||''),String(input.employeeId||''),input.date,state.locationId,{strictGoogle:true});
        return Response.json({ok:true,slots},{headers});
      }
      if(req.method==='POST'&&['lookup_booking','check_in','clear_booking'].includes(input.action)){
        if(!modes.existingBookings)throw kioskFail('Existing bookings disabled.',403);
        if(state.active)throw kioskFail('Resolve the active checkout first.',409);
        if(input.action==='lookup_booking'){
          state=await mutateKiosk(store,kioskDeviceKey(id),current=>{if(current.active)throw kioskFail('Checkout active.',409);if(now-Number(current.lookupWindowAt||0)<60000&&Number(current.lookupCount||0)>=10)throw kioskFail('Wait before trying another booking.',429);return {...current,bookingLookup:null,lookupWindowAt:now-Number(current.lookupWindowAt||0)>=60000?now:current.lookupWindowAt,lookupCount:now-Number(current.lookupWindowAt||0)>=60000?1:Number(current.lookupCount||0)+1};});
          const record=await lookupKioskBooking(store,site,state,input.reference,input.pin);
          state=await mutateKiosk(store,kioskDeviceKey(id),current=>{if(current.active)throw kioskFail('Checkout active.',409);return {...current,bookingLookup:{id:record.transactionId,expiresAt:now+60000}};});
        }else if(input.action==='clear_booking'){
          state=await mutateKiosk(store,kioskDeviceKey(id),current=>({...current,bookingLookup:null}));
        }else{
          const view=await kioskBookingView(store,state,site,now);
          if(!view?.canCheckIn)throw kioskFail('Check-in unavailable; ask staff / Llegada no disponible; consulta al personal.',409);
          const key=commerceKey(site.siteId,'bookings',state.bookingLookup.id);
          const record=await mutateKiosk(store,key,current=>{assertKioskBooking(current,site,state);if(current.checkedInAt)return null;return {...current,checkedInAt:new Date(now).toISOString(),checkedInSource:'kiosk',updatedAt:new Date(now).toISOString()};});
          const mirrorKey=commerceKey(site.siteId,'transactions',record.transactionId),mirror=await store.getWithMetadata(mirrorKey,{type:'json'});
          if(mirror?.etag)await store.setJSON(mirrorKey,{...mirror.data,checkedInAt:record.checkedInAt,checkedInSource:'kiosk'},{onlyIfMatch:mirror.etag});
        }
        return Response.json({ok:true,...await kioskView(store,state,site),booking:await kioskBookingView(store,state,site,now)},{headers});
      }
      if (req.method === 'POST' && ['checkout', 'booking_checkout', 'balance_checkout', 'resume'].includes(input.action)) {
        if (input.saleId !== state.saleId) throw kioskFail('Sale changed / La venta cambió.', 409);
        if (input.action !== 'resume') {
          if (state.active) throw kioskFail('Resume the existing checkout / Recupera el checkout existente.', 409);
          const attempt=randomBytes(32).toString('hex');
          let payload;
          if(input.action==='booking_checkout'){
            if(!modes.newBookings||site.features?.bookings===false)throw kioskFail('Booking kiosk disabled.',403);
            const customer={name:cleanText(input.customer?.name,180),email:cleanText(input.customer?.email,320),phone:cleanText(input.customer?.phone,80)};
            if(!customer.name||!validEmail(customer.email))throw kioskFail('Name and valid email required.');
            const service=(site.catalog||[]).find(x=>x.id===input.booking?.serviceId&&x.active!==false&&x.requiresAppointment&&x.type==='service');
            const employee=(site.employees||[]).find(x=>x.id===input.booking?.employeeId&&x.active!==false&&x.serviceIds?.includes(service?.id)&&(!state.locationId||x.locationIds?.includes(state.locationId)));
            if(!service||!employee||!kioskBookingProviders(site).includes(input.paymentProvider))throw kioskFail('Service, professional or payment unavailable.',409);
            payload={siteId:site.siteId,locationId:state.locationId,customer,lang:input.lang==='es'?'es':'en',paymentProvider:input.paymentProvider,booking:{serviceId:service.id,employeeId:employee.id,start:String(input.booking?.start||''),locationId:state.locationId}};
          }else if(input.action==='balance_checkout'){
            if(!modes.existingBookings||!state.bookingLookup||state.bookingLookup.expiresAt<=now)throw kioskFail('Find your booking again.',409);
            const key=commerceKey(site.siteId,'bookings',state.bookingLookup.id);
            if(!kioskBookingProviders(site,true).includes(input.paymentProvider))throw kioskFail('Online payment unavailable.',409);
            const record=await withBookingLock(store,`locks/commerce/${site.siteId}`,()=>mutateKiosk(store,key,async current=>{assertKioskBooking(current,site,state);if(current.balanceAttempt)throw kioskFail('A balance checkout is already pending; ask staff.',409);const balance=await bookingBalance(store,current);if(!balance.known||balance.due<=0)throw kioskFail('Balance requires review.',409);return {...current,balanceAttempt:{attempt,deviceId:id,saleId:state.saleId,createdAt:now}};}));
            payload={siteId:site.siteId,locationId:state.locationId,customer:record.customer,lang:input.lang==='es'?'es':'en',paymentProvider:input.paymentProvider,balanceReference:record.transactionId};
          }else payload=kioskCheckoutPayload(site,state,input);
          const encoded=JSON.stringify(payload),fingerprint=kioskHash(encoded);
          state = await mutateKiosk(store, kioskDeviceKey(id), current => {
            if (!current || current.revoked || now >= current.expiresAt || current.saleId !== input.saleId) throw kioskFail('Device or sale changed.', 409);
            if (current.active) { if (current.active.fingerprint !== fingerprint) throw kioskFail('Another checkout is active.', 409); return null; }
            const windowAt = now - Number(current.checkoutWindowAt || 0) >= 60000 ? now : current.checkoutWindowAt;
            const count = windowAt === current.checkoutWindowAt ? Number(current.checkoutCount || 0) : 0;
            if (count >= 20) throw kioskFail('Too many orders; wait a minute / Demasiadas órdenes; espera un minuto.', 429);
            return { ...current, checkoutWindowAt: windowAt, checkoutCount: count + 1, active: { kind: input.action==='booking_checkout'?'booking':'order', payload: encoded, fingerprint, attempt, startedAt: now, pricesIncludeTax: Boolean(site.taxConfig?.pricesIncludeTax) } };
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
          return { ...current, saleId: nextSale, active: null, bookingLookup:null };
        });
      } else if (req.method === 'POST' && input.action !== 'pair') throw kioskFail('Unsupported action.');
      return Response.json({ ok: true, ...await kioskView(store, state, site), booking:await kioskBookingView(store,state,site,now) }, { headers: { ...headers, ...(responseCookie ? { 'Set-Cookie': responseCookie } : {}) } });
    } catch (error) { return errorResponse(error instanceof SyntaxError ? kioskFail('Invalid JSON / JSON inválido.') : error); }
  };
}
export default createKioskHandler();
export const config = { rateLimit: { windowLimit: 600, windowSize: 60, aggregateBy: ['ip'] } };
