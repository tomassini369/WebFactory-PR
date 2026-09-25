import crypto from "node:crypto";
import { assertSameOrigin, errorResponse, requirePlatformAdmin } from "../lib/client-auth.mjs";
import { clientSiteStore, emailHash, normalizeEmail } from "../lib/client-store.mjs";
import { validEmail } from "../lib/platform-utils.mjs";
import { sendEmail } from "../lib/email.mjs";

const hashToken = (token) => crypto.createHash("sha256").update(String(token || "")).digest("hex");

export default async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    assertSameOrigin(req);
    const administrator = await requirePlatformAdmin();
    const payload = await req.json();
    const email = normalizeEmail(payload.email);
    if (!validEmail(email)) throw Object.assign(new Error("A valid invitee email is required."), { status: 400 });

    const token = crypto.randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const record = {
      id: `trial-invite-${crypto.randomUUID()}`,
      email,
      emailHash: emailHash(email),
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt,
      invitedBy: administrator.email,
      redeemedAt: "",
      siteId: "",
    };
    await clientSiteStore().setJSON(`trial-invites/${hashToken(token)}.json`, record);

    const builderUrl = `${new URL(req.url).origin}/builder?trial_invite=${encodeURIComponent(token)}`;
    await sendEmail({
      category: "team",
      to: email,
      subject: "Your WebFactory 7-day trial invitation",
      text: `You have been invited to start a free 7-day WebFactory trial. Open this private link to build your website: ${builderUrl}\n\nNo card is required. Your trial starts when you activate it from your client portal after setup. This invitation expires in 30 days.`,
      html: `<p>You have been invited to start a free 7-day WebFactory trial.</p><p><a href="${builderUrl}">Open your private WebFactory Builder</a> to create your business and website.</p><p>No card is required. Your trial starts when you activate it from your client portal after setup.</p><p>This invitation expires in 30 days.</p>`,
    });

    return Response.json({ ok: true, status: "pending", email, invitationSent: true, expiresAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
