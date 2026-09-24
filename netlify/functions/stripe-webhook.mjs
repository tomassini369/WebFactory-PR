import crypto from "node:crypto";
import { eventStore } from "../lib/order-store.mjs";
import { isSubscriptionBillingEvent, processSubscriptionBillingEvent } from "../lib/subscription-billing.mjs";

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  return signatures.some((signature) => {
    try {
      const received = Buffer.from(signature, "hex");
      return received.length === expectedBuffer.length &&
        crypto.timingSafeEqual(received, expectedBuffer);
    } catch {
      return false;
    }
  });
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status:405 });

  try {
    const secret = env("STRIPE_WEBHOOK_SECRET");
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!verifyStripeSignature(rawBody, signature, secret)) {
      return new Response("Invalid Stripe signature", { status:400 });
    }

    const event = JSON.parse(rawBody);
    const processedKey = `events/${event.id}.json`;
    const processed = await eventStore().get(processedKey, { type:"json" });
    if (processed?.completed) {
      return Response.json({ received:true,duplicate:true });
    }

    if (isSubscriptionBillingEvent(event)) {
      const billing = await processSubscriptionBillingEvent(event);
      await eventStore().setJSON(processedKey, {
        completed:true,
        eventType:event.type,
        billing,
        processedAt:new Date().toISOString(),
      });
      return Response.json({ received:true,billing });
    }

    await eventStore().setJSON(processedKey, {
      completed:true,
      ignored:true,
      retiredLegacyFlow:true,
      eventType:event.type,
      processedAt:new Date().toISOString(),
    });
    return Response.json({ received:true,ignored:true,retiredLegacyFlow:true });
  } catch (error) {
    console.error("stripe-webhook", error);
    return Response.json(
      { received:false,message:error?.message || "Webhook processing failed." },
      { status:500 },
    );
  }
};
