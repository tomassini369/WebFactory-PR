import crypto from "node:crypto";
import { getOrder } from "./order-store.mjs";

const SETUP_DAYS = 30;

export function hashPaymentSetupToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function createPaymentSetupAccess() {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashPaymentSetupToken(token),
    expiresAt: new Date(Date.now() + SETUP_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function authorizePaymentSetup(orderId, token) {
  const order = await getOrder(String(orderId || "").slice(0, 100));
  if (!order || !order.paymentSetupTokenHash || !token) return null;
  if (Date.parse(order.paymentSetupExpiresAt || "") <= Date.now()) return null;
  if (!safeEqual(hashPaymentSetupToken(token), order.paymentSetupTokenHash)) return null;
  if (!["PAID", "PACKAGE_GENERATING", "PACKAGE_READY", "EMAIL_SENT", "IN_PRODUCTION", "PREVIEW_READY", "COMPLETED"].includes(order.status)) return null;
  return order;
}

export function publicPaymentConfiguration(order) {
  const payments = order.payments || {};
  return {
    orderId: order.orderId,
    businessName: order.business?.name || "",
    methods: {
      stripe: Boolean(payments.methods?.stripe),
      ath: Boolean(payments.methods?.ath),
      inPerson: Boolean(payments.methods?.inPerson),
    },
    ath: payments.methods?.ath ? {
      accountStatus: payments.ath?.accountStatus || "needs_account",
      publicPath: payments.ath?.publicPath || "",
    } : null,
    inPerson: payments.methods?.inPerson ? {
      instructions: payments.inPerson?.instructions || "",
    } : null,
    rules: {
      productPayment: payments.productPayment || "online",
      bookingPayment: payments.bookingPayment || "full",
      bookingDepositPercent: Number(payments.bookingDepositPercent || 25),
      sendCustomerReceipt: payments.sendCustomerReceipt !== false,
      allowTips: Boolean(payments.allowTips),
    },
    stripe: payments.methods?.stripe ? {
      accountCreated: Boolean(order.stripeConnectedAccountId),
      capabilityStatus: order.stripeConnectCapabilityStatus || "not_started",
      onboardingStatus: order.stripeConnectOnboardingStatus || "not_started",
    } : null,
  };
}
