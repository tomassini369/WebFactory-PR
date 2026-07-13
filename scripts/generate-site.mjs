import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const orderPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "data", "sample-order.json");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderList(items, renderer) {
  return (items || []).map(renderer).join("\n            ");
}

function renderOptionalImage(src, alt, className) {
  if (!src) {
    return "";
  }

  return `<figure class="${className}"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" /></figure>`;
}

function safeCssFontStack(value) {
  const fallback = "Inter, Segoe UI, Arial, sans-serif";
  const fontStack = String(value || fallback);
  return /^[a-zA-Z0-9 ,.-]+$/.test(fontStack) ? fontStack : fallback;
}

function readableTextOn(hexColor) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hexColor || "").trim());
  if (!match) {
    return "#111111";
  }

  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  return brightness > 150 ? "#111111" : "#ffffff";
}

function slugify(value) {
  return String(value || "nuevo-negocio")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "nuevo-negocio";
}

function telHref(value) {
  const digits = String(value || "").replace(/[^0-9+]/g, "");
  return digits ? `tel:${digits}` : "#contacto";
}

function whatsappHref(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#contacto";
}

function ctaHref(type, site) {
  if (type === "phone") return telHref(site.phone);
  if (type === "whatsapp") return whatsappHref(site.whatsapp || site.phone);
  if (type === "payments") return site.payments.length ? "#pagos" : "#contacto";
  return "#contacto";
}

function renderPaymentSection(payments) {
  if (!payments.length) {
    return "";
  }

  const items = renderList(payments, (payment) => `<li><span>${escapeHtml(payment)}</span><strong>Disponible</strong></li>`);
  return `<section class="section" id="pagos">
        <h2>Botones de pago</h2>
        <ul class="payment-list">
          ${items}
        </ul>
      </section>`;
}

function normalizeOrder(rawOrder) {
  const business = rawOrder.business || {};
  const publicBusiness = business.public || {};
  const design = rawOrder.design || {};
  const layout = rawOrder.layout || {};
  const paymentsData = rawOrder.payments || {};
  const selectedPayments = Array.isArray(paymentsData)
    ? paymentsData
    : paymentsData.selected || [];
  const businessName = rawOrder.businessName || business.name || "Nuevo Negocio";
  const sections = rawOrder.sections || business.sections || ["Servicios", "Contacto"];

  return {
    slug: rawOrder.slug || business.slug || slugify(businessName),
    businessName,
    niche: rawOrder.niche || business.niche || "Negocio local",
    tagline: rawOrder.tagline || business.tagline || "Una pagina profesional para tu negocio.",
    description: rawOrder.description || business.notes || rawOrder.summary || "Informacion preparada con los datos enviados por el cliente.",
    phone: rawOrder.phone || publicBusiness.phone || "",
    email: rawOrder.email || publicBusiness.email || "",
    address: rawOrder.address || publicBusiness.address || "",
    hours: rawOrder.hours || publicBusiness.hours || "",
    mapLink: rawOrder.mapLink || publicBusiness.mapLink || "",
    whatsapp: rawOrder.whatsapp || publicBusiness.whatsapp || publicBusiness.phone || "",
    visualStyle: rawOrder.visualStyle || design.visualStyle || "Personalizado",
    fontLabel: rawOrder.fontLabel || design.font || "Moderna limpia",
    fontFamily: rawOrder.fontFamily || design.fontStack,
    primaryColor: rawOrder.primaryColor || design.primaryColor || "#ffffff",
    accentColor: rawOrder.accentColor || design.accentColor || "#000000",
    heroImage: rawOrder.heroImage || "",
    headerImage: rawOrder.headerImage || layout.headerImage || "",
    footerImage: rawOrder.footerImage || layout.footerImage || "",
    galleryImages: rawOrder.galleryImages || [],
    sections,
    benefits: rawOrder.benefits || business.benefits || ["Servicio claro", "Contacto directo", "Marca profesional", "Entrega rapida"],
    payments: selectedPayments,
    items: rawOrder.items || sections.slice(0, 3).map((section) => ({ name: section, price: "Disponible" })),
    layout: {
      deliveryTemplate: layout.deliveryTemplate || (/automotriz/i.test(rawOrder.visualStyle || design.visualStyle || "") ? "autoServiceReplica" : "standard"),
      deliveryTemplateLabel: layout.deliveryTemplateLabel || "Premium +",
      headerStyle: layout.headerStyle || (/automotriz/i.test(rawOrder.visualStyle || design.visualStyle || "") ? "autoService" : "sticky"),
      headerCta: layout.headerCta || "phone",
      headerCtaLabel: layout.headerCtaLabel || "Llamar ahora",
      footerStyle: layout.footerStyle || (/automotriz/i.test(rawOrder.visualStyle || design.visualStyle || "") ? "autoService" : "brand"),
      footerTagline: layout.footerTagline || "Calidad, confianza y compromiso",
      facebookLink: layout.facebookLink || "",
      instagramLink: layout.instagramLink || "",
      showCredit: true,
    },
  };
}

