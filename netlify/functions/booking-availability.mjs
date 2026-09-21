import { availabilityForDate } from "../lib/booking-engine.mjs";
import { getClientSite, getClientSiteBySlug } from "../lib/client-store.mjs";
import { siteEntitlement } from "../lib/subscription-billing.mjs";

export default async (req) => {
  if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    const payload = await req.json();
    const site = payload.siteId ? await getClientSite(payload.siteId) : await getClientSiteBySlug(payload.slug);
    if (!site) return Response.json({ ok: false, message: "Business site not found." }, { status: 404 });
    if (!siteEntitlement(site).public) return Response.json({ ok: false, message: "Business site is not available." }, { status: 404 });
    const slots = await availabilityForDate(site, String(payload.serviceId || ""), String(payload.employeeId || ""), String(payload.date || ""));
    return Response.json({ ok: true, slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, message: error?.message || "Availability could not be loaded." }, { status: Number(error?.status || 500), headers: { "Cache-Control": "no-store" } });
  }
};
