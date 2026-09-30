import { detectStripeKeyMode } from './stripe-runtime.mjs';

export function revenueWindow(now = new Date()) {
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: 'America/Puerto_Rico' });
  const anchor = new Date(`${today}T12:00:00Z`);
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(anchor);
    date.setUTCDate(date.getUTCDate() - 29 + index);
    return date.toISOString().slice(0, 10);
  });
  return { days, since: Math.floor(Date.parse(`${days[0]}T00:00:00-04:00`) / 1000), until: Math.floor(new Date(now).getTime() / 1000) + 1 };
}

export function summarizePlatformCharges(charges, { now = new Date(), mode = 'live', complete = true } = {}) {
  const window = revenueWindow(now);
  const daily = new Map(window.days.map(date => [date, 0]));
  const seen = new Set();
  let capturedCents = 0, refundedCents = 0, paymentCount = 0, excludedCount = 0;
  for (const charge of charges) {
    if (!charge?.id || seen.has(charge.id)) continue;
    seen.add(charge.id);
    // Direct connected-account sales aren't listed on the platform account. Also
    // exclude destination charges/transfers and explicitly tagged client commerce.
    if (charge.transfer_data?.destination || charge.destination || charge.source_transfer || charge.on_behalf_of || ['webfactory_client_commerce', 'webfactory_terminal'].includes(charge.metadata?.flow)) { excludedCount++; continue; }
    if (charge.livemode !== (mode === 'live') || charge.currency !== 'usd' || !charge.paid || charge.status !== 'succeeded' || !charge.captured || charge.disputed) { excludedCount++; continue; }
    const captured = Number(charge.amount_captured);
    const refunded = Number(charge.amount_refunded);
    const timestamp = Number(charge.created);
    if (!Number.isSafeInteger(captured) || captured <= 0 || !Number.isSafeInteger(refunded) || refunded < 0 || refunded > captured || !Number.isFinite(timestamp) || timestamp < window.since || timestamp >= window.until) { excludedCount++; continue; }
    const date = new Date(timestamp * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Puerto_Rico' });
    if (!daily.has(date)) continue;
    capturedCents += captured;
    refundedCents += refunded;
    paymentCount++;
    daily.set(date, daily.get(date) + captured - refunded);
  }
  const days = [...daily].slice(-7).map(([date, netCents]) => ({ date, netCents }));
  return { available: true, complete, mode, currency: 'usd', timezone: 'America/Puerto_Rico', generatedAt: new Date(now).toISOString(), periodStart: window.days[0], periodEnd: window.days.at(-1), capturedCents, refundedCents, netCents: capturedCents - refundedCents, paymentCount, last7DaysCents: days.reduce((sum, day) => sum + day.netCents, 0), days, excludedCount, loadedCharges: seen.size };
}

export async function loadPlatformRevenue({ secretKey, createStripe, now = new Date(), maxPages = 10, deadlineMs = 15000 }) {
  const mode = detectStripeKeyMode(secretKey);
  const unavailable = reason => ({ available: false, reason, mode, timezone: 'America/Puerto_Rico' });
  if (!['live', 'test'].includes(mode)) return unavailable('not_configured');
  try {
    const stripe = createStripe(secretKey);
    const window = revenueWindow(now);
    const charges = [];
    let cursor, complete = false;
    const deadline = Date.now() + deadlineMs;
    for (let page = 0; page < maxPages; page++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) return unavailable('temporarily_unavailable');
      const result = await stripe.charges.list({ limit: 100, created: { gte: window.since, lt: window.until }, ...(cursor ? { starting_after: cursor } : {}) }, { timeout: remaining, maxNetworkRetries: 0 });
      charges.push(...result.data);
      if (!result.has_more) { complete = true; break; }
      const next = result.data.at(-1)?.id;
      if (!next || next === cursor) return unavailable('temporarily_unavailable');
      cursor = next;
    }
    return summarizePlatformCharges(charges, { now, mode, complete });
  } catch {
    // Do not expose Stripe errors, credentials or customer/payment details.
    return unavailable('temporarily_unavailable');
  }
}
