import crypto from "node:crypto";
import { assetStore, safeFileName } from "../lib/order-store.mjs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png","image/jpeg","image/webp","image/heic","image/heif"]);

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const draftId = String(form.get("draftId") || "").trim();
    const itemId = safeFileName(String(form.get("itemId") || "asset"));

    if (!draftId || !/^[a-zA-Z0-9-]{20,80}$/.test(draftId)) {
      return Response.json({ ok:false,message:"Invalid draft ID." }, { status:400 });
    }
    if (!(file instanceof File)) {
      return Response.json({ ok:false,message:"Missing file." }, { status:400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json({ ok:false,message:"Unsupported image type." }, { status:400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ ok:false,message:"Image exceeds 8 MB limit." }, { status:413 });
    }

    const key = `drafts/${draftId}/${itemId}-${crypto.randomUUID()}-${safeFileName(file.name,"image")}`;
    const bytes = await file.arrayBuffer();
    await assetStore().set(key, bytes);

    return Response.json({
      ok:true,
      assetKey:key,
      fileName:safeFileName(file.name,"image"),
      contentType:file.type,
      size:file.size,
    });
  } catch (error) {
    return Response.json({ ok:false,message:error?.message || "Upload failed." }, { status:500 });
  }
};
