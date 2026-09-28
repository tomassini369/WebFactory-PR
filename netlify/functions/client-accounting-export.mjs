import { errorResponse, requireSiteCapability } from "../lib/client-auth.mjs";
import { clientCommerceStore } from "../lib/client-store.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

function csvCell(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[\s]*[=+@]/.test(raw) || /^[\s]*-[^\d]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function csv(headers, rows) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function dollars(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

async function allTransactions(siteId) {
  const store = clientCommerceStore();
  const groups = await Promise.all(["orders", "bookings"].map(async (kind) => {
    const result = await store.list({ prefix: `${siteId}/${kind}/` });
    return Promise.all((result.blobs || []).map((blob) => store.get(blob.key, { type: "json" })));
  }));
  return groups.flat().filter((record) => record?.siteId === siteId);
}

function athCsv(records) {
  const headers = ["transaction_id", "receipt_id", "created_at", "paid_at", "kind", "source", "payment_method", "status", "currency", "subtotal_usd", "discount_usd", "tax_ivu_usd", "tip_usd", "gross_usd", "refunds_usd", "net_recorded_usd", "items"];
  const rows = records
    .filter((record) => record.paymentMethod === "manual_ath" || record.paymentProvider === "ath_movil" || record.source === "ath_movil")
    .sort((a, b) => Date.parse(a.createdAt || "") - Date.parse(b.createdAt || ""))
    .map((record) => {
      const gross = Number(record.amountTotal || 0);
      const refunds = Number(record.refundedAmount || 0);
      const items = (record.items || []).map((item) => `${item.name || "Item"} x ${Number(item.quantity || 1)}`).join("; ");
      return [record.transactionId, record.receiptId, record.createdAt, record.paidAt, record.kind, record.source, "ATH Móvil Business", record.paymentStatus || record.status, record.currency || "usd", dollars(record.subtotal), dollars(record.discounts), dollars(record.tax), dollars(record.tip), dollars(gross), dollars(refunds), dollars(gross - refunds), items];
    });
  return csv(headers, rows);
}

async function stripeCsv(site) {
  const accountId = String(site.paymentRules?.stripeConnectedAccountId || "").trim();
  const secret = env("STRIPE_SECRET_KEY");
  if (!accountId || !site.paymentRules?.methods?.stripe) throw Object.assign(new Error("Stripe is not connected for this business."), { status: 409 });
  if (!secret) throw Object.assign(new Error("Stripe export is not configured."), { status: 503 });

  const entries = [];
  let startingAfter = "";
  let pageCount = 0;
  while (true) {
    const params = new URLSearchParams({ limit: "100" });
    if (startingAfter) params.set("starting_after", startingAfter);
    const response = await fetch(`https://api.stripe.com/v1/balance_transactions?${params}`, {
      headers: { Authorization: `Bearer ${secret}`, "Stripe-Account": accountId },
    });
    const body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body?.error?.message || "Stripe accounting data could not be loaded."), { status: 502 });
    entries.push(...(body.data || []));
    pageCount += 1;
    if (!body.has_more) break;
    if (pageCount >= 100) throw Object.assign(new Error("The Stripe report exceeds the 10,000-row export limit. Contact support for a custom date-range export."), { status: 413 });
    startingAfter = body.data?.at(-1)?.id || "";
    if (!startingAfter) throw new Error("Stripe returned an incomplete accounting page.");
  }

  const headers = ["stripe_balance_transaction_id", "created_at", "available_on", "type", "reporting_category", "status", "currency", "gross_usd", "stripe_fee_usd", "net_usd", "source_id", "description"];
  const rows = entries
    .sort((a, b) => Number(a.created || 0) - Number(b.created || 0))
    .map((entry) => [entry.id, entry.created ? new Date(entry.created * 1000).toISOString() : "", entry.available_on ? new Date(entry.available_on * 1000).toISOString() : "", entry.type, entry.reporting_category, entry.status, String(entry.currency || "usd").toLowerCase(), dollars(entry.amount), dollars(entry.fee), dollars(entry.net), typeof entry.source === "string" ? entry.source : entry.source?.id, entry.description]);
  return csv(headers, rows);
}

export default async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const url = new URL(req.url);
    const siteId = (url.searchParams.get("siteId") || "").trim();
    const provider = url.searchParams.get("provider");
    if (!["stripe", "ath"].includes(provider)) throw Object.assign(new Error("Choose Stripe or ATH Móvil for the export."), { status: 400 });
    const { site } = await requireSiteCapability(siteId, "payments");

    const body = provider === "stripe" ? await stripeCsv(site) : athCsv(await allTransactions(site.siteId));
    const filename = `${String(site.slug || "business").replace(/[^a-z0-9-]/gi, "-")}-${provider === "stripe" ? "stripe-balance" : "ath-movil-business"}-${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(body, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip"] } };
