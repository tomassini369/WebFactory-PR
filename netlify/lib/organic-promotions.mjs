import {discoverableSite} from './marketplace.mjs';
import {publicClientSite} from './client-store.mjs';

export function publicPromotion(site, offer, now) {
  if (!discoverableSite(site) || site.siteId !== offer.siteId || offer.start > now || offer.end <= now || offer.withdrawn) return null;
  const business = publicClientSite(site);
  const item = business.catalog.find(row => row.id === offer.itemId);
  if (!item || business.features[item.type === 'product' ? 'products' : 'services'] === false || !Number.isFinite(item.price) || item.price !== offer.price) return null;
  const stored = site.catalog.find(row => row.id === offer.itemId);
  if (item.type === "product" && stored?.trackInventory && !stored.allowBackorder && item.inventory != null && item.inventory <= 0) return null;
  return {slug:site.slug, business:business.business.name, itemId:item.id, name:item.name, price:item.price, title:offer.title, terms:offer.terms, end:offer.end};
}

export function validatePromotion(site, input, now) {
  const item = publicClientSite(site).catalog.find(row => row.id === input.itemId);
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const terms = typeof input.terms === 'string' ? input.terms.trim() : '';
  if (!item || !title || title.length > 90 || !terms || terms.length > 500 ||
      !Number.isSafeInteger(input.start) || !Number.isSafeInteger(input.end) ||
      input.end <= Math.max(input.start, now) || !Number.isFinite(item.price)) return null;
  return {siteId:site.siteId, itemId:item.id, price:item.price, title, terms, start:input.start, end:input.end};
}
