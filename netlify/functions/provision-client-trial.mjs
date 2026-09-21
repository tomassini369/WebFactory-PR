import crypto from "node:crypto";
import { admin, requestPasswordRecovery } from "@netlify/identity";
import { assertSameOrigin, errorResponse, requirePlatformAdmin } from "../lib/client-auth.mjs";
import {
  getClientSiteBySlug,
  normalizeEmail,
  saveClientSite,
  slugify,
} from "../lib/client-store.mjs";
import { cleanText, validEmail } from "../lib/order-store.mjs";
import { createTrialServicePlan } from "../lib/subscription-billing.mjs";

const defaultHours = {
  Lunes: { enabled: true, open: "09:00", close: "17:00" },
  Martes: { enabled: true, open: "09:00", close: "17:00" },
  Miércoles: { enabled: true, open: "09:00", close: "17:00" },
  Jueves: { enabled: true, open: "09:00", close: "17:00" },
  Viernes: { enabled: true, open: "09:00", close: "17:00" },
  Sábado: { enabled: false, open: "10:00", close: "15:00" },
  Domingo: { enabled: false, open: "10:00", close: "15:00" },
};

async function ensureClientIdentity(email, siteId, businessName) {
  const users = await admin.listUsers({ page: 1, perPage: 500 });
  let user = users.find((candidate) => normalizeEmail(candidate.email) === email);
  if (!user) {
    user = await admin.createUser({
      email,
      password: crypto.randomBytes(48).toString("base64url"),
      data: {
        role: "client",
        app_metadata: { roles: ["client"], webfactory_site_ids: [siteId] },
        user_metadata: { business_name: businessName },
      },
    });
  } else {
    const previousSites = Array.isArray(user.appMetadata?.webfactory_site_ids)
      ? user.appMetadata.webfactory_site_ids
      : [];
    await admin.updateUser(user.id, {
      role: user.role === "admin" ? "admin" : "client",
      app_metadata: {
        ...(user.appMetadata || {}),
        roles: user.role === "admin" ? ["admin"] : ["client"],
        webfactory_site_ids: [...new Set([...previousSites, siteId])],
      },
    });
  }
  await requestPasswordRecovery(email);
}

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  }
  try {
    assertSameOrigin(req);
    await requirePlatformAdmin();
    const payload = await req.json();
    const businessName = cleanText(payload.businessName, 180);
    const ownerEmail = normalizeEmail(payload.ownerEmail);
    const slug = slugify(cleanText(payload.slug || businessName, 64));
    if (businessName.length < 2) {
      throw Object.assign(new Error("Business name is required."), { status: 400 });
    }
    if (!validEmail(ownerEmail)) {
      throw Object.assign(new Error("A valid owner email is required."), { status: 400 });
    }

    let site = await getClientSiteBySlug(slug);
    if (site && normalizeEmail(site.members?.find((member) => member.role === "owner")?.email) !== ownerEmail) {
      throw Object.assign(new Error("That website link is already in use."), { status: 409 });
    }
    if (!site) {
      const now = new Date().toISOString();
      site = await saveClientSite({
        siteId: `site-${crypto.randomUUID()}`,
        slug,
        status: "trial",
        createdAt: now,
        updatedAt: now,
        revision: 1,
        members: [{ email: ownerEmail, role: "owner" }],
        business: {
          name: businessName,
          contactName: cleanText(payload.contactName, 180),
          category: cleanText(payload.category, 180),
          description: "",
          phone: "",
          whatsapp: "",
          email: ownerEmail,
          mapsUrl: "",
          instagram: "",
        },
        design: { style: "Modern", primary: "#0B1529", secondary: "#3C86F6" },
        features: { products: true, services: true, bookings: true },
        catalog: [],
        employees: [],
        hours: defaultHours,
        paymentRules: {
          methods: { stripe: true, ath: false, inPerson: true },
          productPayment: "online",
          bookingPayment: "full",
          bookingDepositPercent: 25,
          sendCustomerReceipt: true,
          allowTips: false,
          stripeConnectedAccountId: "",
          stripeCapabilityStatus: "not_started",
          ath: { publicPath: "" },
          inPerson: { instructions: "" },
        },
        googleCalendar: { connected: false, calendarEmail: "", connectedAt: "", employeeCalendars: {} },
        settings: {
          locale: payload.locale === "en" ? "en" : "es",
          timezone: "America/Puerto_Rico",
          currency: "usd",
        },
        servicePlan: createTrialServicePlan(),
      });
    }

    await ensureClientIdentity(ownerEmail, site.siteId, businessName);
    const origin = new URL(req.url).origin;
    return Response.json({
      ok: true,
      siteId: site.siteId,
      slug: site.slug,
      status: site.status,
      trialEndsAt: site.servicePlan?.trialEndsAt || "",
      publicUrl: `${origin}/sites/${site.slug}`,
      portalUrl: `${origin}/client-admin`,
      invitationSent: true,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
