import { errorResponse, requireSiteAccess } from "../lib/client-auth.mjs";
import { cleanText, publicBaseUrl } from "../lib/order-store.mjs";
import { getV3Record } from "../lib/webfactory-v3-store.mjs";

export default async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const url = new URL(req.url);
    const siteId = cleanText(url.searchParams.get("siteId"), 120);
    const paymentLinkId = cleanText(url.searchParams.get("paymentLinkId"), 180);
    const { site } = await requireSiteAccess(siteId);
    const link = await getV3Record(siteId, "payment-links", paymentLinkId);
    if (!link || link.siteId !== site.siteId) throw Object.assign(new Error("Payment link not found."), { status: 404 });

    const target = `${publicBaseUrl()}/pay/${encodeURIComponent(site.slug)}/${encodeURIComponent(link.token)}`;
    const qrUrl = new URL("https://quickchart.io/qr");
    qrUrl.searchParams.set("text", target);
    qrUrl.searchParams.set("size", "900");
    qrUrl.searchParams.set("format", "png");
    qrUrl.searchParams.set("margin", "4");
    qrUrl.searchParams.set("ecLevel", "M");

    const response = await fetch(qrUrl);
    if (!response.ok) throw new Error("QR image could not be generated.");
    const bytes = await response.arrayBuffer();
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="webfactory-${paymentLinkId}-qr.png"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
