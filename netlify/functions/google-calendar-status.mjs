import { errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { googleConfigured, listGoogleCalendars } from "../lib/google-calendar.mjs";

export default async (req) => {
  if (req.method !== "GET") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    const siteId = new URL(req.url).searchParams.get("siteId") || "";
    const { site } = await requireSiteAccess(siteId);
    let calendars = [];
    let message = "";
    if (site.googleCalendar?.connected && googleConfigured()) {
      try { calendars = await listGoogleCalendars(siteId); }
      catch (error) { message = error.message; }
    }
    return Response.json({ ok: true, configured: googleConfigured(), connected: Boolean(site.googleCalendar?.connected), calendars, message }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
};
