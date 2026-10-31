const bounds = {
  minimumNoticeMinutes: [0, 43200, 60],
  maximumAdvanceDays: [0, 365, 0],
  slotIntervalMinutes: [5, 120, 15],
  bufferBeforeMinutes: [0, 240, 0],
  bufferAfterMinutes: [0, 240, 0],
  cancellationNoticeMinutes: [0, 43200, 0],
  rescheduleNoticeMinutes: [0, 43200, 60],
};

export function normalizeBookingPolicy(input = {}, current = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new Error('Invalid booking policy.'), {status: 400});
  return Object.fromEntries(Object.entries(bounds).map(([key, [min, max, fallback]]) => {
    const value = input[key] ?? current[key] ?? fallback;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw Object.assign(new Error(`Invalid ${key}: ${min}-${max}.`), {status: 400});
    return [key, value];
  }));
}

export function bookingPolicy(site) {
  return normalizeBookingPolicy(site.settings?.bookingPolicy || {});
}

export function bookingBuffers(site, service) {
  const policy = bookingPolicy(site);
  return {before: Math.max(0, Number(service.bufferBeforeMinutes ?? policy.bufferBeforeMinutes)), after: Math.max(0, Number(service.bufferMinutes ?? policy.bufferAfterMinutes))};
}
