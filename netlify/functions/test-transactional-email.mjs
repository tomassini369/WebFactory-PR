import { errorResponse, requirePlatformAdmin } from "../lib/client-auth.mjs";
import { emailConfigured, emailProvider, sendEmail } from "../lib/email.mjs";

export default async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    const admin = await requirePlatformAdmin();
    if (!emailConfigured()) throw Object.assign(new Error("Transactional email is not configured."), { status: 409 });

    const sent = await sendEmail({
      category: "team",
      to: admin.email,
      subject: "WebFactory transactional email test",
      text: [
        "WebFactory transactional email test",
        "",
        "If you received this message, the currently configured transactional email transport is working.",
        `Provider: ${emailProvider()}`,
        `Sent at: ${new Date().toISOString()}`,
      ].join("\n"),
    });

    return Response.json({
      ok: true,
      provider: emailProvider(),
      accepted: Array.isArray(sent.accepted) ? sent.accepted.length : null,
      rejected: Array.isArray(sent.rejected) ? sent.rejected.length : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
