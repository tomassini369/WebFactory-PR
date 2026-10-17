import {kioskBookingModes,bookingKioskPin} from './kiosk-bookings.mjs';
import crypto from 'node:crypto';
import { availableInventory } from './inventory-availability.mjs';
import { cleanText, validEmail } from './platform-utils.mjs';
import { commerceKey } from './client-store.mjs';
import { posCapabilities, posOperations } from './pos-capabilities.mjs';
export const kioskFail = (message, status = 400) => Object.assign(new Error(message), { status });
export const kioskConfigKey = siteId => `${siteId}/pos-kiosk/config.json`;
export const kioskDeviceKey = id => `pos-kiosk-devices/${id}.json`;
export const kioskHash = value => crypto.createHash('sha256').update(value).digest('hex');
export async function mutateKiosk(store, key, change) {
  for (let retry = 0; retry < 6; retry++) {
    const row = await store.getWithMetadata(key, { type: 'json' });
    if (row && !row.etag) throw kioskFail('Concurrency unavailable / Concurrencia no disponible.', 503);
    const next = await change(row?.data || null);
    if (next === null) return row?.data;
    const result = await store.setJSON(key, next, row ? { onlyIfMatch: row.etag } : { onlyIfNew: true });
    if (result.modified) return next;
  }
  throw kioskFail('Device changed; retry / El dispositivo cambió; reintenta.', 409);
}
export function kioskProviders(site) {
  if (site.paymentRules?.productPayment === 'in_person') return ['in_person'];
  const methods = [];
  if (site.paymentRules?.methods?.stripe && site.paymentRules?.stripeConnectedAccountId) methods.push('stripe');
  if (site.paymentRules?.methods?.ath && site.paymentRules?.ath?.credentialsConfigured && site.paymentRules?.ath?.credentialVersion) methods.push('ath_movil');
  return methods;
}
export function kioskBookingProviders(site,balance=false){
  if(!balance&&site.paymentRules?.bookingPayment==='in_person')return ['in_person'];
  return kioskProviders({...site,paymentRules:{...site.paymentRules,productPayment:'online'}});
}
export function kioskCheckoutPayload(site, state, input) {
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 20) throw kioskFail('Choose 1–20 items / Escoge 1–20 artículos.');
  const ids = new Set();
  const items = input.items.map(line => {
    if (!line || ids.has(line.id) || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) throw kioskFail('Invalid quantities / Cantidades inválidas.');
    ids.add(line.id);
    const item = (site.catalog || []).find(x => x.id === line.id && x.active !== false && !x.requiresAppointment);
    if (!item || !Number.isFinite(item.price) || item.price < 0) throw kioskFail('Item unavailable / Artículo no disponible.', 409);
    if (item.type === 'product' && item.trackInventory && item.inventory != null && !item.allowBackorder && line.quantity > availableInventory(site, item)) throw kioskFail('Insufficient stock / Inventario insuficiente.', 409);
    return { id: item.id, quantity: line.quantity };
  });
  const customer = { name: cleanText(input.customer?.name, 180), email: cleanText(input.customer?.email, 320), phone: cleanText(input.customer?.phone, 80), reviewOptIn: false };
  if (!customer.name || !validEmail(customer.email)) throw kioskFail('Name and valid email required / Nombre y email válido requeridos.');
  if (!kioskProviders(site).includes(input.paymentProvider)) throw kioskFail('Payment method unavailable / Método de pago no disponible.', 409);
  return { siteId: site.siteId, items, customer, lang: input.lang === 'es' ? 'es' : 'en', locationId: state.locationId, paymentProvider: input.paymentProvider };
}
export async function kioskSaleView(store, state) {
  const active = state.active;
  if (!active) return null;
  const transactionId = active.response?.transactionId;
  if (!transactionId) return { status: 'review', saleId: state.saleId, canResume: Boolean(active.payload), canReset: false };
  const kind=active.kind||'order';
  const booking = kind==='booking' ? await store.get(commerceKey(state.siteId,'bookings',transactionId),{type:'json'}) : null;
  const record = await store.get(commerceKey(state.siteId, 'transactions', transactionId), { type: 'json' }) || booking;
  if (!record || record.siteId !== state.siteId || record.transactionId !== transactionId || record.kind !== kind || record.channel !== 'kiosk' || record.locationId !== state.locationId) return { status: 'review', saleId: state.saleId, canReset: false };
  const paid = ['paid', 'paid_in_person'].includes(record.paymentStatus) && ['confirmed', 'completed'].includes(record.status) && Boolean(record.receiptId && (kind==='booking'||record.inventoryAppliedAt)) && !record.inventoryNeedsReview && !record.athFulfillmentNeedsReview;
  const terminal = Boolean(record.inventoryNeedsReview || record.athFulfillmentNeedsReview) || ['paid', 'paid_in_person'].includes(record.paymentStatus) && !paid || ['failed', 'cancelled', 'expired', 'refunded', 'partially_refunded'].includes(record.paymentStatus) || ['failed', 'cancelled', 'expired', 'payment_failed'].includes(record.status);
  const due = (record.source === 'in_person_order'||kind==='booking') && record.paymentStatus === 'due' && record.status === 'confirmed' && !terminal;
  // Delivery retries update the canonical booking before its transaction mirror.
  // Only expose the status for the same sale, tenant and paired location.
  const confirmation = booking && booking.siteId===state.siteId && booking.transactionId===transactionId && booking.kind==='booking' && booking.channel==='kiosk' && booking.locationId===state.locationId ? booking : record;
  const confirmationEmailStatus = confirmation.customerEmailSent === true ? 'sent' : confirmation.customerEmailDeliveryStatus === 'action_required' ? 'action_required' : 'pending';
  // Expiration, cancellation and failure require inventory reconciliation before
  // the screen can start another order. Browser redirects are never proof.
  return { kind, status: terminal ? 'review' : paid ? 'paid' : due ? 'due' : 'pending', saleId: state.saleId, canReset: paid || due, canResume: !terminal && !paid && !due && Boolean(active.response?.checkoutUrl), checkoutUrl: !terminal && !paid && !due ? active.response?.checkoutUrl || '' : '',
    transactionId, ...(kind==='booking'&&(paid||due)?{confirmationEmailStatus}:{}), ...(kind==='booking'&&(paid||due)&&bookingKioskPin(record)?{bookingReference:{code:record.bookingCode,pin:bookingKioskPin(record)}}:{}), total: Number(record.amountTotal || 0), subtotal: Number(record.subtotal || 0), tax: Number(record.tax || 0), taxIncluded: Boolean(record.pricesIncludeTax ?? state.active.pricesIncludeTax), queueNumber: record.queueNumber || '',
    receipt: paid ? { id: record.receiptId, createdAt: record.paidAt || record.createdAt } : null,
    items: (record.items || []).map(x => ({ name: String(x.name || ''), quantity: x.quantity, unitAmount: x.unitAmount })) };
}
export async function kioskView(store, state, site) {
  const configuration=await store.get(kioskConfigKey(site.siteId),{type:'json'});
  const capabilities = posCapabilities(site, posOperations(configuration));
  const modes=kioskBookingModes(configuration);if(site.features?.bookings===false)modes.newBookings=false;
  return { business: { siteId: site.siteId, nameEn: site.business?.nameEn || site.business?.name || site.slug, nameEs: site.business?.nameEs || site.business?.nameEn || site.business?.name || site.slug,
    logoAssetKey: site.business?.logoAssetKey || '', primary: site.design?.primary || '', secondary: site.design?.secondary || '', locationName: state.locationName, bookingUrl: `/sites/${encodeURIComponent(site.slug)}` },
    bookingModes:modes, bookingProviders:kioskBookingProviders(site),balanceProviders:kioskBookingProviders(site,true),timezone:site.settings?.timezone||'America/Puerto_Rico',
    appointmentServices:modes.newBookings?(site.catalog||[]).filter(x=>x.active!==false&&x.requiresAppointment&&x.type==='service').map(x=>({id:x.id,nameEn:x.nameEn||x.name,nameEs:x.nameEs||x.name,price:x.price})):[],
    professionals:modes.newBookings?(site.employees||[]).filter(x=>x.active!==false&&(!state.locationId||x.locationIds?.includes(state.locationId))).map(x=>({id:x.id,name:x.name,serviceIds:x.serviceIds||[]})):[],
    presentation: { profile: capabilities.profile }, saleId: state.saleId, providers: kioskProviders(site), taxConfig: { enabled: site.taxConfig?.enabled !== false, stateRate: site.taxConfig?.stateRate ?? 10.5, municipalRate: site.taxConfig?.municipalRate ?? 1, pricesIncludeTax: Boolean(site.taxConfig?.pricesIncludeTax) },
    catalog: (site.catalog || []).filter(x => x.active !== false && !x.requiresAppointment && Number.isFinite(x.price) && x.price >= 0).map(x => ({ id: x.id, type: x.type, nameEn: x.nameEn || x.name || x.nameEs || x.id, nameEs: x.nameEs || x.nameEn || x.name || x.id,
      price: x.price, imageAssetKey: x.imageAssetKey || '', descriptionEn: x.descriptionEn || x.description || '', descriptionEs: x.descriptionEs || x.descriptionEn || x.description || '', taxable: x.taxable !== false, taxRateOverride: x.taxRateOverride ?? null,
      trackInventory: Boolean(x.trackInventory), inventory: x.type === 'product' && x.trackInventory && x.inventory != null ? availableInventory(site, x) : null, allowBackorder: Boolean(x.allowBackorder) })),
    hasAppointments: (site.catalog || []).some(x => x.active !== false && x.requiresAppointment), sale: await kioskSaleView(store, state) };
}
