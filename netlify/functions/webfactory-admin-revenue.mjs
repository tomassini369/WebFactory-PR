import Stripe from 'stripe';
import { requirePlatformAdmin, errorResponse } from '../lib/client-auth.mjs';
import { loadPlatformRevenue } from '../lib/platform-revenue.mjs';

export default async req => {
  if (req.method !== 'GET') return Response.json({ ok: false, message: 'Method not allowed.' }, { status: 405 });
  try {
    await requirePlatformAdmin();
    const revenue = await loadPlatformRevenue({
      secretKey: globalThis.Netlify?.env?.get('STRIPE_SECRET_KEY') || '',
      createStripe: key => new Stripe(key, { apiVersion: '2026-08-26.dahlia', timeout: 15000, maxNetworkRetries: 0 }),
    });
    return Response.json({ ok: true, revenue }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch (error) {
    return errorResponse(error);
  }
};
