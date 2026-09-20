import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { createSummaryPdf } from "./production-package.mjs";
import { getOrder, packageStore, patchOrder, publicBaseUrl } from "./order-store.mjs";
import { createPaymentSetupAccess } from "./payment-setup.mjs";

const ZIP_ATTACHMENT_LIMIT = 12 * 1024 * 1024;

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

function paidAmount(order) {
  const value = Number(order.product?.amountUsd || 300);
  return `$${value.toFixed(2)} USD`;
}

function transporter() {
  const user = env("WEBFACTORY_GMAIL_USER");
  const pass = env("WEBFACTORY_GMAIL_APP_PASSWORD");
  if (!user || !pass) {
    throw new Error("Missing WEBFACTORY_GMAIL_USER or WEBFACTORY_GMAIL_APP_PASSWORD.");
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

function adminText(order, packageLink, attachedZip) {
  const catalog = Array.isArray(order.catalog) ? order.catalog : [];
  const team = Array.isArray(order.team) ? order.team : [];
  const bookingCount = catalog.filter((item) => item.requiresAppointment).length;
  const paymentMethods = [
    order.payments?.methods?.stripe ? "Stripe Connect" : "",
    order.payments?.methods?.ath ? "ATH Movil Business" : "",
    order.payments?.methods?.inPerson ? "Pago presencial" : "",
  ].filter(Boolean);

  return [
    "WebFactory — Nuevo proyecto pagado",
    "",
    `Order ID: ${order.orderId}`,
    `Payment status: PAID`,
    `Stripe Session: ${order.stripeSessionId || ""}`,
    `Amount: ${paidAmount(order)}`,
    "",
    "CUSTOMER",
    `Name: ${order.client?.name || ""}`,
    `Email: ${order.client?.email || ""}`,
    `Phone: ${order.client?.phone || ""}`,
    "",
    "BUSINESS",
    `Name: ${order.business?.name || ""}`,
    `Category: ${order.business?.category || ""}`,
    `Phone: ${order.business?.phone || ""}`,
    `WhatsApp: ${order.business?.whatsapp || ""}`,
    `Business email: ${order.business?.email || ""}`,
    `Google Maps: ${order.business?.mapsUrl || ""}`,
    `Instagram: ${order.business?.instagram || ""}`,
    "",
    "CONFIGURATION",
    `Design: ${order.design?.style || ""}`,
    `Primary color: ${order.design?.primary || ""}`,
    `Secondary color: ${order.design?.secondary || ""}`,
    `Catalog items: ${catalog.length}`,
    `Booking-enabled services: ${bookingCount}`,
    `Employees: ${team.length}`,
    `Client website payment methods: ${paymentMethods.join(", ") || "None"}`,
    `Product payment rule: ${order.payments?.productPayment || "online"}`,
    `Booking payment rule: ${order.payments?.bookingPayment || "full"}`,
    "",
    `Production Package: ${attachedZip ? "attached to this email" : packageLink}`,
    `Package version: ${order.packageVersion || 1}`,
    "",
    "The internal AI build prompt is attached separately and is also included inside the Production Package.",
    "Do not forward the internal prompt to the customer.",
  ].join("\n");
}

function customerText(order, paymentSetupLink) {
  const paymentLines = paymentSetupLink ? [
    "",
    "CONFIGURACIÓN DE PAGOS DE TU WEBSITE",
    "Usa este enlace privado para continuar la configuración de los métodos seleccionados:",
    paymentSetupLink,
    "El enlace expira en 30 días. Stripe recopilará directamente cualquier dato bancario, fiscal o de identidad.",
    "WebFactory nunca te pedirá contraseñas, códigos de seguridad ni llaves secretas por email.",
  ] : [];
  return [
    `Hola ${order.client?.name || ""},`,
    "",
    `Tu pago de ${paidAmount(order)} para WebFactory Premium Commerce Website fue confirmado.`,
    `Número de orden: ${order.orderId}`,
    `Negocio: ${order.business?.name || ""}`,
    "",
    "Tu proyecto ha entrado a producción. Revisaremos la configuración y los archivos suministrados para preparar el website.",
    ...paymentLines,
    "",
    "Este correo confirma el pago y la recepción de tu proyecto. No incluye archivos internos ni prompts de producción.",
    "",
    "WebFactory PR",
  ].join("\n");
}

export function emailConfigured() {
  return Boolean(
    env("WEBFACTORY_GMAIL_USER") &&
      env("WEBFACTORY_GMAIL_APP_PASSWORD") &&
      env("WEBFACTORY_ORDER_EMAIL"),
  );
}

export async function sendOrderEmails(order) {
  if (!order.package?.ready || !order.package?.blobKey) {
    throw new Error("Production Package is not ready.");
  }

  const tx = transporter();
  const adminTo = env("WEBFACTORY_ORDER_EMAIL");
  const fromUser = env("WEBFACTORY_GMAIL_USER");
  const baseUrl = publicBaseUrl();
  const packageLink =
    `${baseUrl}/.netlify/functions/download-order-package?orderId=${encodeURIComponent(order.orderId)}&token=${encodeURIComponent(order.package.downloadToken)}`;

  let current = order;

  if (!current.productionPackageSent) {
    const dispatchToken = crypto.randomUUID();
    current = await patchOrder(order.orderId, {
      adminEmailDispatchStatus: "sending",
      adminEmailSendingAt: new Date().toISOString(),
      adminEmailDispatchToken: dispatchToken,
    });

    const locked = await getOrder(order.orderId);
    if (locked?.productionPackageSent) {
      current = locked;
    } else if (locked?.adminEmailDispatchToken !== dispatchToken) {
      throw new Error("Another worker is already dispatching the administrative email.");
    }

    if (!current.productionPackageSent) {
      const summaryPdf = await createSummaryPdf(current);
    const orderJson = Buffer.from(JSON.stringify(current, null, 2), "utf8");
    const attachments = [
      {
        filename: "order-summary.pdf",
        content: summaryPdf,
        contentType: "application/pdf",
      },
      {
        filename: "order-data.json",
        content: orderJson,
        contentType: "application/json",
      },
      {
        filename: "WEBFACTORY_BUILD_PROMPT.txt",
        content: Buffer.from(current.package.prompt || "", "utf8"),
        contentType: "text/plain",
      },
      {
        filename: "CLIENT_REQUIREMENTS.txt",
        content: Buffer.from(current.package.requirements || "", "utf8"),
        contentType: "text/plain",
      },
      {
        filename: "REVISION_PROMPT.txt",
        content: Buffer.from(current.package.revisionPrompt || "", "utf8"),
        contentType: "text/plain",
      },
    ];

    let attachedZip = false;
    if ((current.package.size || 0) <= ZIP_ATTACHMENT_LIMIT) {
      const zipData = await packageStore().get(current.package.blobKey, {
        type: "arrayBuffer",
      });
      if (zipData) {
        attachments.push({
          filename: current.package.fileName,
          content: Buffer.from(zipData),
          contentType: "application/zip",
        });
        attachedZip = true;
      }
    }

    const adminInfo = await tx.sendMail({
      from: `WebFactory PR <${fromUser}>`,
      to: adminTo,
      replyTo: current.client?.email || undefined,
      subject: `WebFactory — Nuevo proyecto pagado #${current.orderId} — ${current.business?.name || "Cliente"}`,
      text: adminText(current, packageLink, attachedZip),
      attachments,
      headers: {
        "X-WebFactory-Order-ID": current.orderId,
      },
    });

      current = await patchOrder(current.orderId, {
        productionPackageSent: true,
        adminEmailDispatchStatus: "sent",
        adminEmailMessageId: adminInfo.messageId,
        sentAt: new Date().toISOString(),
        status: "EMAIL_SENT",
      });
    }
  }

  if (!current.customerConfirmationSent && current.client?.email) {
    const setupAccess = createPaymentSetupAccess();
    const paymentSetupLink = `${baseUrl}/payment-setup?orderId=${encodeURIComponent(current.orderId)}&token=${encodeURIComponent(setupAccess.token)}`;
    const customerInfo = await tx.sendMail({
      from: `WebFactory PR <${fromUser}>`,
      to: current.client.email,
      subject: `WebFactory PR — Pago confirmado — ${current.orderId}`,
      text: customerText(current, paymentSetupLink),
      headers: {
        "X-WebFactory-Order-ID": current.orderId,
      },
    });

    current = await patchOrder(current.orderId, {
      customerConfirmationSent: true,
      customerConfirmationMessageId: customerInfo.messageId,
      customerConfirmationSentAt: new Date().toISOString(),
      paymentSetupTokenHash: setupAccess.tokenHash,
      paymentSetupExpiresAt: setupAccess.expiresAt,
      paymentSetupLinkSentAt: new Date().toISOString(),
    });
  }

  return patchOrder(current.orderId, {
    status: "IN_PRODUCTION",
    inProductionAt: current.inProductionAt || new Date().toISOString(),
  });
}
