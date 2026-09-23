import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { cleanText } from "../lib/order-store.mjs";
import { getV3Record } from "../lib/webfactory-v3-store.mjs";

function money(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(cents || 0) / 100);
}

export default async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const url = new URL(req.url);
    const siteId = cleanText(url.searchParams.get("siteId"), 120);
    const receiptId = cleanText(url.searchParams.get("receiptId"), 180);
    const { site } = await requireSiteCapability(siteId, "payments");
    const receipt = await getV3Record(siteId, "receipts", receiptId);
    if (!receipt) throw Object.assign(new Error("Receipt not found."), { status: 404 });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const navy = rgb(11/255, 21/255, 41/255);
    const muted = rgb(93/255, 95/255, 100/255);
    let y = 740;

    page.drawText(site.business?.name || "WebFactory Business", { x: 48, y, size: 20, font: bold, color: navy });
    y -= 28;
    page.drawText("Receipt", { x: 48, y, size: 14, font: bold, color: navy });
    page.drawText(receipt.receiptId, { x: 360, y, size: 10, font: regular, color: muted });
    y -= 24;
    page.drawText(`Customer: ${receipt.customer?.name || ""}`, { x: 48, y, size: 10, font: regular, color: muted });
    y -= 16;
    if (receipt.customer?.email) { page.drawText(`Email: ${receipt.customer.email}`, { x: 48, y, size: 10, font: regular, color: muted }); y -= 16; }
    page.drawText(`Transaction: ${receipt.transactionId}`, { x: 48, y, size: 10, font: regular, color: muted });
    y -= 28;

    for (const item of receipt.items || []) {
      const label = `${item.name} × ${item.quantity}`.slice(0, 70);
      page.drawText(label, { x: 48, y, size: 10, font: regular, color: navy });
      page.drawText(money(item.amount), { x: 470, y, size: 10, font: regular, color: navy });
      y -= 18;
      if (y < 120) break;
    }

    y -= 8;
    const totals = [
      ["Subtotal", receipt.subtotal],
      ["Discounts", -Number(receipt.discounts || 0)],
      ["IVU", receipt.tax],
      ["Tip", receipt.tip],
    ];
    for (const [label, value] of totals) {
      if (!value) continue;
      page.drawText(String(label), { x: 360, y, size: 10, font: regular, color: muted });
      page.drawText(money(Number(value)), { x: 470, y, size: 10, font: regular, color: navy });
      y -= 18;
    }
    page.drawText("Total", { x: 360, y, size: 13, font: bold, color: navy });
    page.drawText(money(receipt.total), { x: 470, y, size: 13, font: bold, color: navy });
    y -= 28;
    page.drawText(`Payment status: ${receipt.paymentStatus || ""}`, { x: 48, y, size: 9, font: regular, color: muted });
    y -= 14;
    page.drawText(new Date(receipt.createdAt).toLocaleString("en-US", { timeZone: site.settings?.timezone || "America/Puerto_Rico" }), { x: 48, y, size: 9, font: regular, color: muted });

    const bytes = await pdf.save();
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${receipt.receiptId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
