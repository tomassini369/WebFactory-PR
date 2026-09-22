import { sendEmail } from "./email.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

function money(cents) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(cents || 0) / 100); }

function messages(site, record) {
  const kindLabel = record.kind === "booking" ? "booking" : "order";
  const lines = (record.items || []).map((item) => `- ${item.name} × ${item.quantity}: ${money(item.unitAmount * item.quantity)}`);
  const customerText = [
    `Hello ${record.customer?.name || ""},`, "",
    `Your ${kindLabel} with ${site.business?.name || "the business"} is confirmed.`,
    `Confirmation: ${record.transactionId}`,
    ...lines,
    `Total paid: ${money(record.amountTotal)}`,
    record.start ? `Appointment: ${new Date(record.start).toLocaleString("en-US", { timeZone: site.settings?.timezone || "America/Puerto_Rico" })}` : "",
    "", "Payment was verified securely by Stripe.",
  ].filter(Boolean).join("\n");
  const businessText = [
    `New confirmed ${kindLabel}`, "",
    `Confirmation: ${record.transactionId}`,
    `Customer: ${record.customer?.name || ""}`,
    `Email: ${record.customer?.email || ""}`,
    `Phone: ${record.customer?.phone || ""}`,
    ...lines,
    `Total: ${money(record.amountTotal)}`,
    record.start ? `Appointment: ${new Date(record.start).toLocaleString("en-US", { timeZone: site.settings?.timezone || "America/Puerto_Rico" })}` : "",
  ].filter(Boolean).join("\n");

  return { kindLabel, customerText, businessText };
}

export async function sendCustomerCommerceEmail(site, record) {
  const { kindLabel, customerText } = messages(site, record);
  await sendEmail({ category:"team", fromName:site.business?.name || "WebFactory Business", to:record.customer.email, subject:`${site.business?.name || "Business"} — ${kindLabel} confirmed`, text:customerText });
}

export async function sendBusinessCommerceEmail(site, record) {
  if (!site.business?.email) return;
  const { kindLabel, businessText } = messages(site, record);
  await sendEmail({ category:"team", fromName:site.business?.name || "WebFactory Business", to:site.business.email, subject:`New paid ${kindLabel} — ${record.transactionId}`, text:businessText });
}
