import crypto from "node:crypto";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  assetStore,
  packageStore,
  patchOrder,
  safeFileName,
} from "./order-store.mjs";

const PACKAGE_VERSION = 5;
const DOWNLOAD_DAYS = 7;

function localizationSettings(order) {
  const localization = order.localization || {};
  return {
    enabled: true,
    languages: ["es", "en"],
    languageLabels: {
      es: "Español",
      en: "English",
    },
    defaultLanguage: "es",
    fallbackLanguage: "es",
    languageSwitcher: true,
    persistSelection: true,
    persistence: "localStorage",
    updateDocumentLanguage: true,
    runtimeMachineTranslation: false,
    contentCoverage: [
      "navigation",
      "marketing content",
      "catalog",
      "cart",
      "forms and validation",
      "employees",
      "bookings",
      "payment instructions",
      "success and error states",
      "accessibility labels",
      "SEO titles and descriptions",
    ],
    implementationNote:
      "Use reviewed ES/EN content dictionaries or equivalent structured localized fields. Preserve business names, proper nouns, prices, identifiers, URLs, and customer-supplied facts exactly. Use Spanish as the fallback when an English value is unavailable.",
    source: localization.enabled === false ? "server-enforced" : "WebFactory standard",
  };
}

function designTemplateSettings(order) {
  const design = order.design || {};
  const usesTemplate = ["template_base","demo_base"].includes(design.mode) && Boolean(design.templateSlug && design.templateName);
  return {
    mode: usesTemplate ? "template_base" : "custom",
    templateSlug: usesTemplate ? design.templateSlug : "",
    templateCategory: usesTemplate ? design.templateCategory || "" : "",
    templateName: usesTemplate ? design.templateName : "Custom WebFactory design",
    templateLabel: usesTemplate
      ? [design.templateCategory, design.templateName].filter(Boolean).join(" — ")
      : "Custom WebFactory design",
    templateRoute: usesTemplate ? design.templateRoute?.replace(/^\/demos\//,"/templates/") || `/templates/${design.templateSlug}` : "",
    preserveTemplateStructure: usesTemplate,
    customizationScope: usesTemplate
      ? ["business branding", "logo", "colors", "customer content", "images", "catalog", "employees", "hours", "payments", "bookings", "contact information"]
      : ["business branding", "logo", "colors", "customer content", "images", "catalog", "employees", "hours", "payments", "bookings", "contact information", "custom layout"],
  };
}

function asMoney(value) {
  const amount = Number(value || 0);
  return `$${amount.toFixed(2)}`;
}

function splitCatalog(order) {
  const items = Array.isArray(order.catalog) ? order.catalog : [];
  return {
    products: items.filter((item) => item.type === "product"),
    services: items.filter((item) => item.type === "service"),
  };
}

function requirementText(order) {
  const { products, services } = splitCatalog(order);
  const business = order.business || {};
  const design = order.design || {};
  const features = order.features || {};
  const team = Array.isArray(order.team) ? order.team : [];
  const hours = order.hours || {};
  const payments = order.payments || {};
  const localization = localizationSettings(order);
  const template = designTemplateSettings(order);

  return [
    "WEBFACTORY CLIENT REQUIREMENTS",
    "",
    `Order: ${order.orderId}`,
    `Customer: ${order.client?.name || ""}`,
    `Customer email: ${order.client?.email || ""}`,
    "",
    "BUSINESS",
    `Name: ${business.name || ""}`,
    `Category: ${business.category || ""}`,
    `Description: ${business.description || ""}`,
    `Phone: ${business.phone || ""}`,
    `WhatsApp: ${business.whatsapp || ""}`,
    `Email: ${business.email || ""}`,
    `Google Maps: ${business.mapsUrl || ""}`,
    `Instagram: ${business.instagram || ""}`,
    "",
    "DESIGN",
    `Design mode: ${template.mode}`,
    `Base Template: ${template.templateLabel}`,
    `Template route: ${template.templateRoute || "not applicable"}`,
    `Preserve Template structure: ${template.preserveTemplateStructure ? "required" : "not applicable"}`,
    `Style: ${design.style || ""}`,
    `Primary color: ${design.primary || ""}`,
    `Secondary color: ${design.secondary || ""}`,
    "",
    "LANGUAGES",
    `Required languages: ${localization.languages.join(" + ")}`,
    `Default language: ${localization.defaultLanguage}`,
    `Fallback language: ${localization.fallbackLanguage}`,
    `Visible language selector: ${localization.languageSwitcher ? "required" : "disabled"}`,
    `Persist visitor selection: ${localization.persistSelection ? localization.persistence : "disabled"}`,
    "All customer-facing content and interactive states must be available in both languages.",
    "",
    "FEATURES",
    ...Object.entries(features).map(([key, value]) => `${key}: ${value ? "enabled" : "disabled"}`),
    "",
    `CATALOG: ${products.length} products / ${services.length} services`,
    ...[...products, ...services].map(
      (item) =>
        `- [${item.type}] ${item.name || "Untitled"} | ${asMoney(item.price)} | appointment: ${item.requiresAppointment ? "yes" : "no"} | duration: ${item.duration || 0} min`,
    ),
    "",
    `TEAM: ${team.length} employees`,
    ...team.map(
      (member) =>
        `- ${member.name || "Unnamed"} | ${member.role || ""} | services: ${(member.serviceIds || []).join(", ")}`,
    ),
    "",
    "BUSINESS HOURS",
    ...Object.entries(hours).map(
      ([day, value]) =>
        `${day}: ${value?.enabled ? `${value.open} - ${value.close}` : "Closed"}`,
    ),
    "",
    "PAYMENTS FOR THE CLIENT WEBSITE",
    `Stripe Connect: ${payments.methods?.stripe ? "enabled" : "disabled"}`,
    `ATH Movil Business: ${payments.methods?.ath ? "enabled" : "disabled"}`,
    `In-person payment: ${payments.methods?.inPerson ? "enabled" : "disabled"}`,
    `Product payment rule: ${payments.productPayment || "online"}`,
    `Booking payment rule: ${payments.bookingPayment || "full"}`,
    `Booking deposit: ${payments.bookingPayment === "deposit" ? `${payments.bookingDepositPercent || 25}%` : "not applicable"}`,
    `Customer receipts: ${payments.sendCustomerReceipt === false ? "disabled" : "enabled"}`,
    `Tips: ${payments.allowTips ? "enabled" : "disabled"}`,
    "",
    "IMPORTANT",
    "Use only information supplied by the customer. Do not invent addresses, phone numbers, prices, certifications, reviews, services, employees, history, guarantees, claims, or business facts.",
  ].join("\n");
}

function paymentSettings(order) {
  const payments = order.payments || {};
  return {
    architecture: "BUSINESS-OWNED PAYMENTS",
    merchantOfRecord: "CLIENT BUSINESS",
    methods: {
      stripe: {
        enabled: Boolean(payments.methods?.stripe),
        connection: "Stripe Connect",
        chargePattern: "direct charges",
        dashboard: "full",
        feesCollector: "stripe",
        lossesCollector: "stripe",
        checkoutExperience: "Stripe-hosted Checkout",
        dynamicPaymentMethods: true,
        accountStatusAtOrder: payments.stripe?.accountStatus || "new",
      },
      athMovilBusiness: {
        enabled: Boolean(payments.methods?.ath),
        accountStatusAtOrder: payments.ath?.accountStatus || "needs_account",
        publicPath: payments.ath?.publicPath || "",
      },
      inPerson: {
        enabled: Boolean(payments.methods?.inPerson),
        instructions: payments.inPerson?.instructions || "",
      },
    },
    rules: {
      productPayment: payments.productPayment || "online",
      bookingPayment: payments.bookingPayment || "full",
      bookingDepositPercent: payments.bookingPayment === "deposit"
        ? Number(payments.bookingDepositPercent || 25)
        : null,
      sendCustomerReceipt: payments.sendCustomerReceipt !== false,
      allowTips: Boolean(payments.allowTips),
    },
    security: {
      frontendPricesAuthoritative: false,
      webhookVerificationRequired: true,
      secretsIncludedInPackage: false,
      note: "Never request or store passwords, bank details, Stripe secret keys, ATH credentials, or verification codes in this package.",
    },
  };
}

function paymentSetupChecklist(order) {
  const settings = paymentSettings(order);
  const lines = [
    "WEBFACTORY PAYMENT SETUP CHECKLIST",
    "",
    "The client business owns the customer relationship and receives funds directly.",
    "Do not place secret credentials in source code, email, or this Production Package.",
    "",
  ];
  if (settings.methods.stripe.enabled) lines.push(
    "STRIPE CONNECT",
    "- Customer completes the private Stripe-hosted onboarding link.",
    "- Confirm merchant card_payments capability is active before accepting live payments.",
    "- Use direct charges and Stripe-hosted Checkout with dynamic payment methods.",
    "- Configure and verify a signed webhook for the published client website.",
    "- Keep all restricted/secret keys server-side only.",
    "",
  );
  if (settings.methods.athMovilBusiness.enabled) lines.push(
    "ATH MOVIL BUSINESS",
    "- Confirm the client has an active ATH Movil Business account.",
    "- Confirm the public pATH/business identifier and approved ecommerce option.",
    "- Add credentials only to the deployed website's secret store during production.",
    "- Verify every payment server-side before confirming an order or booking.",
    "",
  );
  if (settings.methods.inPerson.enabled) lines.push(
    "IN-PERSON PAYMENT",
    `- Customer-facing instructions: ${settings.methods.inPerson.instructions || "Not supplied"}`,
    "- Mark these orders/bookings as payment due, never as paid.",
    "- Staff must record payment completion from the administrative workflow.",
    "",
  );
  lines.push(
    "PAYMENT RULES",
    `- Products: ${settings.rules.productPayment}`,
    `- Bookings: ${settings.rules.bookingPayment}`,
    `- Deposit: ${settings.rules.bookingDepositPercent ?? "not applicable"}`,
    `- Receipts: ${settings.rules.sendCustomerReceipt ? "enabled" : "disabled"}`,
    `- Tips: ${settings.rules.allowTips ? "enabled" : "disabled"}`,
  );
  return lines.join("\n");
}

function buildPrompt(order) {
  const template = designTemplateSettings(order);
  return [
    "Create the complete production-ready WebFactory website according to the attached customer specification and files.",
    "",
    "NON-NEGOTIABLE RULES",
    "- Use ONLY customer-supplied information contained in the Production Package.",
    "- Do not invent an address, phone number, price, certification, review, service, employee, history, guarantee, statistic, or business claim.",
    "- Preserve the selected branding, colors, visual style, catalog, employees, schedules, booking settings, payment selections, and supplied files.",
    template.preserveTemplateStructure
      ? `- REQUIRED DESIGN BASE: Reproduce the structure, responsive layout, navigation, component arrangement, visual hierarchy, catalog experience, cart, booking flow, and compatible interactions of the WebFactory Template \"${template.templateLabel}\" (${template.templateRoute}). Replace only the fictional branding, colors, content, images, catalog, employees, schedules, payments, and business configuration with the customer's supplied information.`
      : "- DESIGN MODE: Create a custom WebFactory design from the customer's selected style, colors, content, and enabled features. Do not force a Template.",
    template.preserveTemplateStructure
      ? "- Do not substitute a different template, generic layout, or unrelated design for the selected Template base."
      : "- Maintain WebFactory production standards while tailoring the layout to the customer's configuration.",
    "- Every customer website MUST be fully bilingual in Spanish and English. Spanish is the default and fallback language.",
    "- Include a visible, keyboard-accessible ES/EN selector that follows the established WebFactory language-switching pattern.",
    "- Persist the visitor's language choice in localStorage and update the document <html lang> value immediately.",
    "- Localize navigation, marketing copy, catalog descriptions, cart, forms, validation, employee and booking flows, payment instructions, success/error states, accessibility labels, and SEO metadata.",
    "- Use maintained ES/EN dictionaries or equivalent structured localized fields; do not use runtime machine translation or expose untranslated interface strings.",
    "- Translate customer-supplied descriptions faithfully without inventing facts. Preserve business names, proper nouns, prices, identifiers, URLs, and customer-supplied facts exactly.",
    "- When an English translation is unavailable or ambiguous, show the supplied Spanish source instead of inventing content.",
    "- Build responsive desktop, tablet, and mobile experiences.",
    "- Products and services must use a hidden catalog window/modal so large catalogs do not overwhelm the main landing page.",
    "- Booking architecture must use Service + Employee + Time.",
    "- Payment and booking confirmations must be backend-authoritative in production.",
    "- Google Maps must use the exact customer-supplied Google Maps link.",
    "",
    "ORDER",
    `Order ID: ${order.orderId}`,
    `Product: WebFactory Premium Commerce Website`,
    `Price paid: $300 USD one-time`,
    "",
    requirementText(order),
  ].join("\n");
}

function revisionPrompt(order) {
  const template = designTemplateSettings(order);
  return [
    `WEBFACTORY REVISION PROMPT — ${order.orderId}`,
    "",
    "Preserve all approved branding, functionality, customer content, catalog data, employee mappings, schedules, booking behavior, payment behavior, and supplied files.",
    template.preserveTemplateStructure
      ? `Preserve the selected \"${template.templateLabel}\" Template structure and compatible interactions; do not replace it with another Template or generic layout.`
      : "Preserve the approved custom WebFactory layout and do not introduce an unrequested Template.",
    "Preserve complete Spanish/English coverage, the ES/EN selector, Spanish fallback behavior, localStorage preference, and document language synchronization.",
    "Apply only the revisions explicitly requested by the customer.",
    "Do not invent missing business facts.",
  ].join("\n");
}

function brandColors(order) {
  const template = designTemplateSettings(order);
  return [
    `Design mode: ${template.mode}`,
    `Base Template: ${template.templateLabel}`,
    `Primary: ${order.design?.primary || ""}`,
    `Secondary: ${order.design?.secondary || ""}`,
    `Style: ${order.design?.style || ""}`,
  ].join("\n");
}

function bookingSettings(order) {
  const services = splitCatalog(order).services;
  return {
    bookingModel: "SERVICE + EMPLOYEE + TIME",
    services: services
      .filter((item) => item.requiresAppointment)
      .map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        durationMinutes: item.duration,
        requiresAppointment: true,
        assignedEmployees: (order.team || [])
          .filter((member) => (member.serviceIds || []).includes(item.id))
          .map((member) => member.id),
      })),
    businessHours: order.hours || {},
    note:
      "Employee-specific buffers, deposits, notice windows, vacations, Google Calendar IDs, and overrides are included only when explicitly configured in the customer data.",
  };
}

