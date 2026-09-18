import crypto from "node:crypto";
import { getOrder, packageStore } from "../lib/order-store.mjs";

function safeEqual(a, b) {
  try {
    const aa = Buffer.from(String(a || ""), "utf8");
    const bb = Buffer.from(String(b || ""), "utf8");
    return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

export default async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status:405 });

  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId") || "";
  const token = url.searchParams.get("token") || "";
  const order = await getOrder(orderId);

  if (!order?.package?.ready || !order.package.blobKey) {
    return new Response("Package not found", { status:404 });
  }
  if (!safeEqual(token, order.package.downloadToken)) {
    return new Response("Invalid token", { status:403 });
  }
  if (Date.now() > Date.parse(order.package.downloadExpiresAt || 0)) {
    return new Response("Download link expired", { status:410 });
  }

  const data = await packageStore().get(order.package.blobKey, { type:"arrayBuffer" });
  if (!data) return new Response("Package not found", { status:404 });

  return new Response(data, {
    status:200,
    headers:{
      "Content-Type":"application/zip",
      "Content-Disposition":`attachment; filename="${order.package.fileName}"`,
      "Cache-Control":"private, no-store",
      "X-Content-Type-Options":"nosniff",
    },
  });
};
