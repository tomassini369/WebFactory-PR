import {musicFileLimit, normalizeSiteMusic, siteCanPublishMusic} from "../../shared/site-music.mjs";
import crypto from "node:crypto";
import { assertSameOrigin, errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { clientAssetStore, getClientSite } from "../lib/client-store.mjs";
import { siteEntitlement } from "../lib/subscription-billing.mjs";
import { cleanText, safeFileName } from "../lib/platform-utils.mjs";

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
      const audio=key.startsWith(`sites/${siteId}/music/`);
      if(audio && (!siteCanPublishMusic(site) || !normalizeSiteMusic(site.music,siteId).tracks.some(track=>track.audioKey===key))) throw Object.assign(new Error("Asset not found."),{status:404});
      const isPublic=siteEntitlement(site).public;
      if (!isPublic) await requireSiteAccess(siteId);
      const [data, metadata] = await Promise.all([
        clientAssetStore().get(key, { type: "arrayBuffer" }),
        clientAssetStore().getMetadata(key),
      ]);
      if (!data) throw Object.assign(new Error("Asset not found."), { status: 404 });
      if (audio) return musicResponse(data,req.headers.get("Range"),isPublic);
      return new Response(data, { headers: {
        "Content-Type": metadata?.metadata?.contentType || "application/octet-stream",
        "Cache-Control": isPublic?(metadata?.metadata?.kioskBackground===true?"public, max-age=31536000, immutable":"public, max-age=60"):"private, no-store",
        "X-Content-Type-Options": "nosniff",
      } });
    }

    if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    assertSameOrigin(req);
    const form = await req.formData();
    const siteId = cleanText(form.get("siteId"), 120);
    const {site:authorizedSite}=await requireSiteAccess(siteId, ["owner"]);
    const file = form.get("file");
    if (form.get("purpose") === "music") {
      if (!siteCanPublishMusic(authorizedSite)) throw Object.assign(new Error("Music is available for artist and DJ websites."),{status:400});
      if (!(file instanceof File) || file.size < 4 || file.size > musicFileLimit) throw Object.assign(new Error("Use an MP3 file up to 4 MB."),{status:400});
      const bytes = new Uint8Array(await file.arrayBuffer());
      const id3 = bytes[0]===73 && bytes[1]===68 && bytes[2]===51;
      const frame = bytes[0]===255 && (bytes[1]&224)===224 && (bytes[1]&6)!==0;
      if (!id3 && !frame) throw Object.assign(new Error("Use a valid MP3 file."),{status:400});
      const key = `sites/${siteId}/music/${crypto.randomUUID()}.mp3`;
      await clientAssetStore().set(key, bytes.buffer, {metadata:{contentType:"audio/mpeg",size:bytes.byteLength}});
      return Response.json({ok:true,assetKey:key});
    }
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


export function musicResponse(data, range, isPublic) {
  const size = data.byteLength;
  const headers = new Headers({
    "Content-Type":"audio/mpeg","Accept-Ranges":"bytes","X-Content-Type-Options":"nosniff",
    "Cache-Control":isPublic?"public, max-age=60":"private, no-store",
  });
  if (!range) {
    headers.set("Content-Length",String(size));
    return new Response(data,{headers});
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const start = match?.[1] ? Number(match[1]) : Math.max(0,size-Number(match?.[2]));
  const end = match?.[1] && match[2] ? Math.min(size-1,Number(match[2])) : size-1;
  if (!match || !match[1]&&!match[2] || !Number.isSafeInteger(start) || start>=size || start>end) {
    headers.set("Content-Range",`bytes */${size}`);
    return new Response(null,{status:416,headers});
  }
  headers.set("Content-Range",`bytes ${start}-${end}/${size}`);
  headers.set("Content-Length",String(end-start+1));
  return new Response(data.slice(start,end+1),{status:206,headers});
}
