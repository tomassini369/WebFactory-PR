// Invalid legacy catalog values must never become a zero-valued sale.
export function catalogPriceCents(value) {
  if (!['number','string'].includes(typeof value) || typeof value==='string'&&!value.trim()) {
    throw Object.assign(new Error('Catalog price requires owner review / El precio requiere revisión del Dueño.'),{status:409});
  }
  const number=Number(value),cents=Math.round(number*100);
  if (!Number.isFinite(number)||number<0||!Number.isSafeInteger(cents)) {
    throw Object.assign(new Error('Catalog price requires owner review / El precio requiere revisión del Dueño.'),{status:409});
  }
  return cents;
}