export async function createSummaryPdf(order) {
  const template = designTemplateSettings(order);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const lines = [
    ["WebFactory Paid Order", true],
    [`Order ID: ${order.orderId}`, false],
    ["Status: PAID", false],
    ["Product: WebFactory Premium Commerce Website", false],
    ["Amount: $300 USD", false],
    [`Customer: ${order.client?.name || ""}`, false],
    [`Customer email: ${order.client?.email || ""}`, false],
    [`Business: ${order.business?.name || ""}`, false],
    [`Category: ${order.business?.category || ""}`, false],
    [`Phone: ${order.business?.phone || ""}`, false],
    [`Google Maps: ${order.business?.mapsUrl || ""}`, false],
    [`Design: ${template.templateLabel} / ${order.design?.style || ""} / ${order.design?.primary || ""} / ${order.design?.secondary || ""}`, false],
    ["Languages: Español + English (Spanish default)", false],
    [`Catalog items: ${Array.isArray(order.catalog) ? order.catalog.length : 0}`, false],
    [`Employees: ${Array.isArray(order.team) ? order.team.length : 0}`, false],
    [`Paid at: ${order.paidAt || ""}`, false],
    ["", false],
    ["Full structured requirements are included in order-data.json and CLIENT_REQUIREMENTS.txt.", false],
  ];

  let page = pdf.addPage([612, 792]);
  let y = 742;

  const addWrapped = (text, isBold = false) => {
    const font = isBold ? bold : regular;
    const size = isBold ? 16 : 10;
    const maxWidth = 500;
    const words = String(text).split(/\s+/);
    let current = "";
    const wrapped = [];

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        wrapped.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) wrapped.push(current);

    for (const row of wrapped.length ? wrapped : [""]) {
      if (y < 55) {
        page = pdf.addPage([612, 792]);
        y = 742;
      }
      page.drawText(row, {
        x: 56,
        y,
        size,
        font,
        color: rgb(0.05, 0.09, 0.16),
      });
      y -= isBold ? 24 : 16;
    }
  };

  for (const [line, isBold] of lines) addWrapped(line, isBold);

  return Buffer.from(await pdf.save());
}

