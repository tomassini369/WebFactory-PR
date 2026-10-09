import crypto from 'node:crypto';
import { clientCommerceStore, commerceKey, getClientSite, publicClientSite } from './client-store.mjs';
import { getV3Record } from './webfactory-v3-store.mjs';

// A read-only capability for exactly one checkout. Store only its hash, expire in seven days.
export async function issueBuyerReceiptAccess(siteId, transactionId, store = clientCommerceStore()) {
  const token = crypto.randomBytes(24).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await store.setJSON(`buyer-receipts/${hash}.json`, { siteId, transactionId, expiresAt: Date.now() + 7 * 86400000 });
  return { token, hash };
}
export async function readBuyerReceipt(token, { store = clientCommerceStore(), readSite = getClientSite, readReceipt = getV3Record, slug } = {}) {
  const missing = () => Object.assign(new Error('Receipt link is invalid or expired.'), { status: 404 });
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(token)) throw missing();
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const pointer = await store.get(`buyer-receipts/${hash}.json`, { type: 'json' });
  if (!pointer?.siteId || !pointer.transactionId || !Number.isFinite(pointer.expiresAt) || pointer.expiresAt <= Date.now()) throw missing();
  // Check the settled collection first; pending Stripe/ATH records may live in transactions.
  const record = await store.get(commerceKey(pointer.siteId, 'orders', pointer.transactionId), { type: 'json' })
    || await store.get(commerceKey(pointer.siteId, 'bookings', pointer.transactionId), { type: 'json' })
    || await store.get(commerceKey(pointer.siteId, 'transactions', pointer.transactionId), { type: 'json' });
  if (!record || record.siteId !== pointer.siteId || record.transactionId !== pointer.transactionId || record.buyerReceiptHash !== hash) throw missing();
  if (['failed', 'cancelled', 'expired'].includes(record.paymentStatus) || record.status === 'cancelled') return { status: 'failed' };
  if (!['paid', 'paid_in_person', 'refunded', 'partially_refunded'].includes(record.paymentStatus)) return { status: 'pending' };
  if (!record.receiptId) return { status: 'pending' };
  const receipt = await readReceipt(pointer.siteId, 'receipts', record.receiptId);
  if (!receipt) return { status: 'pending' };
  if (receipt.siteId !== pointer.siteId || receipt.transactionId !== pointer.transactionId || receipt.receiptId !== record.receiptId || receipt.customer?.email !== record.customer?.email) throw missing();
  const site = await readSite(pointer.siteId);
  if (!site || site.siteId !== pointer.siteId || (slug && site.slug !== slug)) throw missing();
  const business = publicClientSite(site).business;
  // Return presentation fields only; never return contact data, provider IDs, access tokens or owner settings.
  return { status: 'ready', timeZone: site.settings?.timezone || 'America/Puerto_Rico', receipt: {
    receiptId: receipt.receiptId, transactionId: receipt.transactionId, total: receipt.total, subtotal: receipt.subtotal,
    discounts: receipt.discounts, tax: receipt.tax, tip: receipt.tip, paymentStatus: receipt.paymentStatus,
    paymentMethod: receipt.paymentMethod, createdAt: receipt.createdAt,
    items: (receipt.items || []).map(({name, quantity, unitAmount, amount}) => ({name, quantity, unitAmount, amount})),
    customer: { name: '', email: '' }, businessName: business.name || business.nameEs || business.nameEn || '', logoUrl: business.logoUrl || '',
  }};
}
