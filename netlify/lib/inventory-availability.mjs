import crypto from 'node:crypto';

export const reservationId = reference => crypto.createHash('sha256').update(`reservation:${reference}`).digest('hex');
export function inventoryLines(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw Object.assign(new Error('Invalid inventory items.'), {status:400});
  const seen = new Set();
  return items.map(row => {
    const quantity = Number(row.quantity);
    if (typeof row.id !== 'string' || !row.id || seen.has(row.id) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000) throw Object.assign(new Error('Use unique products and whole quantities.'), {status:400});
    seen.add(row.id);
    return {id:row.id, quantity};
  }).sort((a,b) => a.id.localeCompare(b.id));
}
export const inventoryFingerprint = items => crypto.createHash('sha256').update(JSON.stringify(inventoryLines(items))).digest('hex');
export function reservedQuantity(site, itemId, exceptReference = '') {
  return Object.values(site.stockReservations || {}).reduce((sum, reservation) => {
    if (reservation.state !== 'held' || reservation.referenceId === exceptReference) return sum;
    return sum + (reservation.lines || []).filter(line => line.id === itemId).reduce((total,line) => total + Number(line.quantity), 0);
  }, 0);
}
export function availableInventory(site, item) {
  if (item.type !== 'product' || !item.trackInventory || item.inventory == null) return item.inventory;
  return Math.max(0, Number(item.inventory) - reservedQuantity(site,item.id));
}
