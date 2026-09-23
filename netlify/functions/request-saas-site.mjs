import crypto from "node:crypto";
import { admin, requestPasswordRecovery } from "@netlify/identity";
import { assertSameOrigin, errorResponse } from "../lib/client-auth.mjs";
import {
  clientAssetStore,
  clientSiteStore,
  getClientSiteBySlug,
  normalizeEmail,
  saveClientSite,
  sitesForEmail,
  slugify,
} from "../lib/client-store.mjs";
import { assetStore, safeFileName } from "../lib/order-store.mjs";
import { sanitizeOrder } from "./create-checkout-session.mjs";
import { createComplimentaryServicePlan } from "../lib/subscription-billing.mjs";

async function findIdentityUser(email) {
  for (let page = 1; page <= 20; page += 1) {
    const users = await admin.listUsers({ page, perPage: 500 });
    const match = users.find((candidate) => normalizeEmail(candidate.email) === email);
    if (match) return match;
    if (users.length < 500) break;
  }
  return null;
}

async function ensureClientIdentity(email, siteId, businessName) {
  let user = await findIdentityUser(email);
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

async function copyDraftAsset(assetKey, siteId, label) {
  if (!assetKey) return "";
  const [bytes, metadata] = await Promise.all([
    assetStore().get(assetKey, { type: "arrayBuffer" }),
    assetStore().getMetadata(assetKey),
  ]);
  if (!bytes) return "";
  const destination = `sites/${siteId}/${safeFileName(label, "asset")}-${crypto.randomUUID()}`;
  await clientAssetStore().set(destination, bytes, { metadata: metadata?.metadata || {} });
  return destination;
}

function pendingSubscriptionPlan() {
  return {
    code: "webfactory-saas",
    name: "WebFactory Commerce Platform",
    billingModel: "subscription",
    billingStatus: "pending_activation",
    subscriptionStatus: "not_started",
    migrationEligible: false,
    trialStartedAt: "",
    trialEndsAt: "",
    currentPeriodEnd: "",
    cancelAtPeriodEnd: false,
    stripeCustomerId: "",
    stripeSubscriptionId: "",
  };
}

const inviteHash = (token) => crypto.createHash("sha256").update(String(token || "")).digest("hex");

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  }
  try {
    assertSameOrigin(req);
    const payload = await req.json().catch(() => {
      throw Object.assign(new Error("Invalid request payload."), { status: 400 });
    });
    let order;
    try {
      order = sanitizeOrder(payload);
    } catch (error) {
      throw Object.assign(error, { status: 400 });
    }
    const ownerEmail = normalizeEmail(order.client.email);
    const complimentaryInviteToken = cleanText(payload.complimentaryInviteToken, 200);
    let complimentaryInvite = null;
    if (complimentaryInviteToken) {
      complimentaryInvite = await clientSiteStore().get(`complimentary-invites/${inviteHash(complimentaryInviteToken)}.json`, { type: "json" });
      const expired = !complimentaryInvite?.expiresAt || new Date(complimentaryInvite.expiresAt).getTime() <= Date.now();
      if (!complimentaryInvite || complimentaryInvite.status !== "pending" || expired) {
        throw Object.assign(new Error("This complimentary invitation is invalid or expired."), { status: 403 });
      }
      if (normalizeEmail(complimentaryInvite.email) !== ownerEmail) {
        throw Object.assign(new Error("Use the email address that received the complimentary invitation."), { status: 403 });
      }
    }
    const requestedSlug = slugify(payload.slug || order.business.name);
    const existingForEmail = await sitesForEmail(ownerEmail);
    const reusable = existingForEmail.find((site) =>
      site.sourceDraftId === order.draftId || site.slug === requestedSlug
    );
    const slugOwner = await getClientSiteBySlug(requestedSlug);

    if (slugOwner && normalizeEmail(slugOwner.members?.find((member) => member.role === "owner")?.email) !== ownerEmail) {
      throw Object.assign(new Error("That website link is already in use."), { status: 409 });
    }
    if (existingForEmail.length >= 3 && !reusable) {
      throw Object.assign(new Error("This account already has the maximum number of setup requests. Contact WebFactory to add another business."), { status: 409 });
    }

    let site = reusable || slugOwner;
    if (!site) {
      const now = new Date().toISOString();
      const siteId = `site-${crypto.randomUUID()}`;
      const logoAssetKey = await copyDraftAsset(order.business.logoAssetKey, siteId, "logo");
      const heroAssetKey = await copyDraftAsset(order.business.heroAssetKey, siteId, "hero");
      const galleryAssetKeys = [];
      for (const [index, asset] of (order.business.galleryAssets || []).slice(0,100).entries()) {
        const key = await copyDraftAsset(asset.assetKey, siteId, `gallery-${index + 1}`);
        if (key) galleryAssetKeys.push(key);
      }
      const catalog = [];
      for (const item of order.catalog) {
        catalog.push({
          ...item,
          active: true,
          inventory: item.type === "product" ? null : undefined,
          bufferMinutes: 0,
          imageAssetKey: await copyDraftAsset(item.imageAssetKey, siteId, `catalog-${item.id}`),
        });
      }
      const employees = order.team.map((member) => ({
        ...member,
        active: true,
        calendarId: "",
        dailyLimit: 8,
        schedule: order.hours,
        timeOff: [],
      }));
      site = await saveClientSite({
        siteId,
        sourceDraftId: order.draftId,
        slug: requestedSlug,
        status: complimentaryInvite ? "active" : "setup_pending",
        createdAt: now,
        updatedAt: now,
        revision: 1,
        members: [{ email: ownerEmail, role: "owner" }],
        business: { ...order.business, logoAssetKey, heroAssetKey, galleryAssetKeys },
        design: { ...order.design },
        features: { ...order.features },
        catalog,
        employees,
        hours: order.hours,
        paymentRules: {
          ...order.payments,
          stripeConnectedAccountId: "",
          stripeCapabilityStatus: "not_started",
        },
        googleCalendar: { connected: false, calendarEmail: "", connectedAt: "", employeeCalendars: {} },
        settings: { locale: payload.locale === "es" ? "es" : "en", timezone: "America/Puerto_Rico", currency: "usd" },
        servicePlan: complimentaryInvite ? createComplimentaryServicePlan({ grantedBy: complimentaryInvite.grantedBy || "webfactory-admin", note: "Email-only complimentary invitation" }) : pendingSubscriptionPlan(),
      });
    }

    if (complimentaryInvite) {
      if (site.servicePlan?.billingModel !== "complimentary") {
        site = await saveClientSite({
          ...site,
          status: "active",
          updatedAt: new Date().toISOString(),
          revision: Number(site.revision || 0) + 1,
          servicePlan: createComplimentaryServicePlan({
            grantedBy: complimentaryInvite.grantedBy || "webfactory-admin",
            note: "Email-only complimentary invitation",
          }),
        });
      }
      await clientSiteStore().setJSON(`complimentary-invites/${inviteHash(complimentaryInviteToken)}.json`, {
        ...complimentaryInvite,
        status: "redeemed",
        redeemedAt: new Date().toISOString(),
        siteId: site.siteId,
      });
    }

    await ensureClientIdentity(ownerEmail, site.siteId, order.business.name);
    const origin = new URL(req.url).origin;
    return Response.json({
      ok: true,
      siteId: site.siteId,
      slug: site.slug,
      status: site.status,
      publicUrl: `${origin}/sites/${site.slug}`,
      portalUrl: `${origin}/client-admin`,
      accessEmailSent: true,
      accessType: complimentaryInvite ? "complimentary" : "trial",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = {
  rateLimit: {
    windowLimit: 5,
    windowSize: 3600,
    aggregateBy: ["ip"],
  },
};
