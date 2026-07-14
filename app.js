const niches = {
  restaurante: {
    label: "Restaurante",
    tagline: "Menu, contacto y pagos opcionales en una pagina rapida.",
    sections: ["Menu", "Especiales", "Servicios", "Ubicacion", "Contacto"],
    benefits: ["Menu claro", "Contacto rapido", "Pagos opcionales", "Marca profesional"],
    timeline: "2 dias",
  },
  barberia: {
    label: "Barberia",
    tagline: "Servicios, estilos y contacto para clientes recurrentes.",
    sections: ["Servicios", "Barberos", "Estilos", "Galeria", "Contacto"],
    benefits: ["Servicios claros", "Estilos visibles", "Galeria profesional", "Clientes recurrentes"],
    timeline: "2 dias",
  },
  servicios: {
    label: "Servicios profesionales",
    tagline: "Cotizaciones, confianza y seguimiento para conseguir clientes.",
    sections: ["Servicios", "Casos", "Cotizacion", "Testimonios", "Contacto"],
    benefits: ["Cotizaciones claras", "Confianza visual", "Casos destacados", "Contacto directo"],
    timeline: "2 dias",
  },
  iglesia: {
    label: "Iglesia o comunidad",
    tagline: "Eventos, donaciones y comunicacion en una web clara.",
    sections: ["Bienvenida", "Eventos", "Donaciones", "Ministerios", "Contacto"],
    benefits: ["Eventos visibles", "Donaciones simples", "Comunidad conectada", "Informacion clara"],
    timeline: "2 dias",
  },
  tienda: {
    label: "Tienda local",
    tagline: "Catalogo simple, contacto directo y pagos opcionales.",
    sections: ["Productos", "Colecciones", "Catalogo destacado", "Pagos opcionales", "Contacto"],
    benefits: ["Catalogo visible", "Contacto directo", "Pagos opcionales", "Marca local"],
    timeline: "3 dias",
  },
  eventos: {
    label: "Eventos",
    tagline: "Informacion del evento, contacto y pagos opcionales.",
    sections: ["Evento", "Agenda", "Entradas", "Lugar", "Preguntas"],
    benefits: ["Informacion clara", "Agenda visible", "Ubicacion directa", "Pagos opcionales"],
    timeline: "2 dias",
  },
  automotriz: {
    label: "Auto Service",
    tagline: "Servicio automotriz profesional en el que puedes confiar.",
    sections: [
      "Diagnostico computarizado",
      "Cambio de aceite",
      "Frenos",
      "Suspension",
      "Mantenimiento preventivo",
      "Reparacion general",
    ],
    benefits: ["Trabajo garantizado", "Mecanicos certificados", "Equipo moderno", "Satisfaccion garantizada"],
    timeline: "3 dias",
  },
};

const packages = {
  basica: {
    label: "Inicio",
    price: 20.99,
    monthly: 9,
  },
  pagos: {
    label: "Profesional",
    price: 49.99,
    monthly: 15,
  },
  app: {
    label: "Pagos",
    price: 69.99,
    monthly: 25,
  },
};

const packageCheckoutLinks = {
  basica: "https://buy.stripe.com/eVq7sEeX7gWI8NKbWU4wM00",
  pagos: "https://buy.stripe.com/14A5kw7uFfSEaVS2mk4wM01",
  app: "https://buy.stripe.com/fZu6oA02dfSE7JG9OM4wM02",
};

const packageRules = {
  basica: {
    included: [
      "1 seccion principal",
      "estilos y fuentes basicas",
      "logo o foto principal",
      "sin enlaces de pago",
    ],
    allowedStyles: ["moderno", "minimal"],
    allowedFonts: ["moderna", "limpia", "compacta", "redondeada"],
    allowCustomColors: false,
    allowHeroImage: true,
    maxGalleryImages: 0,
    allowPaymentLinks: false,
    allowSupport: false,
    allowedHeaderStyles: ["simple"],
    allowedFooterStyles: ["simple"],
    allowedHeaderCtas: ["phone", "contact"],
    allowedDeliveryTemplates: ["standard"],
    allowLayoutImages: false,
    allowSocialLinks: false,
    maxSections: 1,
  },
  pagos: {
    included: [
      "pagina completa por nicho",
      "todos los estilos y fuentes",
      "colores personalizados",
      "hasta 3 imagenes de contenido",
      "sin enlaces de pago",
    ],
    allowedStyles: ["moderno", "elegante", "vibrante", "minimal", "editorial", "automotriz"],
    allowedFonts: "all",
    allowCustomColors: true,
    allowHeroImage: true,
    maxGalleryImages: 3,
    allowPaymentLinks: false,
    allowSupport: true,
    allowedHeaderStyles: ["simple", "sticky", "autoService"],
    allowedFooterStyles: ["simple", "brand", "autoService"],
    allowedHeaderCtas: ["phone", "whatsapp", "contact"],
    allowedDeliveryTemplates: ["standard", "autoServiceReplica"],
    allowLayoutImages: true,
    allowSocialLinks: true,
    maxSections: 5,
  },
  app: {
    included: [
      "todo lo profesional",
      "hasta 6 imagenes de contenido",
      "Stripe y ATH Movil de negocio",
      "enlaces de pago del cliente",
      "simulador de entrega Premium +",
    ],
    allowedStyles: ["moderno", "elegante", "vibrante", "minimal", "editorial", "automotriz"],
    allowedFonts: "all",
    allowCustomColors: true,
    allowHeroImage: true,
    maxGalleryImages: 6,
    allowPaymentLinks: true,
    allowSupport: true,
    allowedHeaderStyles: ["simple", "sticky", "autoService"],
    allowedFooterStyles: ["simple", "brand", "autoService"],
    allowedHeaderCtas: ["phone", "whatsapp", "contact", "payments"],
    allowedDeliveryTemplates: ["standard", "autoServiceReplica"],
    allowLayoutImages: true,
    allowSocialLinks: true,
    maxSections: 6,
  },
};

const deliveryTemplates = {
  standard: {
    label: "Generica por nicho",
    description: "Pagina profesional flexible con bloques basicos por negocio.",
  },
  autoServiceReplica: {
    label: "Premium +",
    description: "Entrega completa premium: header, hero, beneficios, servicios, nosotros, contacto, mapa, footer y WhatsApp.",
  },
};

const headerStyles = {
  simple: {
    label: "Simple limpio",
    description: "Logo o nombre, menu basico y contacto.",
  },
  sticky: {
    label: "Sticky profesional",
    description: "Header fijo con menu visible y boton de accion.",
  },
  autoService: {
    label: "Premium +",
    description: "Header oscuro, menu fuerte y boton de llamada.",
  },
};

const footerStyles = {
  simple: {
    label: "Simple",
    description: "Footer corto con marca y credito.",
  },
  brand: {
    label: "Marca + contacto",
    description: "Footer con frase, contacto y enlaces principales.",
  },
  autoService: {
    label: "Premium +",
    description: "Footer oscuro de impacto con frase grande, redes y copyright.",
  },
};

const visualStyles = {
  moderno: {
    label: "Blanco y negro",
    description: "Base limpia, moderna y facil de adaptar a cualquier negocio.",
    primary: "#ffffff",
    accent: "#000000",
  },
  elegante: {
    label: "Elegante premium",
    description: "Sobrio, profesional y bueno para servicios de alto valor.",
    primary: "#25312d",
    accent: "#b27a20",
  },
  vibrante: {
    label: "Vibrante comercial",
    description: "Mas energia visual para comida, eventos y promociones.",
    primary: "#0f766e",
    accent: "#e0523f",
  },
  minimal: {
    label: "Minimal simple",
    description: "Pocas distracciones, ideal para paginas economicas.",
    primary: "#2f3a36",
    accent: "#1e6091",
  },
  editorial: {
    label: "Editorial con fotos",
    description: "Pensado para marcas que quieren destacar imagenes.",
    primary: "#1e6091",
    accent: "#d96b4c",
  },
  automotriz: {
    label: "Premium +",
    description: "Oscuro, fuerte y con acento neon para paginas premium.",
    primary: "#8dff00",
    accent: "#050505",
  },
};

const fontChoices = {
  moderna: {
    label: "Moderna limpia",
    stack: "Inter, Segoe UI, Arial, sans-serif",
    description: "Clara y profesional para la mayoria de negocios.",
  },
  ejecutiva: {
    label: "Ejecutiva suave",
    stack: "Aptos, Calibri, Segoe UI, sans-serif",
    description: "Seria sin sentirse pesada, buena para consultores.",
  },
  limpia: {
    label: "Limpia universal",
    stack: "Arial, Helvetica, sans-serif",
    description: "Simple, compatible y directa para cualquier nicho.",
  },
  compacta: {
    label: "Compacta legible",
    stack: "Tahoma, Verdana, Arial, sans-serif",
    description: "Practica para paginas con bastante informacion.",
  },
  clasica: {
    label: "Clasica serif",
    stack: "Georgia, Times New Roman, serif",
    description: "Mas tradicional, ideal para servicios formales.",
  },
  redondeada: {
    label: "Redondeada amigable",
    stack: "Trebuchet MS, Verdana, Arial, sans-serif",
    description: "Cercana y facil de leer para comercios locales.",
  },
  juvenil: {
    label: "Juvenil clara",
    stack: "Century Gothic, Trebuchet MS, Arial, sans-serif",
    description: "Ligera y moderna para marcas frescas.",
  },
  editorial: {
    label: "Editorial elegante",
    stack: "Palatino Linotype, Book Antiqua, Georgia, serif",
    description: "Buena para marcas con fotografia y storytelling.",
  },
  academica: {
    label: "Academica confiable",
    stack: "Cambria, Georgia, Times New Roman, serif",
    description: "Formal y muy legible para instituciones o educacion.",
  },
  artesanal: {
    label: "Artesanal clasica",
    stack: "Garamond, Georgia, Times New Roman, serif",
    description: "Calida para productos hechos a mano, comida o arte.",
  },
  lujo: {
    label: "Lujo editorial",
    stack: "Didot, Bodoni MT, Georgia, serif",
    description: "Mas refinada para belleza, moda o marcas premium.",
  },
  formal: {
    label: "Formal tradicional",
    stack: "Times New Roman, Georgia, serif",
    description: "Conservadora para documentos, leyes o oficinas.",
  },
  impacto: {
    label: "Impacto comercial",
    stack: "Impact, Haettenschweiler, Arial Narrow, sans-serif",
    description: "Fuerte para promociones, eventos y ofertas.",
  },
  condensada: {
    label: "Condensada urbana",
    stack: "Arial Narrow, Aptos Narrow, Arial, sans-serif",
    description: "Buena para titulares con poco espacio.",
  },
  eleganteSans: {
    label: "Elegante sans",
    stack: "Gill Sans MT, Candara, Calibri, sans-serif",
    description: "Pulida para marcas profesionales y minimalistas.",
  },
  tecnica: {
    label: "Tecnica simple",
    stack: "Consolas, Lucida Console, Courier New, monospace",
    description: "Mas directa para servicios tecnicos o tecnologia.",
  },
  codigo: {
    label: "Codigo moderno",
    stack: "Cascadia Mono, Consolas, Courier New, monospace",
    description: "Ideal para tecnologia, reparaciones y servicios digitales.",
  },
};

