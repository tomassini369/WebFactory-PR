import { detectDeployContext } from "../lib/stripe-runtime.mjs";
import { clientSiteStore, clientCommerceStore, getClientSite } from "../lib/client-store.mjs";
import { dueBookingReminders, sendBookingReminders } from "../lib/booking-reminders.mjs";

export default async (req) => {
  if (detectDeployContext({ requestUrl: req?.url }) !== "production") return;
  const started = Date.now(), now = started;
  const sites = await clientSiteStore().list({ prefix: "sites/" });
  let sent = 0;
  for (const pointer of sites.blobs || []) {
    if (Date.now() - started > 20000) break;
    const site = await getClientSite(pointer.key.replace(/^sites\//, "").replace(/\.json$/, ""));
    if (!site || site.status !== "active") continue;
    const bookings = await clientCommerceStore().list({ prefix: `${site.siteId}/bookings/` });
    for (const blob of bookings.blobs || []) {
      if (Date.now() - started > 20000) break;
      const record = await clientCommerceStore().get(blob.key, { type: "json" });
      if (record && dueBookingReminders(record, now).length) sent += await sendBookingReminders(site, record, now, started + 20000);
    }
  }
  console.log(`booking-reminders sent=${sent}`);
};
export const config = { schedule: "*/5 * * * *" };
