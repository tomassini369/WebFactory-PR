import { clientSiteStore, getClientSite } from "../lib/client-store.mjs";
import { sendEmail } from "../lib/email.mjs";
import { listV3Records, putV3Record } from "../lib/webfactory-v3-store.mjs";

export default async () => {
  const sitePointers = await clientSiteStore().list({ prefix: "sites/" });
  let attempted = 0;
  let sent = 0;

  for (const pointer of (sitePointers.blobs || []).slice(0, 100)) {
    const siteId = pointer.key.replace(/^sites\//, "").replace(/\.json$/, "");
    const site = await getClientSite(siteId);
    if (!site?.reviewSettings?.enabled) continue;

    const requests = await listV3Records(siteId, "review-requests", { limit: 500 });
    for (const request of requests) {
      if (request.status !== "pending") continue;
      if (Date.parse(request.dueAt || "") > Date.now()) continue;
      if (!request.customer?.email || !request.reviewUrl) continue;
      attempted += 1;
      try {
        const es = site.settings?.locale === "es";
        const businessName = (es ? (site.business?.nameEs || site.business?.name || site.business?.nameEn) : (site.business?.nameEn || site.business?.name || site.business?.nameEs)) || (es ? "el negocio" : "the business");
        const customerName = request.customer?.name || (es ? "hola" : "there");
        const text = es ? [
          `Hola ${customerName},`,
          "",
          `Gracias por elegir ${businessName}.`,
          "Si tienes un momento, agradeceríamos mucho tu reseña:",
          request.reviewUrl,
          "",
          "Gracias.",
        ].join("\n") : [
          `Hello ${customerName},`,
          "",
          `Thank you for choosing ${businessName}.`,
          "If you have a moment, we would appreciate your review:",
          request.reviewUrl,
          "",
          "Thank you.",
        ].join("\n");

        await sendEmail({
          category: "team",
          fromName: businessName,
          to: request.customer.email,
          subject: es ? `¿Cómo fue tu experiencia con ${businessName}?` : `How was your experience with ${businessName}?`,
          text,
        });

        await putV3Record(siteId, "review-requests", request.reviewRequestId, {
          ...request,
          status: "sent",
          sentAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        sent += 1;
      } catch (error) {
        console.error("process-review-requests", request.reviewRequestId, error?.message || error);
        await putV3Record(siteId, "review-requests", request.reviewRequestId, {
          ...request,
          attempts: Number(request.attempts || 0) + 1,
          lastError: String(error?.message || error).slice(0, 500),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  console.log(`process-review-requests attempted=${attempted} sent=${sent}`);
};

export const config = { schedule: "@hourly" };