const paymentLabels = {
  stripe: "Stripe",
  ath: "ATH Movil de negocio",
};

const headerCtas = {
  phone: {
    label: "Llamar ahora",
  },
  whatsapp: {
    label: "WhatsApp",
  },
  contact: {
    label: "Contacto",
  },
  payments: {
    label: "Pagar / comprar",
  },
};

const headerCtaLabels = Object.fromEntries(
  Object.entries(headerCtas).map(([key, item]) => [key, item.label])
);

const form = document.querySelector("#siteForm");
const nicheSelect = document.querySelector("#niche");
const packageSelect = document.querySelector("#package");
const styleSelect = document.querySelector("#visualStyle");
const fontSelect = document.querySelector("#fontChoice");
const deliveryTemplateSelect = document.querySelector("#deliveryTemplate");
const headerStyleSelect = document.querySelector("#headerStyle");
const footerStyleSelect = document.querySelector("#footerStyle");
const screenshotButton = document.querySelector("#screenshotButton");
const submitOrderButton = document.querySelector("#submitOrderButton");
const heroImageInput = document.querySelector("#heroImage");
const headerImageInput = document.querySelector("#headerImage");
const footerImageInput = document.querySelector("#footerImage");
const galleryInput = document.querySelector("#galleryImages");
const noPaymentsInput = document.querySelector("#noPayments");
const paymentMethodInputs = ["stripe", "ath"].map((id) => document.querySelector(`#${id}`));
const colorInputs = ["primaryColor", "accentColor"].map((id) => document.querySelector(`#${id}`));
const maintenanceInput = document.querySelector("#maintenance");
const screenshotModal = document.querySelector("#screenshotModal");
const screenshotClose = document.querySelector("#screenshotClose");
let screenshotReturnFocus = null;
let screenshotScrollPosition = { x: 0, y: 0 };
let submittingVerifiedOrder = false;

const languageButtons = document.querySelectorAll("[data-language]");
const languageStorageKey = "webfactory-language";
const paidCheckoutStorageKey = "webfactory-paid-checkout";
const pendingCheckoutStorageKey = "webfactory-pending-checkout";
const submittedOrderStorageKey = "webfactory-submitted-order";
const originalTextNodes = new WeakMap();
const originalAttributeValues = new WeakMap();
const originalInputValues = new WeakMap();