async function addAsset(zip, assetKey, targetPath) {
  if (!assetKey) return;
  const data = await assetStore().get(assetKey, { type: "arrayBuffer" });
  if (!data) return;
  zip.file(targetPath, Buffer.from(data));
}

export async function ensureProductionPackage(order) {
  if (order.package?.ready && order.package?.blobKey) return order;

  await patchOrder(order.orderId, {
    status: "PACKAGE_GENERATING",
    packageGeneratingAt: new Date().toISOString(),
  });

  const zip = new JSZip();
  const requirements = requirementText(order);
  const prompt = buildPrompt(order);
  const revision = revisionPrompt(order);
  const summaryPdf = await createSummaryPdf(order);
  const { products, services } = splitCatalog(order);
  const localization = localizationSettings(order);
  const template = designTemplateSettings(order);

  zip.file("01_ORDER_SUMMARY/order-summary.pdf", summaryPdf);
  zip.file("01_ORDER_SUMMARY/order-data.json", JSON.stringify(order, null, 2));
  zip.file("02_AI_PROMPT/WEBFACTORY_BUILD_PROMPT.txt", prompt);
  zip.file("02_AI_PROMPT/CLIENT_REQUIREMENTS.txt", requirements);
  zip.file("02_AI_PROMPT/REVISION_PROMPT.txt", revision);
  zip.file("03_BRANDING/brand-colors.txt", brandColors(order));
  zip.file("05_CATALOG/products.json", JSON.stringify(products, null, 2));
  zip.file("05_CATALOG/services.json", JSON.stringify(services, null, 2));
  zip.file("06_TEAM/employees.json", JSON.stringify(order.team || [], null, 2));
  zip.file("06_TEAM/schedules.json", JSON.stringify(order.hours || {}, null, 2));
  zip.file("07_BOOKINGS/booking-settings.json", JSON.stringify(bookingSettings(order), null, 2));
  zip.file(
    "07_BOOKINGS/calendar-settings.json",
    JSON.stringify(
      {
        enabled: Boolean(order.features?.calendar),
        provider: "Google Calendar",
        employeeCalendars: [],
        note: "Calendar IDs are included only when explicitly supplied/configured.",
      },
      null,
      2,
    ),
  );
  zip.file("08_BUSINESS/business-info.json", JSON.stringify(order.business || {}, null, 2));
  zip.file(
    "08_BUSINESS/contact-info.json",
    JSON.stringify(
      {
        customer: order.client || {},
        phone: order.business?.phone || "",
        whatsapp: order.business?.whatsapp || "",
        email: order.business?.email || "",
        googleMapsUrl: order.business?.mapsUrl || "",
      },
      null,
      2,
    ),
  );
  zip.file(
    "08_BUSINESS/social-links.json",
    JSON.stringify({ instagram: order.business?.instagram || "" }, null, 2),
  );
  zip.file("09_PAYMENTS/payment-settings.json", JSON.stringify(paymentSettings(order), null, 2));
  zip.file("09_PAYMENTS/PAYMENT_SETUP_CHECKLIST.txt", paymentSetupChecklist(order));
  zip.file("10_LOCALIZATION/language-settings.json", JSON.stringify(localization, null, 2));
  zip.file(
    "10_LOCALIZATION/LOCALIZATION_REQUIREMENTS.txt",
    [
      "WEBFACTORY BILINGUAL WEBSITE REQUIREMENTS",
      "",
      "Every customer-facing page and interactive state must support Español and English.",
      "Spanish is the default and fallback language.",
      "Provide a visible and keyboard-accessible ES/EN selector.",
      "Persist the visitor's selection in localStorage and synchronize the document html lang attribute.",
      "Use reviewed translation dictionaries or equivalent structured localized content.",
      "Do not use runtime machine translation.",
      "Preserve business names, proper nouns, prices, identifiers, URLs, and supplied facts exactly.",
      "If an English translation is unavailable or ambiguous, use the supplied Spanish source instead of inventing content.",
      "",
      `Required coverage: ${localization.contentCoverage.join(", ")}.`,
    ].join("\n"),
  );
  zip.file("11_DESIGN_BASE/design-base.json", JSON.stringify(template, null, 2));
  zip.file(
    "11_DESIGN_BASE/DESIGN_BASE_REQUIREMENTS.txt",
    template.preserveTemplateStructure
      ? [
          "WEBFACTORY SELECTED TEMPLATE BASE",
          "",
          `Selected Template: ${template.templateLabel}`,
          `Template route: ${template.templateRoute}`,
          "Preserve the selected Template's structure, responsive layout, navigation, visual hierarchy, component arrangement, catalog experience, cart, booking flow, and compatible interactions.",
          "Replace its fictional business branding, colors, text, images, catalog, employees, schedules, payments, bookings, and contact information with the customer's supplied information.",
          "Do not substitute another template or a generic layout.",
        ].join("\n")
      : [
          "WEBFACTORY CUSTOM DESIGN MODE",
          "",
          "No Template base was selected.",
          "Create a custom WebFactory design using the customer's selected style, colors, content, assets, and enabled features.",
          "Do not force or copy a Template.",
        ].join("\n"),
  );

  if (order.business?.logoAssetKey) {
    const ext = safeFileName(order.business.logoAssetName || "client-logo.png").split(".").pop() || "png";
    await addAsset(zip, order.business.logoAssetKey, `03_BRANDING/client-logo.${ext}`);
  }

  for (const item of order.catalog || []) {
    if (!item.imageAssetKey) continue;
    const name = safeFileName(item.imageName || `${item.id}.jpg`);
    await addAsset(zip, item.imageAssetKey, `04_IMAGES/${safeFileName(item.id)}-${name}`);
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const businessSlug = safeFileName(order.business?.name || "client").toUpperCase();
  const packageFileName = `${safeFileName(order.orderId)}-${businessSlug}.zip`;
  const blobKey = `packages/${safeFileName(order.orderId)}/${packageFileName}`;
  await packageStore().set(blobKey, zipBuffer);

  const downloadToken = crypto.randomBytes(32).toString("hex");
  const downloadExpiresAt = new Date(
    Date.now() + DOWNLOAD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  return patchOrder(order.orderId, {
    status: "PACKAGE_READY",
    packageReadyAt: new Date().toISOString(),
    packageVersion: PACKAGE_VERSION,
    package: {
      ready: true,
      blobKey,
      fileName: packageFileName,
      size: zipBuffer.length,
      downloadToken,
      downloadExpiresAt,
      prompt,
      requirements,
      revisionPrompt: revision,
    },
  });
}
