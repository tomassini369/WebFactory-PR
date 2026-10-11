import { clientCommerceStore } from './client-store.mjs';
import { kioskConfigKey, mutateKiosk, kioskFail } from './kiosk.mjs';
import { POS_PROFILES, posOperations } from './pos-capabilities.mjs';
export async function readPosOperations(siteId, store = clientCommerceStore()) {
  return posOperations(await store.get(kioskConfigKey(siteId), { type: 'json' }));
}
export async function requireCashierPos(siteId, store = clientCommerceStore()) {
  if (!(await readPosOperations(siteId, store)).cashierEnabled) throw kioskFail('Cashier POS disabled / POS del cajero deshabilitado.', 403);
}
export async function requireCustomerDisplay(siteId, store = clientCommerceStore()) {
  if (!(await readPosOperations(siteId, store)).displayEnabled) throw kioskFail('Customer display disabled / Pantalla del cliente deshabilitada.', 403);
}
export async function configurePosOperations(store, siteId, input, actor, now) {
  if (typeof input.cashierEnabled !== 'boolean' || typeof input.displayEnabled !== 'boolean' || !POS_PROFILES.includes(input.profile) || !Number.isSafeInteger(input.revision) || input.revision < 0) throw kioskFail('Invalid POS settings / Ajustes POS inválidos.');
  const configuration = await mutateKiosk(store, kioskConfigKey(siteId), current => {
    const previous = posOperations(current);
    if (input.revision !== previous.revision) throw kioskFail('Settings changed; reload before saving / Los ajustes cambiaron; recarga antes de guardar.', 409);
    if (previous.cashierEnabled === input.cashierEnabled && previous.displayEnabled === input.displayEnabled && previous.profile === input.profile) return null;
    const events = current?.operations?.events || [];
    if (events.length >= 2000) throw kioskFail('Settings audit requires archival / La auditoría de ajustes requiere archivo.', 409);
    const operations = { cashierEnabled: input.cashierEnabled, displayEnabled: input.displayEnabled, profile: input.profile, revision: previous.revision + 1,
      events: [...events, { at: now, actor, before: previous, after: { cashierEnabled: input.cashierEnabled, displayEnabled: input.displayEnabled, profile: input.profile } }] };
    return { ...(current || { enabled: false, devices: [] }), operations };
  });
  return posOperations(configuration);
}