const translations = {
  en: {
    "Principal": "Main",
    "Paquetes": "Packages",
    "Pagos": "Payments",
    "Demos": "Demos",
    "Proceso": "Process",
    "Pedido": "Order",
    "Producto economico para negocios locales": "Affordable product for local businesses",
    "Crea paginas web accesibles por nicho": "Create affordable niche websites",
    "desde $20.99": "starting at $20.99",
    "El cliente escoge su nicho, paga la creacion, envia sus datos y recibe una pagina profesional lista para publicar. Stripe y ATH Movil de negocio se dejan enlazados a las cuentas que el cliente manejara aparte.": "The client chooses a niche, pays for the website creation, sends their details, and receives a professional page ready to publish. Stripe and ATH Movil Business are linked to accounts the client manages separately.",
    "Ver ejemplos": "View examples",
    "Comenzar pedido": "Start order",
    "Vista de un panel para crear paginas web": "View of a website builder dashboard",
    "Panel de creacion de paginas web en una laptop": "Website creation dashboard on a laptop",
    "Metodos de pago disponibles": "Available payment methods",
    "Metodos de pago con Stripe y ATH Business": "Payment methods with Stripe and ATH Business",
    "Paquetes de Oferta": "Offer Packages",
    "Inicio": "Starter",
    "Profesional": "Professional",
    "Pagos": "Payments",
    "Una seccion, contacto, estilo y fuentes basicas, sin galeria ni pagos.": "One section, contact, basic style and fonts, with no gallery or payments.",
    "Pagina completa con estilos, fuentes, colores y hasta 3 imagenes.": "Complete page with styles, fonts, colors, and up to 3 images.",
    "Todo lo profesional mas botones o enlaces de Stripe y ATH Movil de negocio.": "Everything in Professional plus Stripe and ATH Movil Business buttons or links.",
    "Requisitos de pago": "Payment requirements",
    "Como activar Stripe y ATH Movil de negocio": "How to activate Stripe and ATH Movil Business",
    "Stripe permite crear enlaces de pago, botones o checkout para tarjetas y otros metodos. En el plan estandar no cobra setup ni mensualidad; cobra por transaccion exitosa.": "Stripe lets businesses create payment links, buttons, or checkout for cards and other methods. The standard plan has no setup or monthly fee; it charges per successful transaction.",
    "Crear cuenta en Stripe y verificar el negocio.": "Create a Stripe account and verify the business.",
    "Completar informacion del negocio, producto y representante.": "Complete the business, product, and representative information.",
    "Agregar informacion publica: nombre, web, soporte, direccion y descriptor.": "Add public information: name, website, support, address, and descriptor.",
    "Conectar cuenta bancaria para recibir depositos.": "Connect a bank account to receive payouts.",
    "Las tarifas pueden variar por tarjetas internacionales, conversion de moneda, disputas o productos adicionales.": "Fees may vary for international cards, currency conversion, disputes, or additional products.",
    "Ver Stripe": "View Stripe",
    "Copiar enlace": "Copy link",
    "ATH Business permite recibir pagos de usuarios de ATH Movil en Puerto Rico con QR, pATH, enlaces de pago o boton de pago para tienda online.": "ATH Business lets businesses receive payments from ATH Movil users in Puerto Rico using QR, pATH, payment links, or an online payment button.",
    "Descargar la app ATH Business y verificar el email.": "Download the ATH Business app and verify the email.",
    "Entrar tipo de negocio, nombre, estructura, identificacion y direccion postal.": "Enter business type, name, structure, identification, and postal address.",
    "Crear el pATH del negocio para aparecer en \"Paga a un negocio\".": "Create the business pATH to appear under \"Pay a business\".",
    "Registrar una tarjeta ATH de cuenta comercial de una institucion participante.": "Register an ATH card from a business account at a participating institution.",
    "Indica $0 cuota mensual. Cobra 2.25% por pago recibido, minimo $0.06; el cliente no paga por enviar el pago.": "It lists a $0 monthly fee. It charges 2.25% per payment received, minimum $0.06; the customer does not pay to send the payment.",
    "Ver ATH Business": "View ATH Business",
    "Enlaces utiles para el cliente": "Useful links for the client",
    "Crear cuenta Stripe": "Create Stripe account",
    "Boton de Pago ATH Business": "ATH Business Payment Button",
    "Preguntas ATH Business": "ATH Business FAQ",
    "Ejemplos": "Examples",
    "Mira demos visuales antes de ordenar": "View visual demos before ordering",
    "Restaurante": "Restaurant",
    "Menu, contacto, imagenes y botones de pago conectados a cuentas del cliente.": "Menu, contact, images, and payment buttons connected to the client's accounts.",
    "Auto Service": "Auto Service",
    "Estilo llamativo con header, servicios, beneficios, mapa, WhatsApp y ATH Movil de negocio.": "Bold style with header, services, benefits, map, WhatsApp, and ATH Movil Business.",
    "Servicios": "Services",
    "Consultoria Brillante": "Bright Consulting",
    "Pagina profesional enfocada en confianza, servicios, casos, contacto y cotizacion.": "Professional page focused on trust, services, cases, contact, and quotes.",
    "Tienda local": "Local Store",
    "Boutique Luna": "Luna Boutique",
    "Catalogo visual sin carrito online, con contacto directo y botones de pago si aplica.": "Visual catalog without online cart, with direct contact and payment buttons if applicable.",
    "Ver Pagina Demo": "View Demo Page",
    "Crear mi pagina": "Create my page",
    "Configurador": "Configurator",
    "Simulador de pedido": "Order simulator",
    "Nombre del cliente": "Client name",
    "Tu nombre": "Your name",
    "Email del cliente": "Client email",
    "Telefono / WhatsApp": "Phone / WhatsApp",
    "Nombre del negocio": "Business name",
    "Datos pÃºblicos del negocio": "Public business details",
    "Datos publicos del negocio": "Public business details",
    "TelÃ©fono pÃºblico": "Public phone",
    "Telefono publico": "Public phone",
    "Email pÃºblico": "Public email",
    "Email publico": "Public email",
    "DirecciÃ³n": "Address",
    "Direccion": "Address",
    "Ciudad, Puerto Rico": "City, Puerto Rico",
    "Horarios": "Business hours",
    "Lunes - Viernes: 8am - 5pm": "Monday - Friday: 8am - 5pm",
    "Enlace de mapa": "Map link",
    "WhatsApp pÃºblico": "Public WhatsApp",
    "WhatsApp publico": "Public WhatsApp",
    "Nicho": "Niche",
    "Paquete": "Package",
    "Estilo visual": "Visual style",
    "Fuente de texto": "Text font",
    "Header y footer": "Header and footer",
    "Estilo de header": "Header style",
    "Plantilla de entrega": "Delivery template",
    "Boton del header": "Header button",
    "Llamar ahora": "Call now",
    "WhatsApp": "WhatsApp",
    "Contacto": "Contact",
    "Pagar / comprar": "Pay / buy",
    "Estilo de footer": "Footer style",
    "Frase del footer": "Footer phrase",
    "Calidad, confianza y compromiso": "Quality, trust, and commitment",
    "Imagen del header / logo": "Header image / logo",
    "Imagen del footer": "Footer image",
    "Colores del sitio": "Site colors",
    "Color principal": "Primary color",
    "Color acento": "Accent color",
    "Pagos que manejara el cliente en sus cuentas": "Payments the client will manage in their own accounts",
    "No incluir enlaces de pago": "Do not include payment links",
    "ATH Movil de negocio": "ATH Movil Business",
    "Enlace Stripe del cliente": "Client Stripe link",
    "ATH Movil de negocio / instrucciones del cliente": "ATH Movil Business / client instructions",
    "ATH Movil de negocio, enlace o instrucciones": "ATH Movil Business, link, or instructions",
    "Logo o foto principal": "Logo or main photo",
    "Imagenes de contenido": "Content images",
    "Extras": "Extras",
    "Soporte mensual opcional": "Optional monthly support",
    "Incluye cambios pequenos despues de publicar, actualizacion de textos o fotos, revision de enlaces y asistencia basica para mantener la pagina al dia.": "Includes small changes after publishing, text or photo updates, link checks, and basic help to keep the page up to date.",
    "Mensaje del cliente": "Client message",
    "Necesito una pagina moderna con menu, contacto y botones de pago si aplica.": "I need a modern page with menu, contact, and payment buttons if applicable.",
    "Comprar Ahora": "Buy Now",
    "Demo listo": "Demo ready",
    "Imagenes del cliente": "Client images",
    "Sin imagenes cargadas": "No images uploaded",
    "Secciones": "Sections",
    "Estilo": "Style",
    "Precio sugerido": "Suggested price",
    "Entrega estimada": "Estimated delivery",
    "Soporte opcional": "Optional support",
    "Resumen": "Summary",
    "Despues del simulador": "After the simulator",
    "Confirmas el pedido y recibes tu pagina publicada": "Confirm the order and receive your published page",
    "Envias tu pedido:": "Submit your order:",
    "eliges paquete, nicho, estilo, fuente, colores, datos e imagenes.": "choose package, niche, style, font, colors, details, and images.",
    "Confirmamos la solicitud:": "We confirm the request:",
    "revisamos que la informacion este completa antes de crear la pagina.": "we review that the information is complete before creating the page.",
    "Creamos tu pagina:": "We create your page:",
    "usamos las selecciones del simulador como referencia visual.": "we use the simulator selections as the visual reference.",
    "Publicamos la version final:": "We publish the final version:",
    "la pagina queda lista para compartir con tus clientes.": "the page is ready to share with your customers.",
    "Recibes el enlace:": "You receive the link:",
    "te enviamos tu pagina publicada e instrucciones basicas de uso.": "we send your published page and basic usage instructions.",
    "Entrega": "Delivery",
    "Que recibes al final": "What you receive at the end",
    "Pagina publicada": "Published page",
    "Tu web queda en linea con la informacion que enviaste.": "Your website goes online with the information you sent.",
    "Enlace final": "Final link",
    "Recibes el link listo para compartir en redes, WhatsApp o tarjetas.": "You receive the link ready to share on social media, WhatsApp, or cards.",
    "Botones de pago": "Payment buttons",
    "Solo se agregan si escogiste Stripe o ATH Movil de negocio.": "Only added if you chose Stripe or ATH Movil Business.",
    "Puedes pedir mantenimiento mensual para cambios pequenos.": "You can request monthly maintenance for small changes.",
    "Importante": "Important",
    "Lo que incluye el servicio": "What the service includes",
    "Pagina informativa": "Informational page",
    "Una web profesional para mostrar tu negocio, servicios, fotos y contacto.": "A professional website to show your business, services, photos, and contact.",
    "Sin orden online": "No online ordering",
    "No incluye carrito, reservas ni sistema de pedidos dentro de la pagina.": "Does not include cart, reservations, or an ordering system inside the page.",
    "Personalizacion": "Customization",
    "Se adapta a tu nicho, colores, fuente, imagenes, header y footer.": "Adapts to your niche, colors, font, images, header, and footer.",
    "Pagos si aplica": "Payments if applicable",
    "Stripe y ATH Movil de negocio se agregan solo como botones o enlaces.": "Stripe and ATH Movil Business are added only as buttons or links.",
    "Demo del cliente": "Client demo",
    "Cerrar demo": "Close demo",
    "Inicio": "Starter",
    "Nosotros": "About",
    "Por que escoger este negocio": "Why choose this business",
    "Un bloque preparado para presentar confianza, experiencia y valor de marca.": "A block prepared to present trust, experience, and brand value.",
    "Contenido visual": "Visual content",
    "Datos del negocio": "Business details",
    "Mapa del negocio": "Business map",
    "Conversion": "Conversion",
    "Pagina generada por WebFactory PR": "Page generated by WebFactory PR",
    "© 2026 Web Factory PR. Todos los derechos reservados": "© 2026 Web Factory PR. All rights reserved",
    "Barberia": "Barbershop",
    "Servicios profesionales": "Professional services",
    "Iglesia o comunidad": "Church or community",
    "Eventos": "Events",
    "Menu, contacto y pagos opcionales en una pagina rapida.": "Menu, contact, and optional payments on a fast page.",
    "Servicios, estilos y contacto para clientes recurrentes.": "Services, styles, and contact for returning clients.",
    "Cotizaciones, confianza y seguimiento para conseguir clientes.": "Quotes, trust, and follow-up to win clients.",
    "Eventos, donaciones y comunicacion en una web clara.": "Events, donations, and communication in a clear website.",
    "Catalogo simple, contacto directo y pagos opcionales.": "Simple catalog, direct contact, and optional payments.",
    "Informacion del evento, contacto y pagos opcionales.": "Event information, contact, and optional payments.",
    "Servicio automotriz profesional en el que puedes confiar.": "Professional auto service you can trust.",
    "Menu": "Menu",
    "Especiales": "Specials",
    "Ubicacion": "Location",
    "Barberos": "Barbers",
    "Galeria": "Gallery",
    "Cotizacion": "Quote",
    "Testimonios": "Testimonials",
    "Bienvenida": "Welcome",
    "Donaciones": "Donations",
    "Ministerios": "Ministries",
    "Productos": "Products",
    "Colecciones": "Collections",
    "Catalogo destacado": "Featured catalog",
    "Pagos opcionales": "Optional payments",
    "Evento": "Event",
    "Agenda": "Schedule",
    "Entradas": "Tickets",
    "Lugar": "Place",
    "Preguntas": "Questions",
    "Diagnostico computarizado": "Computer diagnostics",
    "Cambio de aceite": "Oil change",
    "Frenos": "Brakes",
    "Suspension": "Suspension",
    "Mantenimiento preventivo": "Preventive maintenance",
    "Reparacion general": "General repair",
    "Blanco y negro": "Black and white",
    "Elegante premium": "Premium elegant",
    "Vibrante comercial": "Commercial vibrant",
    "Minimal simple": "Simple minimal",
    "Editorial con fotos": "Editorial with photos",
    "Moderna limpia": "Modern clean",
    "Ejecutiva suave": "Soft executive",
    "Limpia universal": "Universal clean",
    "Compacta legible": "Readable compact",
    "Clasica serif": "Classic serif",
    "Redondeada amigable": "Friendly rounded",
    "Juvenil clara": "Clear youthful",
    "Editorial elegante": "Elegant editorial",
    "Academica confiable": "Reliable academic",
    "Artesanal clasica": "Classic handmade",
    "Lujo editorial": "Editorial luxury",
    "Formal tradicional": "Traditional formal",
    "Impacto comercial": "Commercial impact",
    "Condensada urbana": "Urban condensed",
    "Elegante sans": "Elegant sans",
    "Tecnica simple": "Simple technical",
    "Codigo moderno": "Modern code",
    "Generica por nicho": "Generic by niche",
    "Simple limpio": "Clean simple",
    "Sticky profesional": "Professional sticky",
    "Marca + contacto": "Brand + contact",
    "Todo lo profesional": "Everything professional",
    "todo lo profesional": "everything professional",
    "hasta 6 imagenes de contenido": "up to 6 content images",
    "Stripe y ATH Movil de negocio": "Stripe and ATH Movil Business",
    "enlaces de pago del cliente": "client payment links",
    "simulador de entrega Premium +": "Premium + delivery simulator",
    "pagina completa por nicho": "complete niche page",
    "todos los estilos y fuentes": "all styles and fonts",
    "colores personalizados": "custom colors",
    "hasta 3 imagenes de contenido": "up to 3 content images",
    "sin enlaces de pago": "no payment links",
    "1 seccion principal": "1 main section",
    "estilos y fuentes basicas": "basic styles and fonts",
    "logo o foto principal": "logo or main photo",
    "Pagos no incluidos": "Payments not included",
    "Sin enlaces de pago": "No payment links",
    "Sin pagos seleccionados": "No payments selected",
    "Stripe listo": "Stripe ready",
    "Stripe pendiente": "Stripe pending",
    "ATH Movil de negocio listo": "ATH Movil Business ready",
    "ATH Movil de negocio pendiente": "ATH Movil Business pending",
    "Abriendo pago...": "Opening payment...",
    "Permite abrir Stripe": "Allow Stripe popup",
    "Enviando...": "Sending...",
    "Preparando pago seguro...": "Preparing secure payment...",
    "Finaliza el pago en Stripe": "Complete payment in Stripe",
    "Pago verificado. Enviando pedido...": "Payment verified. Sending order...",
    "Enviando pedido...": "Sending order...",
    "Pedido ya enviado": "Order already sent",
    "Configura Stripe en Netlify": "Configure Stripe in Netlify",
    "Para comprobar pagos usa la pagina publicada en Netlify.": "To verify payments, use the published Netlify page.",
    "Permite ventanas emergentes para abrir Stripe": "Allow pop-ups to open Stripe",
    "No se pudo preparar Stripe": "Stripe could not be prepared",
    "Copiado": "Copied",
    "Copia manual": "Manual copy",
    "Enlace copiado": "Link copied",
    "Idioma": "Language",
    "Inicio incluye:": "Starter includes:",
    "Profesional incluye:": "Professional includes:",
    "Pagos incluye:": "Payments includes:",
    "Componentes: pagina principal y contacto": "Components: main page and contact",
    "Componentes: servicios, beneficios, contacto, mapa y WhatsApp": "Components: services, benefits, contact, map, and WhatsApp",
    "Imagen de header cargada": "Header image uploaded",
    "Imagen de header pendiente": "Header image pending",
    "footer cargado": "footer uploaded",
    "footer pendiente": "footer pending",
    "Imagenes de header/footer no incluidas": "Header/footer images not included",
    "Galeria no incluida en este paquete": "Gallery not included in this package",
    "Galeria no incluida": "Gallery not included",
    "Imagen cargada por el cliente": "Image uploaded by the client",
    "Entrega: Generica por nicho": "Delivery: Generic by niche",
    "Entrega: Premium +": "Delivery: Premium +",
    "Header: Simple limpio": "Header: Clean simple",
    "Header: Sticky profesional": "Header: Professional sticky",
    "Header: Premium +": "Header: Premium +",
    "Footer: Simple": "Footer: Simple",
    "Footer: Marca + contacto": "Footer: Brand + contact",
    "Footer: Premium +": "Footer: Premium +",
    "Foto principal cargada": "Main photo uploaded",
    "Foto principal pendiente": "Main photo pending",
    "Imagen de footer cargada": "Footer image uploaded",
    "Imagen de footer removida": "Footer image removed",
    "Imagen de header removida": "Header image removed",
    "Foto principal removida": "Main photo removed",
    "Galeria vacia": "Empty gallery",
    "Pagar ahora": "Pay now",
    "Contactar": "Contact",
    "Ver mapa": "View map",
    "Ver servicios": "View services",
    "Servicios principales": "Main services",
    "Secciones incluidas": "Included sections",
    "Servicio presentado como tarjeta de venta, con descripcion clara, enfoque de confianza y llamada directa.": "Service presented as a sales card, with a clear description, trust focus, and direct call to action.",
    "Contenido preparado segun el nicho y los datos enviados por el cliente.": "Content prepared according to the niche and the details sent by the client.",
    "Espacio para presentar experiencia, confianza, calidad de servicio y razones para contactar al negocio.": "Space to present experience, trust, service quality, and reasons to contact the business.",
    "Experiencia y profesionalismo": "Experience and professionalism",
    "Honestidad y transparencia": "Honesty and transparency",
    "Calidad garantizada": "Guaranteed quality",
    "Atencion personalizada": "Personalized attention",
    "Texto editable segun la informacion que envie el cliente.": "Editable text based on the information sent by the client.",
    "Boton o enlace conectado a la cuenta que el cliente administra.": "Button or link connected to the account the client manages.",
    "Telefono": "Phone",
    "Telefono publico pendiente": "Public phone pending",
    "WhatsApp pendiente": "WhatsApp pending",
    "Email publico pendiente": "Public email pending",
    "Direccion pendiente": "Address pending",
    "Horario": "Hours",
    "Horario pendiente": "Hours pending",
    "Mapa": "Map",
    "Mapa conectado": "Map connected",
    "Enlace de mapa pendiente": "Map link pending",
    "Mapa conectado con la ubicacion del cliente": "Map connected to the client's location",
    "Espacio para mapa de Google": "Space for Google Map",
    "Telefono pendiente": "Phone pending",
    "Tu vehiculo en las mejores manos": "Your vehicle in the best hands",
    "soporte mensual opcional": "optional monthly support"
  },
};

