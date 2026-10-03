export type DashboardRecord = {
  transactionId: string; kind: string; customer?: { name?: string; email?: string };
  amountTotal: number; refundedAmount?: number; paymentStatus: string; status: string;
  createdAt: string; paidAt?: string; start?: string;
}

export function businessDateKey(value: Date | string, timeZone: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function validTimeZone(value?: string): string {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value || 'America/Puerto_Rico' }); return value || 'America/Puerto_Rico'; }
  catch { return 'America/Puerto_Rico'; }
}

export function shiftDateKey(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function monthCells(month: string): Array<string | null> {
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const length = Math.ceil((offset + count) / 7) * 7;
  return Array.from({ length }, (_, index) => index >= offset && index < offset + count ? `${month}-${String(index - offset + 1).padStart(2, '0')}` : null);
}

export function shiftMonth(month: string, delta: number): string {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}

export function dashboardSummary(orders: DashboardRecord[], bookings: DashboardRecord[], timeZone: string, now = new Date()) {
  const all = [...orders, ...bookings];
  const paid = all.filter(record => ['paid', 'paid_in_person', 'partially_refunded'].includes(record.paymentStatus));
  const net = (record: DashboardRecord) => Math.max(0, (Number(record.amountTotal) || 0) - (Number(record.refundedAmount) || 0));
  const today = businessDateKey(now, timeZone);
  const activeBookings = bookings.filter(record => record.start && Number.isFinite(Date.parse(record.start)) && !['cancelled', 'canceled', 'refunded'].includes(record.status));
  // Group by the known receipt date, falling back to creation for legacy records.
  const days = Array.from({ length: 7 }, (_, index) => {
    const key = shiftDateKey(today, index - 6);
    return {
      key,
      sales: paid.filter(record => businessDateKey(record.paidAt || record.createdAt, timeZone) === key).reduce((sum, record) => sum + net(record), 0),
      orders: orders.filter(record => businessDateKey(record.createdAt, timeZone) === key).length,
      bookings: activeBookings.filter(record => businessDateKey(record.start!, timeZone) === key).length,
    };
  });
  return { today, days, activeBookings,
    revenue: paid.reduce((sum, record) => sum + net(record), 0),
    customers: new Set(all.map(record => record.customer?.email?.trim().toLowerCase()).filter(Boolean)).size,
    recent: all.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 4),
    upcoming: activeBookings.filter(record => Date.parse(record.start!) >= now.getTime()).sort((a, b) => Date.parse(a.start!) - Date.parse(b.start!)).slice(0, 3),
  };
}
