import { assertSameOrigin, errorResponse } from "../lib/client-auth.mjs";
import { siteEntitlement } from "../lib/subscription-billing.mjs";
import { emailConfigured, sendEmail } from "../lib/email.mjs";
import { getClientSiteBySlug } from "../lib/client-store.mjs";
import { cleanText, validEmail } from "../lib/platform-utils.mjs";
import { renderContactEmail } from "../lib/contact-email-template.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok:false,message:"Method not allowed." }, { status:405 });
  }
  try {
    assertSameOrigin(req);
    const payload = await req.json();
    if (payload.website) return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    const slug = cleanText(payload.slug, 80);
    const name = cleanText(payload.name, 180);
    const email = cleanText(payload.email, 320);
    const phone = cleanText(payload.phone, 80);
    const message = cleanText(payload.message, 5000);
    if (!slug || !name || !validEmail(email) || !message) {
      return Response.json({ ok:false,message:"Complete the required contact fields." }, { status:400 });
    }

    const site = await getClientSiteBySlug(slug);
    if (!site || !siteEntitlement(site).public || site.features?.form === false || !site.business?.email) {
      return Response.json({ ok:false,message:"Contact form is not available." }, { status:404 });
    }

    if (!emailConfigured()) {
      return Response.json({ ok:false,message:"Contact delivery is temporarily unavailable." }, { status:503 });
    }

    await sendEmail({
      category:"info",
      fromName:site.business?.name || "WebFactory Contact",
      to:site.business.email,
      replyTo:email,
      ...renderContactEmail(site,{name,email,phone,message,language:payload.language === "es" ? "es" : payload.language === "en" ? "en" : undefined}),
      headers:{"X-WebFactory-Site-ID":site.siteId},
    });

    return Response.json({ ok:true });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = {
  rateLimit: {
    windowLimit: 10,
    windowSize: 180,
    aggregateBy: ["ip"],
  },
};