function normalizeI18nText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function storedLanguage() {
  try {
    return localStorage.getItem(languageStorageKey) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

let currentLanguage = storedLanguage();

function textForLanguage(text, language) {
  const normalized = normalizeI18nText(text);
  if (!normalized || language === "es") {
    return "";
  }
  return translations[language]?.[normalized] || "";
}

function preserveWhitespace(original, replacement) {
  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  return `${leading}${replacement}${trailing}`;
}

function translateTextNode(node, language) {
  const originalValue = originalTextNodes.get(node) || node.nodeValue;
  const normalized = normalizeI18nText(originalValue);
  if (!normalized) {
    return;
  }
  if (!originalTextNodes.has(node)) {
    originalTextNodes.set(node, node.nodeValue);
  }
  if (language === "es") {
    node.nodeValue = originalTextNodes.get(node);
    return;
  }
  const translated = textForLanguage(originalTextNodes.get(node), language);
  if (translated) {
    node.nodeValue = preserveWhitespace(originalTextNodes.get(node), translated);
  }
}

function originalAttribute(element, attribute) {
  let values = originalAttributeValues.get(element);
  if (!values) {
    values = {};
    originalAttributeValues.set(element, values);
  }
  if (!(attribute in values)) {
    values[attribute] = element.getAttribute(attribute);
  }
  return values[attribute] || "";
}

function translateAttribute(element, attribute, language) {
  if (!element.hasAttribute(attribute)) {
    return;
  }
  const original = originalAttribute(element, attribute);
  if (language === "es") {
    element.setAttribute(attribute, original);
    return;
  }
  const translated = textForLanguage(original, language);
  if (translated) {
    element.setAttribute(attribute, translated);
  }
}

function translateDefaultValues(language) {
  document.querySelectorAll("textarea").forEach((element) => {
    if (!originalInputValues.has(element)) {
      originalInputValues.set(element, element.value);
    }
    const original = originalInputValues.get(element);
    const translated = textForLanguage(original, "en");
    const current = normalizeI18nText(element.value);
    const isDefaultValue = current === normalizeI18nText(original) || current === normalizeI18nText(translated);
    if (!isDefaultValue) {
      return;
    }
    element.value = language === "en" && translated ? translated : original;
  });
}

function applyPublicBusinessLanguage(language) {
  const copy = language === "en"
    ? {
        legend: "Public business details",
        phone: "Public phone",
        email: "Public email",
        address: "Address",
        hours: "Business hours",
        map: "Map link",
        whatsapp: "Public WhatsApp",
        addressPlaceholder: "City, Puerto Rico",
        hoursPlaceholder: "Monday - Friday: 8am - 5pm",
      }
    : {
        legend: "Datos públicos del negocio",
        phone: "Teléfono público",
        email: "Email público",
        address: "Dirección",
        hours: "Horarios",
        map: "Enlace de mapa",
        whatsapp: "WhatsApp público",
        addressPlaceholder: "Ciudad, Puerto Rico",
        hoursPlaceholder: "Lunes - Viernes: 8am - 5pm",
      };

  const details = document.querySelector(".business-details");
  if (!details) return;

  details.querySelector("legend").textContent = copy.legend;
  document.querySelector("#businessPhone").closest("label").querySelector("span").textContent = copy.phone;
  document.querySelector("#businessEmail").closest("label").querySelector("span").textContent = copy.email;
  document.querySelector("#businessAddress").closest("label").querySelector("span").textContent = copy.address;
  document.querySelector("#businessHours").closest("label").querySelector("span").textContent = copy.hours;
  document.querySelector("#mapLink").closest("label").querySelector("span").textContent = copy.map;
  document.querySelector("#whatsappNumber").closest("label").querySelector("span").textContent = copy.whatsapp;
  document.querySelector("#businessAddress").placeholder = copy.addressPlaceholder;
  document.querySelector("#businessHours").placeholder = copy.hoursPlaceholder;
}

function translatePage(language = currentLanguage) {
  currentLanguage = language === "en" ? "en" : "es";
  document.documentElement.lang = currentLanguage;
  languageButtons.forEach((button) => {
    const isActive = button.dataset.language === currentLanguage;
    button.setAttribute("aria-pressed", String(isActive));
  });

  try {
    localStorage.setItem(languageStorageKey, currentLanguage);
  } catch {
    // Local storage can be unavailable in some browser privacy modes.
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return normalizeI18nText(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  nodes.forEach((node) => translateTextNode(node, currentLanguage));

  document.querySelectorAll("[placeholder], [aria-label], [alt], [title]").forEach((element) => {
    ["placeholder", "aria-label", "alt", "title"].forEach((attribute) => translateAttribute(element, attribute, currentLanguage));
  });
  translateDefaultValues(currentLanguage);
  applyPublicBusinessLanguage(currentLanguage);
}

function handleLanguageChange(event) {
  translatePage(event.currentTarget.dataset.language);
}

const demoPresets = {
  restaurante: {
    niche: "restaurante",
    package: "app",
    style: "vibrante",
    font: "moderna",
    deliveryTemplate: "standard",
    headerStyle: "sticky",
    footerStyle: "brand",
    headerCta: "payments",
    businessName: "Sabor Boricua",
    businessPhone: "(787) 555-0198",
    businessEmail: "hola@saborboricua.example",
    businessAddress: "San Juan, Puerto Rico",
    businessHours: "Lunes - Sabado: 11am - 8pm",
    mapLink: "https://maps.google.com/",
    whatsappNumber: "17875550198",
    primaryColor: "#1d7c5a",
    accentColor: "#d96b4c",
    footerTagline: "Comida criolla con sabor local",
    notes: "Demo de restaurante: menu claro, contacto, ubicacion y botones de pago si el cliente los solicita.",
    payments: ["stripe", "ath"],
    stripeLink: "https://buy.stripe.com/demo-restaurante",
    athDetails: "ATH Movil de negocio del restaurante",
  },
  auto: {
    niche: "automotriz",
    package: "app",
    style: "automotriz",
    font: "impacto",
    deliveryTemplate: "autoServiceReplica",
    headerStyle: "autoService",
    footerStyle: "autoService",
    headerCta: "phone",
    businessName: "Extreme Auto",
    businessPhone: "(787) 555-0140",
    businessEmail: "servicio@extremeauto.example",
    businessAddress: "Bayamon, Puerto Rico",
    businessHours: "Lunes - Viernes: 8am - 5pm | Sabado: 8am - 1pm",
    mapLink: "https://maps.google.com/",
    whatsappNumber: "17875550140",
    primaryColor: "#8dff00",
    accentColor: "#050505",
    footerTagline: "Tu vehiculo en las mejores manos",
    notes: "Demo Auto Service: estilo oscuro de alto impacto para taller, detailing o mecanica.",
    payments: ["ath"],
    stripeLink: "",
    athDetails: "ATH Movil de negocio del taller",
  },
  servicios: {
    niche: "servicios",
    package: "pagos",
    style: "elegante",
    font: "clasica",
    deliveryTemplate: "standard",
    headerStyle: "sticky",
    footerStyle: "brand",
    headerCta: "contact",
    businessName: "Consultoria Brillante",
    businessPhone: "(787) 555-0122",
    businessEmail: "hola@consultoriabrillante.example",
    businessAddress: "Caguas, Puerto Rico",
    businessHours: "Lunes - Viernes: 9am - 5pm",
    mapLink: "https://maps.google.com/",
    whatsappNumber: "17875550122",
    primaryColor: "#223a5e",
    accentColor: "#c99745",
    footerTagline: "Estrategia clara para crecer",
    notes: "Demo de servicios profesionales: confianza, servicios, casos, testimonios y cotizacion por contacto.",
    payments: [],
    stripeLink: "",
    athDetails: "",
  },
  tienda: {
    niche: "tienda",
    package: "app",
    style: "vibrante",
    font: "redondeada",
    deliveryTemplate: "standard",
    headerStyle: "sticky",
    footerStyle: "brand",
    headerCta: "payments",
    businessName: "Boutique Luna",
    businessPhone: "(787) 555-0188",
    businessEmail: "ventas@boutiqueluna.example",
    businessAddress: "Ponce, Puerto Rico",
    businessHours: "Martes - Domingo: 10am - 6pm",
    mapLink: "https://maps.google.com/",
    whatsappNumber: "17875550188",
    primaryColor: "#b8174c",
    accentColor: "#f0b429",
    footerTagline: "Estilo local para cada ocasion",
    notes: "Demo de tienda local: catalogo visual sin carrito online, contacto directo y boton de pago si aplica.",
    payments: ["stripe"],
    stripeLink: "https://buy.stripe.com/demo-tienda",
    athDetails: "",
  },
};

let heroImageUrl = "";
let headerImageUrl = "";
let footerImageUrl = "";
let galleryImageUrls = [];

function money(value) {
  const fractionDigits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "nuevo-negocio";
}

function ensureOrderId() {
  const orderIdInput = document.querySelector("#orderId");
  if (!orderIdInput.value) {
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    orderIdInput.value = `WF-${Date.now().toString(36).toUpperCase()}-${randomPart}`;
  }
  return orderIdInput.value;
}

function getPublicBusinessData() {
  return {
    phone: document.querySelector("#businessPhone").value.trim(),
    email: document.querySelector("#businessEmail").value.trim(),
    address: document.querySelector("#businessAddress").value.trim(),
    hours: document.querySelector("#businessHours").value.trim(),
    mapLink: document.querySelector("#mapLink").value.trim(),
    whatsapp: document.querySelector("#whatsappNumber").value.trim(),
  };
}

function getLayoutData() {
  const allowSocialLinks = currentRule().allowSocialLinks;
  return {
    deliveryTemplate: deliveryTemplateSelect.value,
    deliveryTemplateLabel: deliveryTemplates[deliveryTemplateSelect.value]?.label || "Generica por nicho",
    headerStyle: headerStyleSelect.value,
    headerStyleLabel: headerStyles[headerStyleSelect.value]?.label || "Simple limpio",
    headerCta: document.querySelector("#headerCta").value,
    headerCtaLabel: headerCtaLabels[document.querySelector("#headerCta").value] || "Contacto",
    footerStyle: footerStyleSelect.value,
    footerStyleLabel: footerStyles[footerStyleSelect.value]?.label || "Simple",
    footerTagline: document.querySelector("#footerTagline").value.trim(),
    headerImageAttached: Boolean(headerImageInput.files[0]),
    headerImageName: headerImageInput.files[0]?.name || "",
    footerImageAttached: Boolean(footerImageInput.files[0]),
    footerImageName: footerImageInput.files[0]?.name || "",
    facebookLink: allowSocialLinks ? document.querySelector("#facebookLink").value.trim() : "",
    instagramLink: allowSocialLinks ? document.querySelector("#instagramLink").value.trim() : "",
    showCredit: true,
  };
}

function getOrderData(summary = "") {
  const businessName = document.querySelector("#businessName").value.trim() || "Nuevo Negocio";
  const niche = niches[nicheSelect.value];
  const pack = packages[packageSelect.value];
  const style = visualStyles[styleSelect.value];
  const font = fontChoices[fontSelect.value];
  const payments = selectedPayments();
  const rule = currentRule();
  const publicBusiness = getPublicBusinessData();
  const layout = getLayoutData();
  const primaryColor = document.querySelector("#primaryColor").value;
  const accentColor = document.querySelector("#accentColor").value;

  return {
    orderId: ensureOrderId(),
    createdAt: new Date().toISOString(),
    client: {
      name: document.querySelector("#clientName").value.trim(),
      email: document.querySelector("#clientEmail").value.trim(),
      phone: document.querySelector("#clientPhone").value.trim(),
    },
    business: {
      name: businessName,
      slug: slugify(businessName),
      niche: niche.label,
      tagline: niche.tagline,
      sections: niche.sections,
      benefits: niche.benefits || [],
      public: publicBusiness,
      notes: document.querySelector("#notes").value.trim(),
    },
    package: {
      key: packageSelect.value,
      label: pack.label,
      price: pack.price,
      checkoutLink: selectedCheckoutLink(),
      maxGalleryImages: rule.maxGalleryImages,
      allowPaymentLinks: rule.allowPaymentLinks,
    },
    design: {
      visualStyle: style.label,
      font: font.label,
      fontStack: font.stack,
      primaryColor,
      accentColor,
      heroImageAttached: Boolean(heroImageInput.files[0]),
      galleryImageCount: galleryImageUrls.length,
    },
    layout,
    payments: {
      selected: payments.map((payment) => paymentLabels[payment]),
      noPaymentLinks: noPaymentsInput.checked || !rule.allowPaymentLinks,
      stripeLink: document.querySelector("#stripeLink").value.trim(),
      athDetails: document.querySelector("#athDetails").value.trim(),
    },
    extras: {
      supportMonthly: maintenanceInput.checked,
    },
    summary,
  };
}

function syncOrderHiddenFields(summary = "") {
  const data = getOrderData(summary);
  document.querySelector("#orderCreatedAt").value = data.createdAt;
  document.querySelector("#orderSummary").value = summary;
  document.querySelector("#orderJson").value = JSON.stringify(data, null, 2);
  document.querySelector("#checkoutLink").value = data.package.checkoutLink || "";
  return data;
}

function fillSelects() {
  Object.entries(niches).forEach(([value, item]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = item.label;
    nicheSelect.appendChild(option);
  });

  Object.entries(packages).forEach(([value, item]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = item.label;
    packageSelect.appendChild(option);
  });

  nicheSelect.value = "restaurante";
  packageSelect.value = "app";
  refreshAllowedSelect(styleSelect, visualStyles, currentRule().allowedStyles, "moderno");
  refreshAllowedSelect(fontSelect, fontChoices, currentRule().allowedFonts, "moderna");
  refreshAllowedSelect(deliveryTemplateSelect, deliveryTemplates, currentRule().allowedDeliveryTemplates, "autoServiceReplica");
  refreshAllowedSelect(headerStyleSelect, headerStyles, currentRule().allowedHeaderStyles, "sticky");
  refreshAllowedSelect(document.querySelector("#headerCta"), headerCtas, currentRule().allowedHeaderCtas, "phone");
  refreshAllowedSelect(footerStyleSelect, footerStyles, currentRule().allowedFooterStyles, "brand");
}

function currentRule() {
  return packageRules[packageSelect.value];
}

function allowedKeys(collection, allowed) {
  return allowed === "all" ? Object.keys(collection) : allowed;
}

function refreshAllowedSelect(select, collection, allowed, fallback) {
  const current = select.value;
  const keys = allowedKeys(collection, allowed);
  select.replaceChildren();
  keys.forEach((key) => {
    const item = collection[key];
    const option = document.createElement("option");
    option.value = key;
    option.textContent = item.label;
    select.appendChild(option);
  });
  select.value = keys.includes(current) ? current : (keys.includes(fallback) ? fallback : keys[0]);
}

function setFieldDisabled(id, disabled) {
  const field = document.querySelector(`#${id}`);
  if (!field) return;
  field.classList.toggle("is-disabled", disabled);
  field.querySelectorAll("input, select, textarea").forEach((input) => {
    input.disabled = disabled;
  });
}

function selectedPayments() {
  if (noPaymentsInput.checked) {
    return [];
  }

  return ["stripe", "ath"].filter((id) => document.querySelector(`#${id}`).checked);
}

function syncPaymentOptions() {
  const rule = currentRule();
  const forcedNoPayments = !rule.allowPaymentLinks;
  if (forcedNoPayments) {
    noPaymentsInput.checked = true;
    noPaymentsInput.dataset.forced = "true";
  } else if (noPaymentsInput.dataset.forced === "true") {
    noPaymentsInput.checked = false;
    document.querySelector("#stripe").checked = true;
    document.querySelector("#ath").checked = true;
    noPaymentsInput.dataset.forced = "";
  }

  noPaymentsInput.disabled = forcedNoPayments;
  const disabled = noPaymentsInput.checked || forcedNoPayments;
  document.querySelector("#paymentOptions").classList.toggle("is-disabled", forcedNoPayments);
  paymentMethodInputs.forEach((input) => {
    input.disabled = disabled;
    if (disabled) {
      input.checked = false;
    }
  });

  ["stripeLink", "athDetails"].forEach((id) => {
    document.querySelector(`#${id}`).disabled = disabled;
  });
  ["stripeLinkField", "athDetailsField"].forEach((id) => {
    document.querySelector(`#${id}`).classList.toggle("is-disabled", disabled);
  });
}

function applyPackageRules() {
  const rule = currentRule();
  refreshAllowedSelect(styleSelect, visualStyles, rule.allowedStyles, "moderno");
  refreshAllowedSelect(fontSelect, fontChoices, rule.allowedFonts, "moderna");
  refreshAllowedSelect(deliveryTemplateSelect, deliveryTemplates, rule.allowedDeliveryTemplates, "autoServiceReplica");
  refreshAllowedSelect(headerStyleSelect, headerStyles, rule.allowedHeaderStyles, "sticky");
  refreshAllowedSelect(document.querySelector("#headerCta"), headerCtas, rule.allowedHeaderCtas, "phone");
  refreshAllowedSelect(footerStyleSelect, footerStyles, rule.allowedFooterStyles, "brand");

  const style = visualStyles[styleSelect.value];
  if (!rule.allowCustomColors) {
    document.querySelector("#primaryColor").value = style.primary;
    document.querySelector("#accentColor").value = style.accent;
  }

  colorInputs.forEach((input) => {
    input.disabled = !rule.allowCustomColors;
  });
  document.querySelector("#colorOptions").classList.toggle("is-disabled", !rule.allowCustomColors);

  setFieldDisabled("heroImageField", !rule.allowHeroImage);
  if (!rule.allowHeroImage && heroImageUrl) {
    URL.revokeObjectURL(heroImageUrl);
    heroImageUrl = "";
    heroImageInput.value = "";
  }

  const galleryExcluded = rule.maxGalleryImages === 0;
  document.querySelector("#galleryImagesField").classList.toggle("is-excluded", galleryExcluded);
  document.querySelector("#galleryImagesLabel").textContent = rule.maxGalleryImages
    ? `Imagenes de contenido (maximo ${rule.maxGalleryImages})`
    : "Imagenes de contenido";
  galleryInput.disabled = galleryExcluded;
  if (galleryExcluded) {
    revokeUrls(galleryImageUrls);
    galleryImageUrls = [];
    galleryInput.value = "";
  } else if (galleryImageUrls.length > rule.maxGalleryImages) {
    revokeUrls(galleryImageUrls.slice(rule.maxGalleryImages));
    galleryImageUrls = galleryImageUrls.slice(0, rule.maxGalleryImages);
  }

  maintenanceInput.disabled = !rule.allowSupport;
  if (!rule.allowSupport) {
    maintenanceInput.checked = false;
  }

  ["headerImageField", "footerImageField"].forEach((id) => {
    setFieldDisabled(id, !rule.allowLayoutImages);
  });
  if (!rule.allowLayoutImages) {
    if (headerImageUrl) {
      URL.revokeObjectURL(headerImageUrl);
      headerImageUrl = "";
    }
    if (footerImageUrl) {
      URL.revokeObjectURL(footerImageUrl);
      footerImageUrl = "";
    }
    headerImageInput.value = "";
    footerImageInput.value = "";
  }

  ["facebookLink", "instagramLink"].forEach((id) => {
    document.querySelector(`#${id}`).disabled = !rule.allowSocialLinks;
  });

  document.querySelector("#packageRules").innerHTML = `
    <strong>${packages[packageSelect.value].label} incluye:</strong>
    <ul>${rule.included.map((item) => `<li>${item}</li>`).join("")}</ul>
  `;

  syncPaymentOptions();
}

function updatePreview() {
  applyPackageRules();
  const businessName = document.querySelector("#businessName").value.trim() || "Nuevo Negocio";
  const niche = niches[nicheSelect.value];
  const pack = packages[packageSelect.value];
  const style = visualStyles[styleSelect.value];
  const font = fontChoices[fontSelect.value];
  const payments = selectedPayments();
  const publicBusiness = getPublicBusinessData();
  const layout = getLayoutData();
  const maintenance = document.querySelector("#maintenance").checked;
  const primaryColor = document.querySelector("#primaryColor").value;
  const accentColor = document.querySelector("#accentColor").value;
  const stripeLink = document.querySelector("#stripeLink").value.trim();
  const athDetails = document.querySelector("#athDetails").value.trim();
  const price = pack.price;
  const timelineDays = packageSelect.value === "app" ? "3 dias" : niche.timeline;
  const monthly = maintenance ? `${money(pack.monthly)}/mes` : "$0";
  const sitePreview = document.querySelector("#sitePreview");
  const previewHero = document.querySelector("#previewHero");

  document.querySelector("#previewNiche").textContent = niche.label;
  document.querySelector("#previewTitle").textContent = businessName;
  document.querySelector("#previewTagline").textContent = niche.tagline;
  document.querySelector("#price").textContent = money(price);
  document.querySelector("#timeline").textContent = timelineDays;
  document.querySelector("#monthly").textContent = monthly;
  document.querySelector("#logoChip").textContent = businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "WF";

  sitePreview.dataset.style = styleSelect.value;
  sitePreview.dataset.palette = primaryColor.toLowerCase() === "#ffffff" && accentColor.toLowerCase() === "#000000"
    ? "mono"
    : "";
  sitePreview.style.setProperty("--preview-primary", primaryColor);
  sitePreview.style.setProperty("--preview-accent", accentColor);
  sitePreview.style.setProperty("--preview-font", font.stack);
  previewHero.classList.toggle("has-client-image", Boolean(heroImageUrl));
  if (heroImageUrl) {
    previewHero.style.backgroundImage = `linear-gradient(135deg, ${primaryColor}, ${accentColor}), url("${heroImageUrl}")`;
  } else {
    previewHero.style.backgroundImage = "";
  }

  const sectionList = document.querySelector("#sectionList");
  sectionList.replaceChildren();
  const displaySections = niche.sections.slice(0, currentRule().maxSections);
  displaySections.forEach((section) => {
    const item = document.createElement("li");
    item.textContent = section;
    sectionList.appendChild(item);
  });

  const paymentBadges = document.querySelector("#paymentBadges");
  paymentBadges.replaceChildren();
  if (payments.length === 0) {
    const badge = document.createElement("span");
    badge.textContent = currentRule().allowPaymentLinks
      ? (noPaymentsInput.checked ? "Sin enlaces de pago" : "Sin pagos seleccionados")
      : "Pagos no incluidos";
    paymentBadges.appendChild(badge);
  } else {
    payments.forEach((payment) => {
      const badge = document.createElement("span");
      const configured =
        (payment === "stripe" && stripeLink) ||
        (payment === "ath" && athDetails);
      badge.textContent = `${paymentLabels[payment]}${configured ? " listo" : " pendiente"}`;
      paymentBadges.appendChild(badge);
    });
  }

  const imageStrip = document.querySelector("#imageStrip");
  imageStrip.replaceChildren();
  const maxGalleryImages = currentRule().maxGalleryImages;
  const imagesToShow = galleryImageUrls.slice(0, maxGalleryImages);
  const componentsText = currentRule().maxSections === 1
    ? "Componentes: pagina principal y contacto"
    : "Componentes: servicios, beneficios, contacto, mapa y WhatsApp";
  const layoutImagesText = currentRule().allowLayoutImages
    ? `${headerImageUrl ? "Imagen de header cargada" : "Imagen de header pendiente"} / ${footerImageUrl ? "footer cargado" : "footer pendiente"}`
    : "Imagenes de header/footer no incluidas";
  if (imagesToShow.length === 0) {
    const empty = document.createElement("span");
    empty.className = "empty-image";
    empty.textContent = maxGalleryImages ? "Sin imagenes cargadas" : "Galeria no incluida en este paquete";
    imageStrip.appendChild(empty);
  } else {
    imagesToShow.forEach((src) => {
      const image = document.createElement("img");
      image.src = src;
      image.alt = "Imagen cargada por el cliente";
      imageStrip.appendChild(image);
    });
  }

  const styleSummary = document.querySelector("#styleSummary");
  styleSummary.replaceChildren();
  [
    { text: `${style.label}: ${style.description}` },
    { text: `${font.label}: ${font.description}` },
    { text: `Entrega: ${layout.deliveryTemplateLabel}` },
    { text: `Header: ${layout.headerStyleLabel}` },
    { text: `Footer: ${layout.footerStyleLabel}` },
    { text: componentsText },
    { text: `Color principal ${primaryColor}`, color: primaryColor },
    { text: `Color acento ${accentColor}`, color: accentColor },
    { text: `${heroImageUrl ? "Foto principal cargada" : "Foto principal pendiente"}` },
    { text: layoutImagesText },
    { text: maxGalleryImages ? `${galleryImageUrls.length} de ${maxGalleryImages} imagenes de contenido` : "Galeria no incluida" },
  ].forEach((summaryItem) => {
    const item = document.createElement("span");
    item.className = "style-pill";
    if (summaryItem.color) {
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = summaryItem.color;
      item.appendChild(swatch);
    }
    item.append(document.createTextNode(summaryItem.text));
    styleSummary.appendChild(item);
  });

  const extras = [
    maintenance ? "soporte mensual opcional" : null,
  ].filter(Boolean);
  const translateInline = (text) => currentLanguage === "en"
    ? textForLanguage(text, "en") || text
    : text;
  const lowerInline = (text) => translateInline(text).toLowerCase();

  const paymentText = payments.length
    ? payments.map((payment) => paymentLabels[payment]).join(", ")
    : !currentRule().allowPaymentLinks
      ? "sin enlaces de pago porque este paquete no los incluye"
      : noPaymentsInput.checked
      ? "sin enlaces de pago por preferencia del cliente"
      : "sin pagos enlazados";
  const layoutImageClause = currentRule().allowLayoutImages
    ? `, ${headerImageUrl ? "imagen de header cargada" : "imagen de header pendiente"}, ${footerImageUrl ? "imagen de footer cargada" : "imagen de footer pendiente"}`
    : "";
  const imageText = `${heroImageUrl ? "foto principal cargada" : "foto principal pendiente"}${layoutImageClause} y ${galleryImageUrls.length} imagenes de contenido`;
  const paymentClause = currentRule().allowPaymentLinks
    ? "Los pagos quedan vinculados a cuentas del cliente mediante enlaces o botones que el cliente administrara aparte."
    : "Este paquete no incluye enlaces de pago; se puede subir al paquete Pagos si el cliente los necesita.";
  const includedText = displaySections.slice(0, 3).join(", ");
  const contactText = [publicBusiness.phone, publicBusiness.email, publicBusiness.address, publicBusiness.hours]
    .filter(Boolean)
    .join(" | ");
  const contactClause = contactText
    ? ` Datos publicos: ${contactText}.`
    : " Datos publicos pendientes para completar contacto, mapa y WhatsApp.";
  const layoutClause = ` Plantilla de entrega ${layout.deliveryTemplateLabel.toLowerCase()}, header ${layout.headerStyleLabel.toLowerCase()} con boton "${layout.headerCtaLabel}" y footer ${layout.footerStyleLabel.toLowerCase()}.`;
  const extrasClause = extras.length ? ` Incluye ${extras.join(", ")}.` : "";
  const englishPaymentText = payments.length
    ? payments.map((payment) => translateInline(paymentLabels[payment])).join(", ")
    : !currentRule().allowPaymentLinks
      ? "no payment links because this package does not include them"
      : noPaymentsInput.checked
      ? "no payment links by client preference"
      : "no linked payments";
  const englishLayoutImageClause = currentRule().allowLayoutImages
    ? `, ${headerImageUrl ? "header image uploaded" : "header image pending"}, ${footerImageUrl ? "footer image uploaded" : "footer image pending"}`
    : "";
  const englishImageText = `${heroImageUrl ? "main photo uploaded" : "main photo pending"}${englishLayoutImageClause} and ${galleryImageUrls.length} content images`;
  const englishPaymentClause = currentRule().allowPaymentLinks
    ? "Payments are linked to client-owned accounts through links or buttons the client manages separately."
    : "This package does not include payment links; the client can upgrade to the Payments package if needed.";
  const englishIncludedText = displaySections.slice(0, 3).map(translateInline).join(", ");
  const englishContactClause = contactText
    ? ` Public details: ${contactText}.`
    : " Public details pending to complete contact, map, and WhatsApp.";
  const englishLayoutClause = ` Delivery template ${lowerInline(layout.deliveryTemplateLabel)}, header ${lowerInline(layout.headerStyleLabel)} with "${translateInline(layout.headerCtaLabel)}" button, and footer ${lowerInline(layout.footerStyleLabel)}.`;
  const englishExtrasClause = extras.length ? ` Includes ${extras.map(translateInline).join(", ")}.` : "";
  const spanishSummary = `${businessName} recibira una pagina ${pack.label.toLowerCase()} para ${niche.label.toLowerCase()} con estilo ${style.label.toLowerCase()}, fuente ${font.label.toLowerCase()}, colores ${primaryColor} y ${accentColor}, ${imageText}, y ${paymentText}. ${paymentClause} Incluye ${includedText}, beneficios y contacto completo.${extrasClause}${layoutClause}${contactClause} Precio sugerido: ${money(price)}. Entrega estimada: ${timelineDays}.`;
  const englishSummary = `${businessName} will receive a ${lowerInline(pack.label)} page for ${lowerInline(niche.label)} with ${lowerInline(style.label)} style, ${lowerInline(font.label)} font, colors ${primaryColor} and ${accentColor}, ${englishImageText}, and ${englishPaymentText}. ${englishPaymentClause} Includes ${englishIncludedText}, benefits, and complete contact.${englishExtrasClause}${englishLayoutClause}${englishContactClause} Suggested price: ${money(price)}. Estimated delivery: ${timelineDays}.`;
  const summary = currentLanguage === "en" ? englishSummary : spanishSummary;
  document.querySelector("#proposalText").textContent = summary;
  syncOrderHiddenFields(summary);

  updateScreenshotPreview({
    businessName,
    niche,
    pack,
    style,
    font,
    payments,
    primaryColor,
    accentColor,
    heroImageUrl,
    headerImageUrl,
    footerImageUrl,
    imagesToShow,
    maxGalleryImages,
    displaySections,
    paymentText,
    timelineDays,
    publicBusiness,
    layout,
    styleKey: styleSelect.value,
  });

  if (currentLanguage === "en") {
    translatePage(currentLanguage);
  }

  return summary;
}

function createShotCard(title, body) {
  const card = document.createElement("article");
  card.className = "shot-card";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const text = document.createElement("p");
  text.textContent = body;
  card.append(heading, text);
  return card;
}

function createShotPayment(title, body) {
  const card = document.createElement("article");
  card.className = "shot-payment";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const text = document.createElement("p");
  text.textContent = body;
  card.append(heading, text);
  return card;
}

function createShotBenefit(label, index) {
  const item = document.createElement("div");
  item.className = "shot-benefit";
  const badge = document.createElement("span");
  badge.textContent = String(index + 1).padStart(2, "0");
  const text = document.createElement("strong");
  text.textContent = label;
  item.append(badge, text);
  return item;
}

function updateScreenshotPreview(state) {
  const page = document.querySelector("#screenshotPage");
  const hero = document.querySelector("#shotHero");
  page.dataset.style = state.styleKey;
  page.dataset.template = state.layout.deliveryTemplate;
  page.dataset.header = state.layout.headerStyle;
  page.dataset.footer = state.layout.footerStyle;
  page.style.setProperty("--shot-primary", state.primaryColor);
  page.style.setProperty("--shot-accent", state.accentColor);
  page.style.setProperty("--shot-font", state.font.stack);

  document.querySelector("#screenshotUrl").textContent = `demo.webfactory.local/${slugify(state.businessName)}`;
  document.querySelector("#shotBrand").textContent = state.businessName;
  document.querySelector("#shotFooterBrand").textContent = state.businessName;
  document.querySelector("#shotFooterTagline").textContent =
    state.layout.footerTagline || "Calidad, confianza y compromiso";
  document.querySelector("#shotNiche").textContent = state.niche.label;
  document.querySelector("#shotHeadline").textContent = state.niche.tagline;
  document.querySelector("#shotDescription").textContent = `${state.pack.label} con estilo ${state.style.label.toLowerCase()}, fuente ${state.font.label.toLowerCase()} y entrega estimada de ${state.timelineDays}.`;
  document.querySelector("#shotPackage").textContent = `Paquete ${state.pack.label} - ${money(state.pack.price)}`;
  document.querySelector("#shotPrimaryCta").textContent = state.payments.length ? "Pagar ahora" : "Contactar";
  document.querySelector("#shotSecondaryCta").textContent = state.publicBusiness.mapLink ? "Ver mapa" : "Ver servicios";
  document.querySelector("#shotHeaderCta").textContent = state.layout.headerCtaLabel;
  document.querySelector("#shotSectionsTitle").textContent =
    state.layout.deliveryTemplate === "autoServiceReplica" ? "Servicios principales" : "Secciones incluidas";

  const shotHeaderImage = document.querySelector("#shotHeaderImage");
  shotHeaderImage.hidden = !state.headerImageUrl;
  shotHeaderImage.src = state.headerImageUrl || "";

  const shotFooterImage = document.querySelector("#shotFooterImage");
  shotFooterImage.hidden = !state.footerImageUrl;
  shotFooterImage.src = state.footerImageUrl || "";
  const shotFooter = document.querySelector(".shot-footer");
  shotFooter.classList.toggle("has-layout-image", Boolean(state.footerImageUrl));
  shotFooter.style.backgroundImage = state.footerImageUrl
    ? `linear-gradient(90deg, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0.9)), url("${state.footerImageUrl}")`
    : "";

  const shotNav = document.querySelector(".shot-nav nav");
  shotNav.replaceChildren();
  ["Inicio", "Servicios", "Nosotros", "Contacto"].forEach((item) => {
    const link = document.createElement("span");
    link.textContent = item;
    shotNav.appendChild(link);
  });

  hero.classList.toggle("has-image", Boolean(state.heroImageUrl));
  hero.style.backgroundImage = state.heroImageUrl
    ? `linear-gradient(135deg, ${state.primaryColor}, ${state.accentColor}), url("${state.heroImageUrl}")`
    : "";

  const shotSections = document.querySelector("#shotSections");
  shotSections.replaceChildren();
  state.displaySections.forEach((section) => {
    const body = state.layout.deliveryTemplate === "autoServiceReplica"
      ? "Servicio presentado como tarjeta de venta, con descripcion clara, enfoque de confianza y llamada directa."
      : "Contenido preparado segun el nicho y los datos enviados por el cliente.";
    shotSections.appendChild(createShotCard(section, body));
  });

  const shotWhyBlock = document.querySelector("#shotWhyBlock");
  const shotWhyList = document.querySelector("#shotWhyList");
  shotWhyBlock.hidden = state.displaySections.length <= 1;
  shotWhyList.replaceChildren();
  document.querySelector("#shotWhyTitle").textContent =
    state.layout.deliveryTemplate === "autoServiceReplica"
      ? `Por que escoger ${state.businessName}`
      : "Por que escoger este negocio";
  document.querySelector("#shotWhyText").textContent =
    "Espacio para presentar experiencia, confianza, calidad de servicio y razones para contactar al negocio.";
  [
    "Experiencia y profesionalismo",
    "Honestidad y transparencia",
    "Calidad garantizada",
    "Atencion personalizada",
  ].forEach((item) => {
    shotWhyList.appendChild(createShotPayment(item, "Texto editable segun la informacion que envie el cliente."));
  });

  const shotBenefits = document.querySelector("#shotBenefits");
  shotBenefits.replaceChildren();
  shotBenefits.hidden = state.displaySections.length <= 1;
  const benefits = state.niche.benefits || ["Servicio claro", "Entrega rapida", "Contacto directo", "Marca profesional"];
  if (!shotBenefits.hidden) {
    benefits.slice(0, 4).forEach((benefit, index) => {
      shotBenefits.appendChild(createShotBenefit(benefit, index));
    });
  }

  const shotGallery = document.querySelector("#shotGallery");
  shotGallery.replaceChildren();
  document.querySelector("#shotGalleryBlock").classList.toggle("is-excluded", state.maxGalleryImages === 0);
  if (state.maxGalleryImages > 0 && state.imagesToShow.length === 0) {
    const placeholder = document.createElement("div");
    placeholder.className = "shot-placeholder";
    placeholder.textContent = `Espacio para hasta ${state.maxGalleryImages} imagenes del cliente`;
    shotGallery.appendChild(placeholder);
  } else {
    state.imagesToShow.forEach((src, index) => {
      const image = document.createElement("img");
      image.src = src;
      image.alt = `Imagen ${index + 1} del preview`;
      shotGallery.appendChild(image);
    });
  }

  const shotPayments = document.querySelector("#shotPayments");
  const shotPaymentsBlock = document.querySelector("#shotPaymentsBlock");
  shotPayments.replaceChildren();
  shotPaymentsBlock.hidden = state.payments.length === 0;
  shotPaymentsBlock.classList.toggle("is-excluded", state.payments.length === 0);
  if (state.payments.length > 0) {
    state.payments.forEach((payment) => {
      shotPayments.appendChild(createShotPayment(paymentLabels[payment], "Boton o enlace conectado a la cuenta que el cliente administra."));
    });
  }

  const shotContact = document.querySelector("#shotContact");
  shotContact.replaceChildren();
  [
    ["Telefono", state.publicBusiness.phone || "Telefono publico pendiente"],
    ["WhatsApp", state.publicBusiness.whatsapp || state.publicBusiness.phone || "WhatsApp pendiente"],
    ["Email", state.publicBusiness.email || "Email publico pendiente"],
    ["Direccion", state.publicBusiness.address || "Direccion pendiente"],
    ["Horario", state.publicBusiness.hours || "Horario pendiente"],
    ["Mapa", state.publicBusiness.mapLink ? "Mapa conectado" : "Enlace de mapa pendiente"],
  ].forEach(([title, body]) => {
    shotContact.appendChild(createShotPayment(title, body));
  });

  const shotMapBox = document.querySelector("#shotMapBox");
  shotMapBox.textContent = state.publicBusiness.mapLink
    ? "Mapa conectado con la ubicacion del cliente"
    : "Espacio para mapa de Google";

  document.querySelector("#shotWhatsapp").hidden = !(state.publicBusiness.whatsapp || state.publicBusiness.phone);

  const shotFooterMeta = document.querySelector("#shotFooterMeta");
  shotFooterMeta.replaceChildren();
  [
    state.publicBusiness.phone || "Telefono pendiente",
    state.publicBusiness.hours || "Horario pendiente",
    state.layout.facebookLink ? "Facebook" : null,
    state.layout.instagramLink ? "Instagram" : null,
    "WebFactory PR",
  ].filter(Boolean).forEach((item) => {
    const span = document.createElement("span");
    span.textContent = item;
    shotFooterMeta.appendChild(span);
  });
}

function openScreenshotPreview() {
  screenshotReturnFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : screenshotButton;
  screenshotScrollPosition = {
    x: window.scrollX,
    y: window.scrollY,
  };
  updatePreview();
  screenshotModal.hidden = false;
  document.body.style.overflow = "hidden";
  screenshotClose.focus({ preventScroll: true });
}

function closeScreenshotPreview() {
  screenshotModal.hidden = true;
  document.body.style.overflow = "";
  window.scrollTo(screenshotScrollPosition.x, screenshotScrollPosition.y);
  if (screenshotReturnFocus) {
    screenshotReturnFocus.focus({ preventScroll: true });
  }
}

function setSelectIfAvailable(select, value) {
  if ([...select.options].some((option) => option.value === value)) {
    select.value = value;
  }
}

function resetDemoImages() {
  [heroImageUrl, headerImageUrl, footerImageUrl, ...galleryImageUrls].forEach((url) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  });
  heroImageUrl = "";
  headerImageUrl = "";
  footerImageUrl = "";
  galleryImageUrls = [];
  heroImageInput.value = "";
  headerImageInput.value = "";
  footerImageInput.value = "";
  galleryInput.value = "";
}

function applyDemoPreset(key) {
  const preset = demoPresets[key];
  if (!preset) return;

  resetDemoImages();
  nicheSelect.value = preset.niche;
  packageSelect.value = preset.package;
  applyPackageRules();

  setSelectIfAvailable(styleSelect, preset.style);
  setSelectIfAvailable(fontSelect, preset.font);
  setSelectIfAvailable(deliveryTemplateSelect, preset.deliveryTemplate);
  setSelectIfAvailable(headerStyleSelect, preset.headerStyle);
  setSelectIfAvailable(footerStyleSelect, preset.footerStyle);
  setSelectIfAvailable(document.querySelector("#headerCta"), preset.headerCta);

  document.querySelector("#businessName").value = preset.businessName;
  document.querySelector("#businessPhone").value = preset.businessPhone;
  document.querySelector("#businessEmail").value = preset.businessEmail;
  document.querySelector("#businessAddress").value = preset.businessAddress;
  document.querySelector("#businessHours").value = preset.businessHours;
  document.querySelector("#mapLink").value = preset.mapLink;
  document.querySelector("#whatsappNumber").value = preset.whatsappNumber;
  document.querySelector("#primaryColor").value = preset.primaryColor;
  document.querySelector("#accentColor").value = preset.accentColor;
  document.querySelector("#footerTagline").value = preset.footerTagline;
  document.querySelector("#notes").value = preset.notes;
  document.querySelector("#stripeLink").value = preset.stripeLink;
  document.querySelector("#athDetails").value = preset.athDetails;

  const allowPayments = currentRule().allowPaymentLinks;
  noPaymentsInput.checked = !allowPayments || preset.payments.length === 0;
  if (allowPayments) {
    noPaymentsInput.dataset.forced = "";
  }
  paymentMethodInputs.forEach((input) => {
    input.checked = allowPayments && preset.payments.includes(input.id);
  });
  syncPaymentOptions();
  updatePreview();
}

function openDemoPreset(card) {
  applyDemoPreset(card.dataset.demoKey);
  openScreenshotPreview();
}

function revokeUrls(urls) {
  urls.forEach((url) => URL.revokeObjectURL(url));
}

function handleHeroImage() {
  if (heroImageUrl) {
    URL.revokeObjectURL(heroImageUrl);
  }
  const file = heroImageInput.files[0];
  heroImageUrl = file ? URL.createObjectURL(file) : "";
  updatePreview();
  pulseStatus(file ? "Foto principal cargada" : "Foto principal removida");
}

function handleHeaderImage() {
  if (headerImageUrl) {
    URL.revokeObjectURL(headerImageUrl);
  }
  const file = headerImageInput.files[0];
  headerImageUrl = file ? URL.createObjectURL(file) : "";
  updatePreview();
  pulseStatus(file ? "Imagen de header cargada" : "Imagen de header removida");
}

function handleFooterImage() {
  if (footerImageUrl) {
    URL.revokeObjectURL(footerImageUrl);
  }
  const file = footerImageInput.files[0];
  footerImageUrl = file ? URL.createObjectURL(file) : "";
  updatePreview();
  pulseStatus(file ? "Imagen de footer cargada" : "Imagen de footer removida");
}

function handleGalleryImages() {
  revokeUrls(galleryImageUrls);
  const maxImages = currentRule().maxGalleryImages;
  galleryImageUrls = Array.from(galleryInput.files)
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, maxImages)
    .map((file) => URL.createObjectURL(file));
  updatePreview();
  pulseStatus(galleryImageUrls.length ? `Imagenes cargadas (${galleryImageUrls.length}/${maxImages})` : "Galeria vacia");
}

function applyStyleDefaults() {
  const style = visualStyles[styleSelect.value];
  document.querySelector("#primaryColor").value = style.primary;
  document.querySelector("#accentColor").value = style.accent;
  updatePreview();
}

function handleNicheChange() {
  const allowedStyles = allowedKeys(visualStyles, currentRule().allowedStyles);
  if (nicheSelect.value === "automotriz" && allowedStyles.includes("automotriz")) {
    styleSelect.value = "automotriz";
    if (allowedKeys(deliveryTemplates, currentRule().allowedDeliveryTemplates).includes("autoServiceReplica")) {
      deliveryTemplateSelect.value = "autoServiceReplica";
    }
    if (allowedKeys(headerStyles, currentRule().allowedHeaderStyles).includes("autoService")) {
      headerStyleSelect.value = "autoService";
    }
    if (allowedKeys(footerStyles, currentRule().allowedFooterStyles).includes("autoService")) {
      footerStyleSelect.value = "autoService";
    }
    if (!document.querySelector("#footerTagline").value.trim()) {
      document.querySelector("#footerTagline").value = "Tu vehiculo en las mejores manos";
    }
    applyStyleDefaults();
    return;
  }

  updatePreview();
}

function handlePackageChange() {
  const rule = currentRule();
  if (packageSelect.value === "app" && allowedKeys(deliveryTemplates, rule.allowedDeliveryTemplates).includes("autoServiceReplica")) {
    deliveryTemplateSelect.value = "autoServiceReplica";
    if (allowedKeys(headerStyles, rule.allowedHeaderStyles).includes("autoService")) {
      headerStyleSelect.value = "autoService";
    }
    if (allowedKeys(footerStyles, rule.allowedFooterStyles).includes("autoService")) {
      footerStyleSelect.value = "autoService";
    }
  }
  updatePreview();
}

function pulseStatus(message) {
  const status = document.querySelector("#previewStatus");
  status.textContent = message;
  window.setTimeout(() => {
    status.textContent = "Demo listo";
  }, 1600);
}

function copyExternalLink(button) {
  const link = button.dataset.copyLink;
  if (!link) return;
  const label = button.textContent;
  const markCopied = () => {
    button.textContent = "Copiado";
    pulseStatus("Enlace copiado");
    window.setTimeout(() => {
      button.textContent = label;
    }, 1400);
  };
  const markManual = () => {
    button.textContent = "Copia manual";
    window.setTimeout(() => {
      button.textContent = label;
    }, 1400);
  };

  if (!navigator.clipboard) {
    const helper = document.createElement("textarea");
    helper.value = link;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    copied ? markCopied() : markManual();
    return;
  }

  navigator.clipboard
    .writeText(link)
    .then(markCopied)
    .catch(markManual);
}

function selectedCheckoutLink() {
  return packageCheckoutLinks[packageSelect.value] || "";
}

function uiText(text) {
  return currentLanguage === "en" ? textForLanguage(text, "en") || text : text;
}

function setSubmitButtonText(text) {
  submitOrderButton.textContent = uiText(text);
}

function readStoredJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function rememberPendingCheckout(orderData, sessionId = "") {
  try {
    localStorage.setItem(
      pendingCheckoutStorageKey,
      JSON.stringify({
        orderId: orderData.orderId,
        packageId: packageSelect.value,
        sessionId,
        createdAt: new Date().toISOString(),
      })
    );
  } catch {
    // The checkout still works if storage is unavailable, but automatic return cannot.
  }
}

function markSubmittedOrder(orderId) {
  try {
    localStorage.setItem(submittedOrderStorageKey, orderId);
  } catch {
    // Ignore storage failures; the current form submit will still continue.
  }
}

function submittedOrderId() {
  try {
    return localStorage.getItem(submittedOrderStorageKey) || "";
  } catch {
    return "";
  }
}

async function createCheckoutSession(orderData) {
  const response = await fetch("/.netlify/functions/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      packageId: packageSelect.value,
      orderData,
    }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok || !result.checkoutUrl) {
    throw new Error(result.message || "No se pudo preparar Stripe");
  }

  return result;
}

async function beginVerifiedCheckout(orderData) {
  if (window.location.protocol === "file:") {
    throw new Error("Para comprobar pagos usa la pagina publicada en Netlify.");
  }

  const checkoutWindow = window.open("about:blank", "_blank");
  if (!checkoutWindow) {
    throw new Error("Permite ventanas emergentes para abrir Stripe");
  }

  checkoutWindow.opener = null;
  setSubmitButtonText("Preparando pago seguro...");
  checkoutWindow.document.title = "Stripe | WebFactory PR";
  checkoutWindow.document.body.innerHTML = "<p style=\"font-family:system-ui;padding:24px\">Preparando pago seguro...</p>";

  try {
    const checkout = await createCheckoutSession(orderData);
    rememberPendingCheckout(orderData, checkout.sessionId);
    document.querySelector("#stripeSessionId").value = checkout.sessionId || "";
    document.querySelector("#paymentStatus").value = "pending";
    checkoutWindow.location.href = checkout.checkoutUrl;
    setSubmitButtonText("Finaliza el pago en Stripe");
    pulseStatus("Finaliza el pago en Stripe");
  } catch (error) {
    checkoutWindow.close();
    throw error;
  }
}

function submitVerifiedOrder(paymentData) {
  const orderId = paymentData.orderId || document.querySelector("#orderId").value;
  if (!orderId || submittedOrderId() === orderId) {
    setSubmitButtonText("Pedido ya enviado");
    pulseStatus("Pedido ya enviado");
    return;
  }

  document.querySelector("#stripeSessionId").value = paymentData.sessionId || "";
  document.querySelector("#paymentStatus").value = paymentData.paymentStatus || "paid";
  form.dataset.paymentVerified = "true";
  submittingVerifiedOrder = true;
  markSubmittedOrder(orderId);
  setSubmitButtonText("Pago verificado. Enviando pedido...");
  pulseStatus("Pago verificado. Enviando pedido...");
  form.submit();
}

function handleVerifiedCheckoutMessage(paymentData) {
  if (!paymentData || !paymentData.paid) return;

  const currentOrderId = document.querySelector("#orderId").value;
  if (paymentData.orderId && currentOrderId && paymentData.orderId !== currentOrderId) {
    return;
  }

  submitVerifiedOrder(paymentData);
}

function handleOrderSubmit(event) {
  if (submittingVerifiedOrder || form.dataset.paymentVerified === "true") {
    setSubmitButtonText("Enviando pedido...");
    return;
  }

  event.preventDefault();

  const currentOrderId = document.querySelector("#orderId").value;
  if (currentOrderId && submittedOrderId() === currentOrderId) {
    setSubmitButtonText("Pedido ya enviado");
    pulseStatus("Pedido ya enviado");
    return;
  }

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const summary = updatePreview();
  const orderData = syncOrderHiddenFields(summary);

  beginVerifiedCheckout(orderData).catch((error) => {
    const message = error.message || "No se pudo preparar Stripe";
    setSubmitButtonText(message.includes("Netlify") ? "Configura Stripe en Netlify" : "No se pudo preparar Stripe");
    pulseStatus(message);
  });
}

function selectDemoCard(card) {
  document.querySelectorAll("[data-demo-card]").forEach((item) => {
    item.classList.toggle("is-selected", item === card);
  });
}

fillSelects();
updatePreview();
translatePage(currentLanguage);

document.querySelectorAll("[data-demo-card]").forEach((card) => {
  card.addEventListener("click", (event) => {
    selectDemoCard(card);
    event.preventDefault();
    openDemoPreset(card);
  });
  card.addEventListener("focus", () => selectDemoCard(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDemoCard(card);
      openDemoPreset(card);
    }
  });
});

