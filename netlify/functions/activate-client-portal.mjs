import crypto from "node:crypto";
import { admin, requestPasswordRecovery } from "@netlify/identity";
import { assertSameOrigin, errorResponse } from "../lib/client-auth.mjs";
import { ensureClientSiteForOrder, normalizeEmail } from "../lib/client-store.mjs";
import { patchOrder, publicBaseUrl } from "../lib/order-store.mjs";
import { authorizePaymentSetup } from "../lib/payment-setup.mjs";

export default async (req) => {
  if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  try {
    assertSameOrigin(req);
    const payload = await req.json();
    const order = await authorizePaymentSetup(payload.orderId, payload.token);
    if (!order) throw Object.assign(new Error("The private activation link is invalid or expired."), { status: 403 });

    const site = await ensureClientSiteForOrder(order);
    const email = normalizeEmail(order.client?.email);
    if (!email) throw new Error("The order does not have a valid customer email.");

    const users = await admin.listUsers({ page: 1, perPage: 1000 });
    let user = users.find((candidate) => normalizeEmail(candidate.email) === email);
    if (!user) {
      user = await admin.createUser({
        email,
        password: crypto.randomBytes(48).toString("base64url"),
        data: {
          role: "client",
          app_metadata: { roles: ["client"], webfactory_site_ids: [site.siteId] },
          user_metadata: { full_name: order.client?.name || "", business_name: order.business?.name || "" },
        },
      });
    } else {
      const previousSites = Array.isArray(user.appMetadata?.webfactory_site_ids) ? user.appMetadata.webfactory_site_ids : [];
      await admin.updateUser(user.id, {
        role: user.role === "admin" ? "admin" : "client",
        app_metadata: {
          ...(user.appMetadata || {}),
          roles: user.role === "admin" ? ["admin"] : ["client"],
          webfactory_site_ids: [...new Set([...previousSites, site.siteId])],
        },
      });
    }

    await requestPasswordRecovery(email);
    await patchOrder(order.orderId, {
      clientSiteId: site.siteId,
      clientSiteSlug: site.slug,
      clientPortalProvisionedAt: order.clientPortalProvisionedAt || new Date().toISOString(),
      clientPortalRecoverySentAt: new Date().toISOString(),
    });

    return Response.json({
      ok: true,
      message: "We sent a secure password setup link to the order email.",
      portalUrl: `${publicBaseUrl()}/client-admin`,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
