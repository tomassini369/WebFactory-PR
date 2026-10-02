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
  const requestedProvider = env("WEBFACTORY_EMAIL_PROVIDER").trim().toLowerCase();
  const apiKey = env("MAILJET_API_KEY");
  const secretKey = env("MAILJET_SECRET_KEY");

  const mailjet = () => {
    if (!apiKey || !secretKey) throw new Error("Mailjet email provider is selected, but its API key pair is not configured.");
    return {
      provider: "mailjet",
      options: {
        host: env("MAILJET_SMTP_HOST") || "in-v3.mailjet.com",
        port: Number(env("MAILJET_SMTP_PORT") || 587),
        secure: Number(env("MAILJET_SMTP_PORT") || 587) === 465,
        auth: { user: apiKey, pass: secretKey },
      },
    };
  };

  const user = env("WEBFACTORY_GMAIL_USER");
  const pass = env("WEBFACTORY_GMAIL_APP_PASSWORD");
  const gmail = () => {
    if (!user || !pass) throw new Error("Gmail email provider is selected, but its account or app password is not configured.");
    return { provider: "gmail", options: { host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } } };
  };

  if (requestedProvider === "gmail") return gmail();
  if (requestedProvider === "mailjet") return mailjet();
  if (requestedProvider && requestedProvider !== "auto") throw new Error("WEBFACTORY_EMAIL_PROVIDER must be set to auto, gmail, or mailjet.");
  if (apiKey && secretKey) return mailjet();
  if (user && pass) return { ...gmail(), provider: "gmail-fallback" };
  throw new Error("Transactional email transport is not configured.");
}

export function emailConfigured() {
  try { transportConfig(); return true; } catch { return false; }
}

export function emailProvider() {
  try { return transportConfig().provider; } catch { return "unconfigured"; }
}

export async function sendEmail({ category = "team", to, subject, html, text, replyTo, attachments, headers, fromName = "WebFactory PR", timeoutMs }) {
  const key = FROM_BY_CATEGORY[category] || FROM_BY_CATEGORY.team;
  const fallback = env("WEBFACTORY_GMAIL_USER");
  const { provider, options } = transportConfig();
  const configuredFrom = env(key);
  const fromAddress = cleanAddress(provider === "gmail" || provider === "gmail-fallback" ? fallback : (configuredFrom || fallback));
  const recipients = (Array.isArray(to) ? to : [to]).map(cleanAddress);
  const safeReplyTo = replyTo ? cleanAddress(replyTo) : (provider === "gmail" || provider === "gmail-fallback") && configuredFrom ? cleanAddress(configuredFrom) : undefined;
  const safeSubject = cleanHeader(subject, 240);
  if (!safeSubject) throw new Error("Email subject is required.");
  const bounded=Number.isFinite(timeoutMs)?Math.max(1000,Math.min(10000,timeoutMs)):null;
  const transport=nodemailer.createTransport({ ...options, connectionTimeout: bounded?Math.min(2500,bounded):8000, greetingTimeout: bounded?Math.min(2500,bounded):8000, socketTimeout: bounded?Math.min(2500,bounded):10000 });
  let timer;
  try {
  const delivery=transport.sendMail({
    from: `"${cleanHeader(fromName, 120).replace(/"/g, "")}" <${fromAddress}>`,
    to: recipients,
    subject: safeSubject,
    text: text ? String(text) : undefined,
    html: html ? String(html) : undefined,
    replyTo: safeReplyTo,
    attachments,
    headers,
  });
  const info=bounded?await Promise.race([delivery,new Promise((_,reject)=>{timer=setTimeout(()=>{transport.close();reject(new Error('Email delivery time budget exceeded.'));},bounded);})]):await delivery;
  return { ...info, provider };
  } finally { if(timer)clearTimeout(timer);if(bounded)transport.close(); }
}
