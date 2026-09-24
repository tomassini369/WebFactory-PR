import { getDeployStore, getStore } from "@netlify/blobs";

function isProduction() {
  return globalThis.Netlify?.context?.deploy?.context === "production";
}

export function platformStripeEventStore() {
  return isProduction()
    ? getStore("webfactory-stripe-events", { consistency: "strong" })
    : getDeployStore("webfactory-stripe-events");
}

export function safeFileName(value, fallback = "file") {
  const cleaned = String(value || fallback)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return cleaned || fallback;
}

export function cleanText(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

export function validEmail(value) {
  const email = cleanText(value, 320);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function publicBaseUrl() {
  return (
    globalThis.Netlify?.env?.get("URL") ||
    globalThis.Netlify?.env?.get("DEPLOY_PRIME_URL") ||
    "https://webfactorypr.com"
  ).replace(/\/$/, "");
}
