import { getDeployStore, getStore } from "@netlify/blobs";

export const ORDER_STATUSES = [
  "DRAFT",
  "AWAITING_PAYMENT",
  "PAYMENT_PROCESSING",
  "PAID",
  "PACKAGE_GENERATING",
  "PACKAGE_READY",
  "EMAIL_SENT",
  "IN_PRODUCTION",
  "PREVIEW_READY",
  "COMPLETED",
];

function isProduction() {
  return globalThis.Netlify?.context?.deploy?.context === "production";
}

export function orderStore() {
  return isProduction()
    ? getStore("webfactory-orders", { consistency: "strong" })
    : getDeployStore("webfactory-orders");
}

export function assetStore() {
  return isProduction()
    ? getStore("webfactory-order-assets", { consistency: "strong" })
    : getDeployStore("webfactory-order-assets");
}

export function packageStore() {
  return isProduction()
    ? getStore("webfactory-production-packages", { consistency: "strong" })
    : getDeployStore("webfactory-production-packages");
}

export function eventStore() {
  return isProduction()
    ? getStore("webfactory-stripe-events", { consistency: "strong" })
    : getDeployStore("webfactory-stripe-events");
}

export function orderKey(orderId) {
  return `orders/${orderId}.json`;
}

export async function getOrder(orderId) {
  if (!orderId) return null;
  return orderStore().get(orderKey(orderId), { type: "json" });
}

export async function saveOrder(order) {
  if (!order?.orderId) throw new Error("Missing orderId.");
  await orderStore().setJSON(orderKey(order.orderId), order);
  return order;
}

export async function patchOrder(orderId, patch) {
  const current = await getOrder(orderId);
  if (!current) throw new Error(`Order ${orderId} was not found.`);
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveOrder(next);
  return next;
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
    "https://webfactorypr.netlify.app"
  ).replace(/\/$/, "");
}