form.addEventListener("input", updatePreview);
form.addEventListener("submit", handleOrderSubmit);
window.addEventListener("storage", (event) => {
  if (event.key === paidCheckoutStorageKey && event.newValue) {
    handleVerifiedCheckoutMessage(readStoredJson(paidCheckoutStorageKey));
  }
});
nicheSelect.addEventListener("change", handleNicheChange);
packageSelect.addEventListener("change", handlePackageChange);
styleSelect.addEventListener("change", applyStyleDefaults);
fontSelect.addEventListener("change", updatePreview);
deliveryTemplateSelect.addEventListener("change", updatePreview);
noPaymentsInput.addEventListener("change", updatePreview);
heroImageInput.addEventListener("change", handleHeroImage);
headerImageInput.addEventListener("change", handleHeaderImage);
footerImageInput.addEventListener("change", handleFooterImage);
galleryInput.addEventListener("change", handleGalleryImages);
screenshotButton.addEventListener("click", openScreenshotPreview);
screenshotClose.addEventListener("click", closeScreenshotPreview);
screenshotModal.addEventListener("click", (event) => {
  if (event.target === screenshotModal) {
    closeScreenshotPreview();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !screenshotModal.hidden) {
    closeScreenshotPreview();
  }
});
document.querySelectorAll("[data-copy-link]").forEach((button) => {
  button.addEventListener("click", () => copyExternalLink(button));
});
languageButtons.forEach((button) => {
  button.addEventListener("click", handleLanguageChange);
});

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The page still works if the browser blocks service workers.
    });
  });
}

