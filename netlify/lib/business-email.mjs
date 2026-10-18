import nodemailer from "nodemailer";
import { renderTextEmail, renderEmailLayout } from "./email-design.mjs";
import { refreshGoogleBusinessEmailToken } from "./google-calendar.mjs";

function cleanHeader(value, max = 998) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

function cleanAddress(value) {
  const address = cleanHeader(value, 320).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) throw Object.assign(new Error("Invalid email address."), { status: 400 });
  return address;
}

// RFC 2606 example domains are placeholders, not deliverable business contacts.
const reservedExampleDomains = new Set(["example.com", "example.net", "example.org"]);
function isExampleRecipient(address) {
  return reservedExampleDomains.has(String(address).split("@").pop()?.toLowerCase());
}

export function businessEmailConnected(site) {
  const email = String(site?.businessEmail?.connectedEmail || "").trim().toLowerCase();
  return Boolean(site?.businessEmail?.connected && site?.businessEmail?.provider === "google" && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email));
}

export function businessEmailProvider(site) {
  return businessEmailConnected(site) ? "google-gmail" : "unconfigured";
}

async function gmailRawMessage({ from, fromName, to, subject, html, text, replyTo, attachments, headers }) {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  const info = await transport.sendMail({
    from: `"${cleanHeader(fromName, 120).replace(/"/g, "")}" <${from}>`,
    to,
    subject,
    text,
    html,
    replyTo,
    attachments,
    headers,
  });
  transport.close?.();
  return Buffer.isBuffer(info.message) ? info.message : Buffer.from(info.message || "");
}

export async function sendBusinessEmail(site, {
  to,
  subject,
  html,
  text,
  replyTo,
  attachments,
  headers,
  fromName,
  timeoutMs,
  language = "en",
  brandSite,
} = {}) {
  if (!site?.siteId || !businessEmailConnected(site)) {
    throw Object.assign(new Error("Connect a business email account before sending customer communications."), { status: 409, code: "business_email_not_connected" });
  }
  const from = cleanAddress(site.businessEmail.connectedEmail);
  const recipients = (Array.isArray(to) ? to : [to]).map(cleanAddress);
  if (recipients.some(isExampleRecipient)) {
    throw Object.assign(new Error("Replace the example email recipient with a real address before sending notifications."), {
      status: 400, code: "business_email_invalid_recipient",
    });
  }
  const safeReplyTo = replyTo ? cleanAddress(replyTo) : undefined;
  const safeSubject = cleanHeader(subject, 240);
  if (!safeSubject) throw Object.assign(new Error("Email subject is required."), { status: 400 });
  const safeFromName = fromName || site.business?.name || "WebFactory Business";
  const brandedHtml = html
    ? (/<!doctype html|<html[\s>]/i.test(html) ? html : renderEmailLayout({ language, title: safeSubject, bodyHtml: String(html) }))
    : renderTextEmail({ site: brandSite || site, language, subject: safeSubject, text }).html;
  const raw = await gmailRawMessage({
    from,
    fromName: safeFromName,
    to: recipients,
    subject: safeSubject,
    text: text ? String(text) : undefined,
    html: brandedHtml,
    replyTo: safeReplyTo,
    attachments,
    headers,
  });
  let token;
  try {
    token = await refreshGoogleBusinessEmailToken(site.siteId);
  } catch (error) {
    if (error?.status === 409) throw Object.assign(new Error("Business email authorization must be renewed."), { status:409, code:"business_email_authorization_required" });
    throw error;
  }
  const bounded = Number.isFinite(timeoutMs) ? Math.max(1000, Math.min(10000, timeoutMs)) : 10000;
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    signal: AbortSignal.timeout(bounded),
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: raw.toString("base64url") }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Keep only bounded provider reason codes. Never persist raw errors, tokens,
    // Google project identifiers or account details in a booking diagnostic.
    const reasons = new Set([
      ...(Array.isArray(result?.error?.errors) ? result.error.errors.map(row => row?.reason) : []),
      ...(Array.isArray(result?.error?.details) ? result.error.details.map(row => row?.reason) : []),
    ].filter(value => typeof value === "string").map(value => value.toLowerCase()));
    const disabled = reasons.has("accessnotconfigured") || reasons.has("service_disabled");
    const limited = response.status === 429 || ["ratelimitexceeded","userratelimitexceeded","dailylimitexceeded","quotaexceeded","rate_limit_exceeded"].some(reason => reasons.has(reason));
    const policy = reasons.has("domainpolicy") || reasons.has("org_restriction_violation");
    const authorization = response.status === 401 || response.status === 403;
    const code = disabled ? "business_email_api_disabled" : limited ? "business_email_rate_limited" : policy ? "business_email_policy_blocked" : authorization ? "business_email_authorization_required" : "business_email_delivery_failed";
    const message = disabled ? "Gmail API must be enabled for the Google integration." : limited ? "Gmail sending limit reached. Delivery will be retried." : policy ? "Google Workspace policy blocked business email delivery." : authorization ? "Business email authorization must be renewed." : "Business email delivery failed.";
    throw Object.assign(new Error(message), { status: response.status, code });
  }
  if (typeof result?.id !== "string" || !result.id.trim()) {
    throw Object.assign(new Error("Business email delivery was not confirmed by Gmail."), { status:502, code:"business_email_delivery_failed" });
  }
  return {
    provider: "google-gmail",
    accepted: recipients,
    rejected: [],
    messageId: result?.id || "",
    threadId: result?.threadId || "",
  };
}