const order = JSON.parse(await readFile(orderPath, "utf8"));
const site = normalizeOrder(order);
const template = await readFile(path.join(root, "templates", "client-site.html"), "utf8");
const headerLinks = site.layout.deliveryTemplate === "autoServiceReplica"
  ? ["Inicio", "Servicios", "Nosotros", "Contacto"]
  : ["Inicio", "Servicios", "Galeria", "Contacto"];
const contactCards = [
  ["Telefono", site.phone || "Telefono pendiente"],
  ["WhatsApp", site.whatsapp || site.phone || "WhatsApp pendiente"],
  ["Email", site.email || "Email pendiente"],
  ["Direccion", site.address || "Direccion pendiente"],
  ["Horario", site.hours || "Horario pendiente"],
  ["Mapa", site.mapLink ? "Mapa conectado" : "Mapa pendiente"],
];

const replacements = {
  businessName: escapeHtml(site.businessName),
  niche: escapeHtml(site.niche),
  tagline: escapeHtml(site.tagline),
  description: escapeHtml(site.description),
  phone: escapeHtml(site.phone),
  phoneHref: escapeHtml(telHref(site.phone)),
  headerClass: escapeHtml(`header-${site.layout.headerStyle}`),
  footerClass: escapeHtml(`footer-${site.layout.footerStyle}`),
  headerCta: escapeHtml(site.layout.headerCtaLabel),
  headerCtaHref: escapeHtml(ctaHref(site.layout.headerCta, site)),
  headerImage: renderOptionalImage(site.headerImage, `${site.businessName} imagen del header`, "header-logo-figure"),
  headerLinks: renderList(headerLinks, (label) => {
    const href = label === "Inicio" ? "#inicio" : `#${slugify(label)}`;
    return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  }),
  email: escapeHtml(site.email),
  emailHref: escapeHtml(site.email ? `mailto:${site.email}` : "#contacto"),
  address: escapeHtml(site.address),
  hours: escapeHtml(site.hours),
  mapHref: escapeHtml(site.mapLink || "#contacto"),
  whatsappHref: escapeHtml(whatsappHref(site.whatsapp || site.phone)),
  styleClass: /automotriz/i.test(site.visualStyle) ? "style-automotriz" : "",
  templateClass: site.layout.deliveryTemplate === "autoServiceReplica" ? "template-auto-service" : "template-standard",
  visualStyle: escapeHtml(site.visualStyle || "Personalizado"),
  fontLabel: escapeHtml(site.fontLabel || "Moderna limpia"),
  fontFamily: safeCssFontStack(site.fontFamily),
  primaryColor: escapeHtml(site.primaryColor),
  primaryInk: escapeHtml(readableTextOn(site.primaryColor)),
  accentColor: escapeHtml(site.accentColor),
  heroMedia: renderOptionalImage(site.heroImage, `${site.businessName} imagen principal`, "hero-visual"),
  benefits: renderList(site.benefits.slice(0, 4), (benefit, index) => `<article class="benefit"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(benefit)}</strong></article>`),
  items: renderList(site.items, (item) => `<li><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(item.price)}</strong></li>`),
  sections: renderList(site.sections, (section) => `<article class="info-card"><strong>${escapeHtml(section)}</strong><p>Contenido listo para adaptar al negocio.</p></article>`),
  whyCards: renderList([
    "Experiencia y profesionalismo",
    "Honestidad y transparencia",
    "Calidad garantizada",
    "Atencion personalizada",
  ], (item) => `<article class="info-card"><strong>${escapeHtml(item)}</strong><p>Texto editable segun la informacion que envie el cliente.</p></article>`),
  galleryImages: renderList(site.galleryImages || [], (image, index) => `<img src="${escapeHtml(image)}" alt="Imagen ${index + 1} de ${escapeHtml(site.businessName)}" />`),
  paymentSection: renderPaymentSection(site.payments),
  contactCards: renderList(contactCards, ([title, body]) => `<article class="info-card"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></article>`),
  footerTagline: escapeHtml(site.layout.footerTagline),
  footerImage: renderOptionalImage(site.footerImage, `${site.businessName} imagen del footer`, "footer-logo-figure"),
  footerImageClass: site.footerImage ? "has-footer-image" : "",
  footerImageStyle: site.footerImage ? `style="--footer-bg-image: url('${escapeHtml(site.footerImage)}')"` : "",
  socialLinks: renderList([
    site.layout.facebookLink ? ["Facebook", site.layout.facebookLink] : null,
    site.layout.instagramLink ? ["Instagram", site.layout.instagramLink] : null,
  ].filter(Boolean), ([label, href]) => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`),
  creditText: "Pagina generada por WebFactory PR.",
};

let html = template;
Object.entries(replacements).forEach(([key, value]) => {
  html = html.replaceAll(`{{${key}}}`, value);
});

const outDir = path.join(root, "generated", site.slug);
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "index.html"), html, "utf8");

console.log(`Generated ${path.relative(root, path.join(outDir, "index.html"))}`);
