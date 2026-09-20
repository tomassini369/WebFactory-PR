import { clientCommerceStore, clientSiteStore, commerceKey, getClientSite } from "../lib/client-store.mjs";
import { sendBusinessCommerceEmail, sendCustomerCommerceEmail } from "../lib/client-notifications.mjs";
import { createGoogleEvent } from "../lib/google-calendar.mjs";

export default async () => {
  const sitePointers = await clientSiteStore().list({ prefix: "sites/" });
  let attempted = 0;
  let completed = 0;
  for (const pointer of (sitePointers.blobs || []).slice(0, 100)) {
    const siteId = pointer.key.replace(/^sites\//, "").replace(/\.json$/, "");
    const site = await getClientSite(siteId);
    if (!site) continue;
    const transactions = await clientCommerceStore().list({ prefix: `${siteId}/transactions/` });
    for (const blob of (transactions.blobs || []).slice(0, 250)) {
      let record = await clientCommerceStore().get(blob.key, { type: "json" });
      if (!record || record.paymentStatus !== "paid") continue;
      if (record.customerEmailSent && (record.businessEmailSent || !site.business?.email) && (record.kind !== "booking" || record.googleEventId || !site.googleCalendar?.connected)) continue;
      attempted += 1;
      try {
        const finalKey = commerceKey(siteId, record.kind === "booking" ? "bookings" : "orders", record.transactionId);
        if (record.kind === "booking" && !record.googleEventId && site.googleCalendar?.connected) {
          const employee = (site.employees || []).find((item) => item.id === record.employeeId);
          const event = await createGoogleEvent(siteId, employee?.calendarId, {
            summary: `${record.items?.[0]?.name || "Appointment"} — ${record.customer?.name || "Customer"}`,
            description: `WebFactory booking ${record.transactionId}`,
            start: { dateTime: record.start, timeZone: site.settings?.timezone || "America/Puerto_Rico" },
            end: { dateTime: record.end, timeZone: site.settings?.timezone || "America/Puerto_Rico" },
          });
          if (event?.id) { record.googleEventId = event.id; record.googleCalendarId = employee?.calendarId; }
        }
        if (!record.customerEmailSent) { await sendCustomerCommerceEmail(site, record); record.customerEmailSent = true; }
        if (!record.businessEmailSent && site.business?.email) { await sendBusinessCommerceEmail(site, record); record.businessEmailSent = true; }
        record.emailsSentAt = new Date().toISOString();
        await clientCommerceStore().setJSON(blob.key, record);
        await clientCommerceStore().setJSON(finalKey, record);
        completed += 1;
      } catch (error) { console.error("retry-client-commerce", record.transactionId, error?.message || error); }
    }
    const holds = await clientCommerceStore().list({ prefix: `${siteId}/holds/` });
    for (const blob of holds.blobs || []) {
      const hold = await clientCommerceStore().get(blob.key, { type: "json" });
      if (hold && Date.parse(hold.expiresAt || "") < Date.now()) await clientCommerceStore().delete(blob.key);
    }
  }
  console.log(`retry-client-commerce attempted=${attempted} completed=${completed}`);
};

export const config = { schedule: "@hourly" };
