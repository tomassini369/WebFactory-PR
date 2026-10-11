// Presentation capabilities never grant role permissions or change checkout rules.
export const POS_PROFILES = ['auto', 'restaurant', 'barber', 'salon', 'retail', 'workshop', 'general'];
export function posOperations(configuration = {}) {
  const saved = configuration?.operations;
  if (saved && (typeof saved.cashierEnabled !== 'boolean' || typeof saved.displayEnabled !== 'boolean' || !POS_PROFILES.includes(saved.profile) || !Number.isSafeInteger(saved.revision) || saved.revision < 0)) {
    throw Object.assign(new Error('Invalid POS configuration / Configuración POS inválida.'), { status: 503 });
  }
  return saved ? { cashierEnabled: saved.cashierEnabled, displayEnabled: saved.displayEnabled, profile: saved.profile, revision: saved.revision } : { cashierEnabled: true, displayEnabled: true, profile: 'auto', revision: 0 };
}
export function posCapabilities(site = {}, operations = posOperations()) {
  const category = String(site.business?.category || site.design?.templateCategory || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const inferred = /restaurant|restaurante|food|comida|catering|bakery|panader|cafeter|cafe|coffee|alimento/.test(category) ? 'restaurant'
    : /barber|barberia/.test(category) ? 'barber'
    : /salon|beauty|belleza|estetic|spa|peluquer/.test(category) ? 'salon'
    : /workshop|taller|mechanic|mecanic|repair|reparacion|automotriz/.test(category) ? 'workshop'
    : /retail|tienda|store|shop|commerce|comercio|boutique/.test(category) ? 'retail' : 'general';
  const profile = operations.profile === 'auto' ? inferred : operations.profile;
  const catalog = (site.catalog || []).filter(item => item.active !== false);
  return { profile, products: catalog.some(item => item.type === 'product'), services: catalog.some(item => item.type === 'service'),
    appointments: catalog.some(item => item.requiresAppointment), inventory: catalog.some(item => item.type === 'product' && item.trackInventory),
    kitchen: inferred === 'restaurant', professionals: ['barber', 'salon'].includes(profile) && (site.employees || []).some(item => item.active !== false),
    serviceFirst: ['barber', 'salon', 'workshop'].includes(profile) };
}
