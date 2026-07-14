const FORM_NAME = "site-order";

function env(name) {
  return process.env[name] || "";
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function clean(value) {
  return String(value || "").trim();
}

function line(label, value) {
  return `- **${label}:** ${clean(value) || "No provisto"}`;
}

function buildIssueBody(data) {
  const order = safeJsonParse(data.orderJson, {});
  const client = order.client || {};
  const business = order.business || {};
  const design = order.design || {};
  const packageInfo = order.package || {};
  const payments = order.payments || {};
  const extras = order.extras || {};

  return [
    "## Pedido WebFactory",
    "",
    line("Order ID", order.orderId || data.orderId),
    line("Fecha", order.createdAt || data.orderCreatedAt),
    line("Cliente", client.name || data.clientName),
    line("Email", client.email || data.clientEmail),
    line("Telefono", client.phone || data.clientPhone),
    "",
    "## Negocio",
    "",
    line("Nombre", business.name || data.businessName),
    line("Nicho", business.niche || data.niche),
    line("Paquete", packageInfo.label || data.package),
    line("Precio", packageInfo.price ? `$${packageInfo.price}` : ""),
    line("Checkout del paquete", packageInfo.checkoutLink || data.checkoutLink),
    line("Estado del pago", data.paymentStatus),
    line("Stripe Session ID", data.stripeSessionId),
    line("Notas", business.notes || data.notes),
    "",
    "## Diseno",
    "",
    line("Estilo", design.visualStyle || data.visualStyle),
    line("Fuente", design.font || data.fontChoice),
    line("Color principal", design.primaryColor || data.primaryColor),
    line("Color acento", design.accentColor || data.accentColor),
    line("Foto principal adjunta", design.heroImageAttached ? "Si" : "No / revisar Netlify Forms"),
    line("Imagenes de contenido", design.galleryImageCount),
    "",
    "## Pagos",
    "",
    line("Metodos", Array.isArray(payments.selected) ? payments.selected.join(", ") : data.paymentMethods),
    line("Sin enlaces de pago", payments.noPaymentLinks ? "Si" : "No"),
    line("Stripe", payments.stripeLink || data.stripeLink),
    line("ATH Movil de negocio", payments.athDetails || data.athDetails),
    "",
    "## Extras",
    "",
    line("Soporte mensual", extras.supportMonthly ? "Si" : "No"),
    line("Textos iniciales", extras.copywriting ? "Si" : "No"),
    line("Aprobacion preview", extras.previewApproval ? "Si" : "No"),
    "",
    "## Resumen",
    "",
    clean(order.summary || data.orderSummary) || "Sin resumen generado.",
    "",
    "> Archivos adjuntos: revisar el envio original en Netlify Forms. No se copian al issue para evitar exponer archivos privados.",
  ].join("\n");
}

async function createGitHubIssue(data) {
  const owner = env("GITHUB_OWNER");
  const repo = env("GITHUB_REPO");
  const token = env("GITHUB_ISSUE_TOKEN");
  const labels = (env("GITHUB_ISSUE_LABELS") || "webfactory,pedido")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  if (!owner || !repo || !token) {
    console.log("GitHub issue skipped: missing GITHUB_OWNER, GITHUB_REPO, or GITHUB_ISSUE_TOKEN.");
    return;
  }

  const titleBusiness = clean(data.businessName) || clean(safeJsonParse(data.orderJson, {})?.business?.name) || "Nuevo negocio";
  const titleOrderId = clean(data.orderId) || clean(safeJsonParse(data.orderJson, {})?.orderId);
  const title = `[Pedido WebFactory] ${titleBusiness}${titleOrderId ? ` · ${titleOrderId}` : ""}`;

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "webfactory-pr-netlify",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      title,
      body: buildIssueBody(data),
      labels,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub issue creation failed: ${response.status} ${errorText}`);
  }

  const issue = await response.json();
  console.log(`GitHub issue created: ${issue.html_url}`);
}

export default {
  async formSubmitted(event) {
    const data = event.data || {};
    const formName = data["form-name"] || data.formName || FORM_NAME;

    if (formName !== FORM_NAME) {
      return;
    }

    await createGitHubIssue(data);
  },
};
