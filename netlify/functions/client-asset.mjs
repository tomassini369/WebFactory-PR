import crypto from "node:crypto";
import { assertSameOrigin, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { clientAssetStore, getClientSite } from "../lib/client-store.mjs";
import { siteEntitlement } from "../lib/subscription-billing.mjs";
import { cleanText, safeFileName } from "../lib/order-store.mjs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 8 * 1024 * 1024;

export default async (req) => {
  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const siteId = cleanText(url.searchParams.get("siteId"), 120);
      const key = cleanText(url.searchParams.get("key"), 700);
      if (!siteId || !key.startsWith(`sites/${siteId}/`)) throw Object.assign(new Error("Invalid asset."), { status: 400 });
      const site = await getClientSite(siteId);
      if (!site) throw Object.assign(new Error("Asset not found."), { status: 404 });
      if (!siteEntitlement(site).public) await requireSiteAccess(siteId);
      const [data, metadata] = await Promise.all([
        clientAssetStore().get(key, { type: "arrayBuffer" }),
        clientAssetStore().getMetadata(key),
      ]);
      if (!data) throw Object.assign(new Error("Asset not found."), { status: 404 });
      return new Response(data, { headers: {
        "Content-Type": metadata?.metadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      } });
    }

    if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    assertSameOrigin(req);
    const form = await req.formData();
    const siteId = cleanText(form.get("siteId"), 120);
    await requireSiteAccess(siteId, ["owner", "manager"]);
    const file = form.get("file");
    if (!(file instanceof File)) throw Object.assign(new Error("Image file is required."), { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) throw Object.assign(new Error("Use a JPG, PNG, WebP, or GIF image."), { status: 400 });
    if (file.size > MAX_SIZE) throw Object.assign(new Error("The image cannot exceed 8 MB."), { status: 400 });
    const key = `sites/${siteId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name, "image")}`;
    await clientAssetStore().set(key, await file.arrayBuffer(), { metadata: {
      contentType: file.type,
      originalName: safeFileName(file.name, "image"),
      size: file.size,
      uploadedAt: new Date().toISOString(),
    } });
    return Response.json({ ok: true, assetKey: key, imageUrl: `/.netlify/functions/client-asset?siteId=${encodeURIComponent(siteId)}&key=${encodeURIComponent(key)}` });
  } catch (error) {
    return errorResponse(error);
  }
};
