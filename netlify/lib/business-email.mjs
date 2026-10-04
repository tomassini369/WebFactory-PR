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
  const token = await refreshGoogleBusinessEmailToken(site.siteId);
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
    const message = response.status === 401 || response.status === 403
      ? "Business email authorization must be renewed."
      : "Business email delivery failed.";
    throw Object.assign(new Error(message), { status: response.status, code: "business_email_delivery_failed" });
  }
  return {
    provider: "google-gmail",
    accepted: recipients,
    rejected: [],
    messageId: result?.id || "",
    threadId: result?.threadId || "",
  };
}
