import nodemailer from "nodemailer";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

const FROM_BY_CATEGORY = {
  team: "WEBFACTORY_EMAIL_FROM_TEAM",
  support: "WEBFACTORY_EMAIL_FROM_SUPPORT",
  billing: "WEBFACTORY_EMAIL_FROM_BILLING",
  info: "WEBFACTORY_EMAIL_FROM_INFO",
};

function cleanHeader(value, max = 998) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

function cleanAddress(value) {
  const address = cleanHeader(value, 320).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) throw new Error("Invalid email address.");
  return address;
}

function transportConfig() {
  const apiKey = env("MAILJET_API_KEY");
  const secretKey = env("MAILJET_SECRET_KEY");
  if (apiKey && secretKey) {
    return {
      provider: "mailjet",
      options: {
        host: env("MAILJET_SMTP_HOST") || "in-v3.mailjet.com",
        port: Number(env("MAILJET_SMTP_PORT") || 587),
        secure: Number(env("MAILJET_SMTP_PORT") || 587) === 465,
        auth: { user: apiKey, pass: secretKey },
      },
    };
  }
  const user = env("WEBFACTORY_GMAIL_USER");
  const pass = env("WEBFACTORY_GMAIL_APP_PASSWORD");
  if (user && pass) return { provider: "gmail-fallback", options: { host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } } };
  throw new Error("Transactional email transport is not configured.");
}

export function emailConfigured() {
  return Boolean((env("MAILJET_API_KEY") && env("MAILJET_SECRET_KEY")) || (env("WEBFACTORY_GMAIL_USER") && env("WEBFACTORY_GMAIL_APP_PASSWORD")));
}

export function emailProvider() {
  try { return transportConfig().provider; } catch { return "unconfigured"; }
}

export async function sendEmail({ category = "team", to, subject, html, text, replyTo, attachments, headers, fromName = "WebFactory PR" }) {
  const key = FROM_BY_CATEGORY[category] || FROM_BY_CATEGORY.team;
  const fallback = env("WEBFACTORY_GMAIL_USER");
  const fromAddress = cleanAddress(env(key) || fallback);
  const recipients = (Array.isArray(to) ? to : [to]).map(cleanAddress);
  const safeReplyTo = replyTo ? cleanAddress(replyTo) : undefined;
  const safeSubject = cleanHeader(subject, 240);
  if (!safeSubject) throw new Error("Email subject is required.");
  const { provider, options } = transportConfig();
  const info = await nodemailer.createTransport(options).sendMail({
    from: `"${cleanHeader(fromName, 120).replace(/"/g, "")}" <${fromAddress}>`,
    to: recipients,
    subject: safeSubject,
    text: text ? String(text) : undefined,
    html: html ? String(html) : undefined,
    replyTo: safeReplyTo,
    attachments,
    headers,
  });
  return { ...info, provider };
}
