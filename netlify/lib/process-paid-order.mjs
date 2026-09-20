import {
  getOrder,
  patchOrder,
} from "./order-store.mjs";
import { ensureProductionPackage } from "./production-package.mjs";
import { emailConfigured, sendOrderEmails } from "./order-mailer.mjs";

export async function processPaidOrder(orderId, stripeSession = null) {
  let order = await getOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} was not found.`);

  if (stripeSession) {
    const expectedPriceUsd = Number(order.product?.amountUsd || 0);
    const expectedAmount = Math.round(expectedPriceUsd * 100);
    if (!Number.isFinite(expectedPriceUsd) || expectedPriceUsd <= 0) {
      throw new Error("Stored order price is invalid.");
    }
    if (stripeSession.payment_status !== "paid") {
      throw new Error("Stripe session is not paid.");
    }
    if (Number(stripeSession.amount_total || 0) !== expectedAmount) {
      throw new Error("Stripe amount does not match the server-authoritative order price.");
    }
    if (Number(stripeSession.metadata?.official_price_usd || 0) !== expectedPriceUsd) {
      throw new Error("Stripe price metadata does not match the stored order price.");
    }
    if (String(stripeSession.currency || "").toLowerCase() !== "usd") {
      throw new Error("Unexpected Stripe currency.");
    }
    if (stripeSession.metadata?.product_key !== "webfactory-premium") {
      throw new Error("Unexpected Stripe product metadata.");
    }
    if (order.stripeSessionId && order.stripeSessionId !== stripeSession.id) {
      throw new Error("Stripe session does not match the stored order.");
    }

    order = await patchOrder(orderId, {
      status: "PAID",
      paymentStatus: "paid",
      stripeSessionId: stripeSession.id,
      stripePaymentIntentId: stripeSession.payment_intent || "",
      paidAt: order.paidAt || new Date().toISOString(),
    });
  }

  if (!["PAID","PACKAGE_GENERATING","PACKAGE_READY","EMAIL_SENT","IN_PRODUCTION"].includes(order.status)) {
    throw new Error(`Order ${orderId} is not in a paid state.`);
  }

  order = await ensureProductionPackage(order);

  if (!emailConfigured()) {
    await patchOrder(orderId, {
      emailPending: true,
      emailPendingReason: "Gmail SMTP credentials are not configured.",
    });
    throw new Error("Order email is pending because Gmail SMTP is not configured.");
  }

  order = await sendOrderEmails(order);
  return order;
}
