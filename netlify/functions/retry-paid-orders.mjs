import { orderStore } from "../lib/order-store.mjs";
import { processPaidOrder } from "../lib/process-paid-order.mjs";

export default async () => {
  const { blobs } = await orderStore().list({ prefix:"orders/" });
  let attempted = 0;
  let completed = 0;

  for (const blob of blobs.slice(0, 100)) {
    const order = await orderStore().get(blob.key, { type:"json" });
    if (!order) continue;
    if (!["PAID","PACKAGE_GENERATING","PACKAGE_READY","EMAIL_SENT"].includes(order.status)) continue;
    if (order.status === "IN_PRODUCTION" || order.productionPackageSent && order.customerConfirmationSent) continue;

    attempted += 1;
    try {
      await processPaidOrder(order.orderId);
      completed += 1;
    } catch (error) {
      console.error("retry-paid-orders", order.orderId, error?.message || error);
    }
  }

  console.log(`retry-paid-orders attempted=${attempted} completed=${completed}`);
};

export const config = {
  schedule: "@hourly",
};
