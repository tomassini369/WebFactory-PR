import type { DemoConfig, DemoItem } from './demoData'

export type DemoLanguage = 'es' | 'en'

type LocalizedItem = Pick<DemoItem, 'name' | 'description'> & {
  displayPrice?: string
  badge?: string
}

type LocalizedDemo = {
  category: string
  kicker: string
  headline: string
  description: string
  hours: string
  features: string[]
  bookingLabel: string
  aboutTitle: string
  aboutText: string
  trust: string[]
  items: LocalizedItem[]
  employeeRoles: string[]
}

const localizedDemos: Record<string, Record<DemoLanguage, LocalizedDemo>> = {
  'brisa-cocina': {
    es: {
      category: 'Restaurante', kicker: 'COCINA COSTERA · SAN JUAN', headline: 'Sabores del Caribe, servidos con calma.',
      description: 'Una experiencia gastronómica contemporánea con pedidos en línea, platos destacados y reservaciones para cena.',
      hours: 'Mar–Dom · 12 PM–10 PM', features: ['Pedidos en línea', 'Reservas de mesa', 'Catálogo del menú', 'ATH Móvil'],
      bookingLabel: 'Reservar mesa', aboutTitle: 'Cocina contemporánea con raíces locales.',
      aboutText: 'Este demo combina catálogo del menú, pedidos, carrito, horarios y reservaciones para mostrar cómo un restaurante puede centralizar su experiencia digital.',
      trust: ['Fresco todos los días', 'Pago seguro', 'Pedidos móviles'], employeeRoles: [],
      items: [
        {name:'Pollo frito con papas fritas',description:'Pollo frito crujiente servido con papas fritas doradas, exactamente como se muestra en la imagen.',badge:'Favorito del chef'},
        {name:'Bowl de vegetales frescos',description:'Bowl con vegetales verdes y coliflor, presentado de forma fresca y ligera como en la imagen.',badge:'Fresco'},
        {name:'Tarta de chocolate con crema',description:'Postre individual de chocolate servido en plato con crema y presentación gourmet.',badge:'Postre'},
        {name:'Reserva de mesa',description:'Reserva una mesa en un comedor preparado para servicio de restaurante como el mostrado en la imagen.',displayPrice:'Reserva gratis'},
      ],
    },
    en: {
      category: 'Restaurant', kicker: 'COASTAL CUISINE · SAN JUAN', headline: 'Caribbean flavors, served at an easy pace.',
      description: 'A contemporary dining experience with online ordering, featured dishes, and dinner reservations.',
      hours: 'Tue–Sun · 12 PM–10 PM', features: ['Online ordering', 'Table reservations', 'Menu catalog', 'ATH Móvil'],
      bookingLabel: 'Reserve a table', aboutTitle: 'Contemporary cuisine with local roots.',
      aboutText: 'This demo combines a menu catalog, ordering, cart, hours, and reservations to show how a restaurant can centralize its digital experience.',
      trust: ['Fresh daily', 'Secure checkout', 'Mobile ordering'], employeeRoles: [],
      items: [
        {name:'Fried chicken with fries',description:'Crispy fried chicken served with golden fries, exactly as shown in the image.',badge:"Chef's favorite"},
        {name:'Fresh vegetable bowl',description:'A light, fresh bowl with green vegetables and cauliflower, as pictured.',badge:'Fresh'},
        {name:'Chocolate tart with cream',description:'An individual chocolate dessert served with cream and a gourmet presentation.',badge:'Dessert'},
        {name:'Table reservation',description:'Reserve a table in a dining room prepared for restaurant service like the one shown.',displayPrice:'Free reservation'},
      ],
    },
  },
  'velocity-auto': {
    es: {
      category:'Automotriz', kicker:'DETALLADO · PROTECCIÓN · CUIDADO', headline:'Tu auto merece lucir como nuevo.',
      description:'Detallado premium con servicios reservables, técnicos asignados, depósitos y una experiencia visual de alto impacto.',
      hours:'Lun–Sáb · 8 AM–6 PM', features:['Reserva de servicios','Selección de técnico','Depósitos','WhatsApp'], bookingLabel:'Reservar servicio',
      aboutTitle:'Servicios visuales que se venden solos.', aboutText:'Velocity demuestra cómo WebFactory combina servicios reservables, depósitos, selección de técnico, productos complementarios y WhatsApp en una sola experiencia.',
      trust:['Depósitos disponibles','Horarios por empleado','Galería de servicios'], employeeRoles:['Especialista en pintura y cerámica','Técnico de detallado','Especialista de interiores'],
      items:[
        {name:'Lavado exterior con espuma',description:'Lavado exterior del vehículo con jabón y espuma, tal como se representa en la imagen.',badge:'Popular'},
        {name:'Pulido de pintura',description:'Pulido profesional de la carrocería para mejorar brillo y acabado, exactamente como se observa en la imagen.',badge:'Premium'},
        {name:'Limpieza interior detallada',description:'Limpieza manual del interior del vehículo con paño y trabajo de detalle.'},
        {name:'Productos de cuidado automotriz',description:'Set de botellas y productos para limpieza y mantenimiento del vehículo como los mostrados en la imagen.',badge:'Tienda'},
      ],
    },
    en: {
      category:'Automotive', kicker:'DETAILING · PROTECTION · CARE', headline:'Your car deserves showroom energy.',
      description:'Premium detailing with bookable services, assigned technicians, deposits, and a high-impact visual experience.',
      hours:'Mon–Sat · 8 AM–6 PM', features:['Service booking','Technician selection','Deposits','WhatsApp'], bookingLabel:'Book a service',
      aboutTitle:'Visual services that sell themselves.', aboutText:'Velocity shows how WebFactory combines bookable services, deposits, technician selection, complementary products, and WhatsApp in one experience.',
      trust:['Deposit ready','Employee schedules','Service gallery'], employeeRoles:['Paint & Ceramic Specialist','Detail Technician','Interior Specialist'],
      items:[
        {name:'Exterior foam wash',description:'An exterior vehicle wash with soap and foam, just as shown in the image.',badge:'Popular'},
        {name:'Paint polishing',description:'Professional body polishing to improve shine and finish, exactly as shown in the image.',badge:'Premium'},
        {name:'Detailed interior cleaning',description:'Manual vehicle interior cleaning with careful cloth and detail work.'},
        {name:'Automotive care products',description:'A set of bottles and products for vehicle cleaning and maintenance like those shown in the image.',badge:'Shop'},
      ],
    },
  },
  'northline-barber': {
    es: {
      category:'Barbería', kicker:'ESTUDIO DE CUIDADO MODERNO', headline:'Luce impecable. Reserva rápido.',
      description:'Una barbería moderna donde cada servicio se conecta con el profesional correcto y su disponibilidad.',
      hours:'Mar–Sáb · 9 AM–7 PM', features:['Reservas por empleado','Duración del servicio','Depósitos','Google Calendar'], bookingLabel:'Reservar cita',
      aboutTitle:'Servicio + Empleado + Horario en acción.', aboutText:'Este demo está diseñado para enseñar claramente la lógica principal de WebFactory: un cliente escoge el servicio, luego el profesional autorizado y finalmente un horario disponible.',
      trust:['Turnos de 45–60 min','Selección de profesional','Listo para calendario'], employeeRoles:['Barbero principal','Barbero'],
      items:[
        {name:'Corte de cabello con tijera',description:'Corte de cabello masculino realizado con tijera y trabajo de precisión, como muestra la imagen.',badge:'Más reservado'},
        {name:'Corte profesional',description:'Servicio completo de corte masculino dentro de una barbería moderna, exactamente como representa la imagen.'},
        {name:'Recorte de barba',description:'Recorte y definición de barba realizado por barbero profesional, tal como se muestra en la imagen.'},
        {name:'Pomada para cabello',description:'Pomada de estilizado presentada junto a accesorios de barbería, como aparece en la imagen.',badge:'Venta al detal'},
      ],
    },
    en: {
      category:'Barber', kicker:'MODERN GROOMING STUDIO', headline:'Look sharp. Book fast.',
      description:'A modern barber studio where every service connects with the right professional and their availability.',
      hours:'Tue–Sat · 9 AM–7 PM', features:['Employee booking','Service duration','Deposits','Google Calendar'], bookingLabel:'Book appointment',
      aboutTitle:'Service + Employee + Time in action.', aboutText:'This demo clearly shows WebFactory’s core logic: a customer chooses a service, then an authorized professional, and finally an available time.',
      trust:['45–60 min slots','Professional selection','Calendar-ready'], employeeRoles:['Master Barber','Barber'],
      items:[
        {name:'Scissor haircut',description:'A men’s haircut performed with scissors and precision work, as shown in the image.',badge:'Most booked'},
        {name:'Professional haircut',description:'A complete men’s haircut service inside a modern barber shop, exactly as pictured.'},
        {name:'Beard trim',description:'Professional beard trimming and shaping, just as shown in the image.'},
        {name:'Hair pomade',description:'Styling pomade presented alongside barber accessories, as shown in the image.',badge:'Retail'},
      ],
    },
  },
  'aura-beauty': {
    es: {
      category:'Belleza', kicker:'PIEL · BELLEZA · AUTOCUIDADO', headline:'Tratamientos diseñados para ti.',
      description:'Estudio de belleza premium con servicios, especialistas, depósitos y reservas organizadas en una experiencia elegante.',
      hours:'Lun–Sáb · 10 AM–7 PM', features:['Reservas de belleza','Especialistas','Depósitos','Galería de servicios'], bookingLabel:'Reservar tratamiento',
      aboutTitle:'Una experiencia de reserva tan cuidada como la marca.', aboutText:'Aura demuestra cómo un negocio de belleza puede presentar resultados visuales, organizar especialistas y solicitar depósitos sin complicar el proceso del cliente.',
      trust:['Selección de especialista','Opciones de depósito','Reservas móviles'], employeeRoles:['Esteticista principal','Especialista de belleza'],
      items:[
        {name:'Tratamiento facial relajante',description:'Tratamiento facial realizado por una especialista en ambiente de spa, como se muestra en la imagen.',badge:'Distintivo'},
        {name:'Facial con equipo profesional',description:'Tratamiento facial utilizando equipo estético profesional, exactamente como representa la imagen.'},
        {name:'Diseño de cejas',description:'Servicio profesional de definición y diseño de cejas en salón de belleza.'},
        {name:'Sérum facial',description:'Botella de sérum para el cuidado de la piel presentada como producto cosmético.',badge:'Tienda'},
      ],
    },
    en: {
      category:'Beauty', kicker:'SKIN · BEAUTY · SELF CARE', headline:'Treatments designed around you.',
      description:'A premium beauty studio with services, specialists, deposits, and bookings organized into an elegant experience.',
      hours:'Mon–Sat · 10 AM–7 PM', features:['Beauty bookings','Specialists','Deposits','Service gallery'], bookingLabel:'Book treatment',
      aboutTitle:'A booking experience as thoughtful as the brand.', aboutText:'Aura shows how a beauty business can present visual results, organize specialists, and request deposits without complicating the customer experience.',
      trust:['Specialist matching','Deposit options','Mobile booking'], employeeRoles:['Lead Esthetician','Beauty Specialist'],
      items:[
        {name:'Relaxing facial treatment',description:'A facial treatment performed by a specialist in a spa setting, as shown in the image.',badge:'Signature'},
        {name:'Professional equipment facial',description:'A facial treatment using professional aesthetic equipment, exactly as shown in the image.'},
        {name:'Eyebrow design',description:'Professional eyebrow shaping and design in a beauty salon.'},
        {name:'Facial serum',description:'A skincare serum bottle presented as a cosmetic product.',badge:'Shop'},
      ],
    },
  },
  'balance-wellness': {
    es: {
      category:'Bienestar', kicker:'MUÉVETE · RESPIRA · RESTAURA', headline:'Haz espacio para sentirte mejor.',
      description:'Estudio de bienestar con yoga grupal, masaje individual, capacidades por clase y reservas simples.',
      hours:'Lun–Dom · 7 AM–8 PM', features:['Capacidad grupal','Clases','Reservas de masaje','Listo para membresías'], bookingLabel:'Reservar espacio',
      aboutTitle:'Citas individuales + capacidad grupal.', aboutText:'Balance enseña la excepción grupal del sistema: una clase puede tener un instructor y múltiples espacios disponibles, mientras el masaje permanece como cita individual.',
      trust:['Capacidad por clase','Servicios individuales','Bloques de horario'], employeeRoles:['Instructora de yoga','Terapeuta de bienestar'],
      items:[
        {name:'Clase grupal de yoga y respiración',description:'Grupo de mujeres practicando yoga con enfoque en respiración y relajación, como muestra la imagen.',badge:'15 espacios'},
        {name:'Yoga en estudio',description:'Clase grupal de yoga sobre colchonetas en un estudio iluminado, alineada con la imagen.'},
        {name:'Masaje relajante',description:'Masaje de hombros realizado por terapeuta en ambiente de spa, tal como aparece en la imagen.'},
        {name:'Vela aromática en vidrio',description:'Vela aromática artesanal presentada en recipiente de vidrio, como se observa en la imagen.',badge:'Tienda del estudio'},
      ],
    },
    en: {
      category:'Wellness', kicker:'MOVE · BREATHE · RESTORE', headline:'Make space for feeling better.',
      description:'A wellness studio with group yoga, individual massage, class capacities, and simple bookings.',
      hours:'Mon–Sun · 7 AM–8 PM', features:['Group capacity','Classes','Massage booking','Membership-ready'], bookingLabel:'Reserve your spot',
      aboutTitle:'Individual appointments + group capacity.', aboutText:'Balance demonstrates the group exception in the system: a class can have one instructor and multiple available spots, while massage remains an individual appointment.',
      trust:['Class capacity','Individual services','Schedule blocks'], employeeRoles:['Yoga Instructor','Wellness Therapist'],
      items:[
        {name:'Group yoga and breathing class',description:'A group practicing yoga with a focus on breathing and relaxation, as shown in the image.',badge:'15 spots'},
        {name:'Studio yoga',description:'A group yoga class on mats in a bright studio, matching the image.'},
        {name:'Relaxing massage',description:'A shoulder massage performed by a therapist in a spa setting, as shown in the image.'},
        {name:'Scented glass candle',description:'A handmade scented candle presented in a glass container, as shown in the image.',badge:'Studio shop'},
      ],
    },
  },
  'luna-market': {
    es: {
      category:'Tienda', kicker:'ESTILO COTIDIANO SELECCIONADO', headline:'Una tienda pequeña con un gran catálogo en línea.',
      description:'Boutique enfocada en catálogo, detalle de producto, carrito y checkout para demostrar el lado comercial de WebFactory.',
      hours:'Lun–Sáb · 10 AM–6 PM', features:['Catálogo de productos','Detalle de artículos','Carrito','Checkout con Stripe'], bookingLabel:'Solicitar asesoría de estilo',
      aboutTitle:'Comercio sin fricción.', aboutText:'Luna se concentra en el flujo de ventas: descubrir productos, abrir un detalle individual, añadir al carrito y llegar a un checkout claramente preparado para pagos seguros.',
      trust:['Detalle de producto','Carrito global','Tienda adaptable'], employeeRoles:[],
      items:[
        {name:'Conjunto casual de lino',description:'Conjunto casual de lino en tonos neutros, presentado como atuendo completo en la imagen.',badge:'Nuevo'},
        {name:'Bolso tote marrón',description:'Bolso tote marrón llevado como accesorio de moda, exactamente como muestra la imagen.',badge:'Más vendido'},
        {name:'Suéter tejido',description:'Suéter tejido de estilo casual y cálido mostrado directamente sobre la modelo.'},
        {name:'Collar dorado minimalista',description:'Collar dorado de diseño minimalista expuesto sobre soporte blanco.'},
      ],
    },
    en: {
      category:'Retail', kicker:'CURATED EVERYDAY STYLE', headline:'A small shop with a big online shelf.',
      description:'A retail boutique focused on catalog, product detail, cart, and checkout to demonstrate WebFactory’s commerce experience.',
      hours:'Mon–Sat · 10 AM–6 PM', features:['Product catalog','Item detail','Cart','Stripe checkout'], bookingLabel:'Book styling help',
      aboutTitle:'Frictionless commerce.', aboutText:'Luna focuses on the retail flow: discover products, open an individual detail, add to cart, and reach a checkout clearly prepared for secure payments.',
      trust:['Product detail','Global cart','Responsive shop'], employeeRoles:[],
      items:[
        {name:'Casual linen set',description:'A casual linen set in neutral tones, presented as a complete outfit in the image.',badge:'New'},
        {name:'Brown tote bag',description:'A brown tote bag worn as a fashion accessory, exactly as shown in the image.',badge:'Bestseller'},
        {name:'Knit sweater',description:'A warm, casual knit sweater shown directly on the model.'},
        {name:'Minimalist gold necklace',description:'A minimalist gold necklace displayed on a white stand.'},
      ],
    },
  },
  'summit-advisory': {
    es: {
      category:'Servicios profesionales', kicker:'ESTRATEGIA · OPERACIONES · CRECIMIENTO', headline:'Claridad para tu próxima decisión de negocio.',
      description:'Firma consultiva ficticia que demuestra servicios profesionales, consultas reservables, formularios y calendarios.',
      hours:'Lun–Vie · 8:30 AM–5 PM', features:['Reserva de consultas','Formulario de prospectos','Perfiles del equipo','Calendario'], bookingLabel:'Programar consulta',
      aboutTitle:'Servicios profesionales sin una página de contacto genérica.', aboutText:'Summit demuestra cómo convertir servicios profesionales en opciones claras, reservables y vinculadas a la agenda de la persona adecuada.',
      trust:['Horarios de consulta','Asignación de equipo','Captación de prospectos'], employeeRoles:['Consultora principal','Asesor de crecimiento'],
      items:[
        {name:'Consulta de negocio',description:'Reunión profesional de consulta y discusión en oficina moderna, como muestra la imagen.',badge:'Comienza aquí'},
        {name:'Revisión de documentos y operaciones',description:'Sesión de planificación donde se revisan documentos y decisiones de negocio.'},
        {name:'Reunión de estrategia de equipo',description:'Equipo profesional colaborando alrededor de una mesa durante una reunión estratégica.'},
        {name:'Consulta introductoria',description:'Conversación inicial uno a uno para conocer las necesidades del cliente.',displayPrice:'Gratis'},
      ],
    },
    en: {
      category:'Professional Services', kicker:'STRATEGY · OPERATIONS · GROWTH', headline:'Clarity for the next business decision.',
      description:'A fictional consulting firm demonstrating professional services, bookable consultations, forms, and calendars.',
      hours:'Mon–Fri · 8:30 AM–5 PM', features:['Consultation booking','Lead form','Team profiles','Calendar'], bookingLabel:'Schedule consultation',
      aboutTitle:'Professional services without a generic contact page.', aboutText:'Summit shows how to turn professional services into clear, bookable options connected to the right person’s schedule.',
      trust:['Consultation slots','Team assignment','Lead capture'], employeeRoles:['Principal Consultant','Growth Advisor'],
      items:[
        {name:'Business consultation',description:'A professional consultation and discussion in a modern office, as shown in the image.',badge:'Start here'},
        {name:'Document and operations review',description:'A planning session to review documents and business decisions.'},
        {name:'Team strategy meeting',description:'A professional team collaborating around a table during a strategy meeting.'},
        {name:'Introductory consultation',description:'An initial one-on-one conversation to understand the client’s needs.',displayPrice:'Free'},
      ],
    },
  },
  'isla-living': {
    es: {
      category:'Bienes raíces', kicker:'HOGARES SELECCIONADOS · PUERTO RICO', headline:'Encuentra el espacio que se sienta como tu próximo capítulo.',
      description:'Demo de bienes raíces con propiedades, vistas individuales, agentes y citas para visitas.',
      hours:'Lun–Sáb · 9 AM–6 PM', features:['Listado de propiedades','Reservas con agentes','Vistas detalladas','Flujo de consultas'], bookingLabel:'Programar una visita',
      aboutTitle:'Propiedades que conducen directamente a la acción.', aboutText:'Isla Living usa el mismo motor flexible para presentar propiedades como vistas detalladas y conectar cada una con los agentes autorizados para atenderla.',
      trust:['Detalle de propiedad','Selección de agente','Citas para visitas'], employeeRoles:['Asesora de bienes raíces','Asesor de propiedades'],
      items:[
        {name:'Casa moderna con jardín',description:'Residencia moderna con exterior contemporáneo, patio y áreas verdes como se muestra en la imagen.',displayPrice:'$785,000',badge:'Destacada'},
        {name:'Apartamento moderno con vista urbana',description:'Apartamento contemporáneo con diseño elegante, mobiliario moderno y vista urbana.',displayPrice:'$625,000'},
        {name:'Casa mediterránea con jardín',description:'Casa blanca de estilo mediterráneo rodeada de jardín y sendero de piedra.',displayPrice:'$495,000'},
        {name:'Consulta con agente',description:'Reunión profesional con asesor para conversar sobre compra, propiedades y próximos pasos.',displayPrice:'Consulta gratis'},
      ],
    },
    en: {
      category:'Real Estate', kicker:'CURATED HOMES · PUERTO RICO', headline:'Find the space that feels like your next chapter.',
      description:'A real estate demo with listings, individual views, agents, and viewing appointments.',
      hours:'Mon–Sat · 9 AM–6 PM', features:['Property listings','Agent booking','Detail views','Inquiry flow'], bookingLabel:'Schedule a viewing',
      aboutTitle:'Listings that lead directly to action.', aboutText:'Isla Living uses the same flexible engine to present listings as detailed views and connect each property with the agents authorized to handle it.',
      trust:['Listing detail','Agent selection','Viewing appointments'], employeeRoles:['Real Estate Advisor','Property Advisor'],
      items:[
        {name:'Modern home with garden',description:'A modern residence with a contemporary exterior, patio, and green areas as shown in the image.',displayPrice:'$785,000',badge:'Featured'},
        {name:'Modern apartment with city view',description:'A contemporary apartment with elegant design, modern furnishings, and a city view.',displayPrice:'$625,000'},
        {name:'Mediterranean home with garden',description:'A white Mediterranean-style home surrounded by a garden and stone path.',displayPrice:'$495,000'},
        {name:'Agent consultation',description:'A professional meeting with an advisor to discuss purchasing, properties, and next steps.',displayPrice:'Free consultation'},
      ],
    },
  },
  'atelier-nueve': {
    es: {
      category:'Otro', kicker:'VELAS · OBJETOS · TALLERES', headline:'Hecho con calma. Compartido con belleza.',
      description:'Estudio creativo ficticio que combina productos artesanales, talleres grupales y reservas en un mismo sitio web.',
      hours:'Mié–Dom · 11 AM–7 PM', features:['Productos','Talleres','Reservas grupales','Carrito'], bookingLabel:'Reservar taller',
      aboutTitle:'Un sitio, dos fuentes de ingresos.', aboutText:'Atelier Nueve enseña cómo un negocio creativo puede vender productos y, al mismo tiempo, reservar talleres con capacidad grupal.',
      trust:['Venta de productos','Capacidad de talleres','Checkout combinado'], employeeRoles:['Fundadora y artesana','Anfitrión de talleres'],
      items:[
        {name:'Vela aromática artesanal',description:'Vela aromática hecha a mano en recipiente de vidrio, exactamente como aparece en la imagen.',badge:'Hecha a mano'},
        {name:'Jarrón de cerámica artesanal',description:'Jarrón de cerámica hecho a mano y fotografiado en un entorno de taller.',badge:'Edición limitada'},
        {name:'Taller de fabricación de velas',description:'Taller práctico donde los participantes crean velas con materiales sobre la mesa.',badge:'10 espacios'},
        {name:'Taller creativo privado',description:'Sesión creativa para grupo pequeño trabajando con materiales artísticos alrededor de una mesa.'},
      ],
    },
    en: {
      category:'Other', kicker:'CANDLES · OBJECTS · WORKSHOPS', headline:'Made slowly. Shared beautifully.',
      description:'A fictional creative studio combining handmade products, group workshops, and bookings in one website.',
      hours:'Wed–Sun · 11 AM–7 PM', features:['Products','Workshops','Group booking','Cart'], bookingLabel:'Book a workshop',
      aboutTitle:'One site, two revenue streams.', aboutText:'Atelier Nueve shows how a creative business can sell products while also booking workshops with group capacity.',
      trust:['Product sales','Workshop capacity','Combined checkout'], employeeRoles:['Founder & Maker','Workshop Host'],
      items:[
        {name:'Handmade scented candle',description:'A handmade scented candle in a glass container, exactly as shown in the image.',badge:'Handmade'},
        {name:'Handmade ceramic vase',description:'A handmade ceramic vase photographed in a workshop setting.',badge:'Small batch'},
        {name:'Candle-making workshop',description:'A hands-on workshop where participants create candles with materials arranged on the table.',badge:'10 seats'},
        {name:'Private creative workshop',description:'A creative session for a small group working with art materials around a table.'},
      ],
    },
  },
}

export const localizeDemo = (config: DemoConfig, language: DemoLanguage): DemoConfig => {
  const copy = localizedDemos[config.slug]?.[language]
  if (!copy) return config

  const items = config.items.map((item, index) => ({ ...item, ...copy.items[index] }))
  const itemNames = new Map(config.items.map((item, index) => [item.name, items[index].name]))

  return {
    ...config,
    ...copy,
    items,
    employees: config.employees.map((employee, index) => ({
      ...employee,
      role: copy.employeeRoles[index] ?? employee.role,
      services: employee.services.map((service) => itemNames.get(service) ?? service),
    })),
  }
}

export const demoUi = {
  es: {
    demoNotice:'SITIO DEMO · negocio e información ficticia · no se procesan pagos ni reservaciones reales', createWebsite:'Crear mi sitio web ↗',
    menu:'Menú', services:'Servicios / Tienda', team:'Equipo', about:'Nosotros', contact:'Contacto', cart:'Carrito',
    exploreCatalog:'Explorar catálogo', viewServices:'Ver servicios', location:'UBICACIÓN', hours:'HORARIO', call:'LLAMAR',
    experience:'EXPERIENCIA', commerceHeading:'Explora, elige y toma acción.', servicesHeading:'Elige el servicio ideal para ti.',
    catalogIntro:'El catálogo permanece oculto hasta que el cliente decide abrirlo. Esto mantiene la página limpia incluso cuando el negocio tiene decenas de productos o servicios.',
    catalogAvailable:'CATÁLOGO DISPONIBLE', productsServices:'productos / servicios', catalogHint:'Abre una ventana dedicada para explorar el catálogo sin salir de la página.',
    viewCatalog:'Ver productos y servicios →', teamLabel:'EQUIPO', teamHeading:'La persona correcta para el servicio correcto.',
    teamIntro:'Cada profesional muestra solo los servicios que puede ofrecer. Esta es la lógica Servicio + Empleado que utiliza el sistema de reservas.',
    viewAvailability:'Ver disponibilidad', aboutDemo:'ACERCA DEL DEMO', livePreview:'VISTA PREVIA INTERACTIVA',
    bookingPreview:'Prueba cómo se siente reservar antes de comprar.', commercePreview:'Prueba cómo se siente comprar antes de comprar.',
    interactHint:'Interactúa con esta página: abre detalles, añade artículos al carrito o simula una reservación. Todo está en modo demo.',
    demoMode:'MODO DEMO WEBFACTORY', availabilityReady:'Reservas listas', commerceReady:'Comercio listo', openCart:'Abrir carrito',
    visitContact:'VISITA / CONTACTO', phone:'TELÉFONO', status:'ESTADO', fictionalBusiness:'Negocio demo · ficticio', mapPreview:'VISTA DEL MAPA',
    demoBy:'demo de WebFactory PR', moreDemos:'Explorar más demos de WebFactory →', catalog:'CATÁLOGO', catalogTitle:'Productos y servicios',
    catalogSelect:'Selecciona cualquier artículo para ver sus detalles.', view:'Ver detalle', add:'Añadir', reserve:'Reservar',
    detail:'DETALLE', duration:'Duración', deposit:'Depósito', groupCapacity:'Capacidad grupal', availableWith:'Disponible con', addToCart:'Añadir al carrito', close:'Cerrar',
    demoCart:'CARRITO DEMO', selections:'Tus selecciones', emptyCart:'Tu carrito está vacío.', emptyCartHint:'Añade un producto o servicio para ver la experiencia completa del carrito.', qty:'Cant.', remove:'Eliminar',
    subtotal:'Subtotal', taxes:'Impuestos', calculatedCheckout:'Calculados en checkout', totalPreview:'Total estimado', demoCheckout:'Checkout de prueba',
    checkoutSuccess:'✓ Checkout simulado. No se procesó ningún pago.', backendPricing:'Solo modo demo · los precios autorizados y la verificación de pagos ocurren en el servidor en producción.',
    bookingProgress:'Progreso de reserva demo', select:'Elegir', checkout:'Checkout', verify:'Verificar', confirmed:'Confirmada', demoBooking:'RESERVA DEMO', appointment:'Cita',
    fullPayment:'Pago completo', noPayment:'No requiere pago', chooseProfessional:'Elegir profesional', anyAvailable:'Cualquier disponible', chooseDate:'Elegir fecha', chooseTime:'Elegir hora', busy:'Ocupado',
    bookingHold:'Reserva temporal · solo demo', continueCheckout:'Continuar al checkout demo', continueNoPayment:'Continuar · no requiere pago', holdSafe:'Solo modo demo · esta reserva temporal no bloquea ningún horario real.',
    demoCheckoutLabel:'CHECKOUT DEMO', completeFlow:'Completa el flujo de reserva.', noPaymentInfo:'No se solicita ni transmite información de pago real.', service:'Servicio', professional:'Profesional', dateTime:'Fecha y hora', depositDue:'Depósito a pagar', amountDue:'Total a pagar',
    name:'Nombre', email:'Correo electrónico', choosePayment:'Elige un método de pago simulado', back:'← Atrás', simulatePayment:'Simular pago aprobado →', noExternalRecord:'No se crea ningún cargo, transacción ATH, reserva ni evento de calendario.',
    paymentVerified:'PAGO DEMO VERIFICADO', noPaymentRequired:'NO REQUIERE PAGO', readyConfirm:'Todo listo para confirmar la reserva.', verifiedIntro:'El demo ahora simula las verificaciones finales del servidor que realizaría un sitio WebFactory real.',
    revalidated:'✓ Servicio + empleado + horario revalidados', holdActive:'✓ Reserva temporal todavía activa', paymentSkipped:'✓ Paso de pago omitido', calendarPassed:'✓ Verificación de conflicto de calendario aprobada (demo)', paymentVerifiedLine:'pago verificado (demo)',
    confirmBooking:'Confirmar reserva demo →', checksVisual:'Estas verificaciones son únicamente una simulación visual. No se contacta ningún servicio externo.', demoConfirmed:'DEMO CONFIRMADO', bookingComplete:'Experiencia de reserva completada.',
    bookingStatus:'Estado de la reserva', confirmedDemo:'CONFIRMADA · DEMO', payment:'Pago', verifiedDemo:'VERIFICADO · DEMO', notRequired:'NO REQUERIDO', calendar:'Calendario', eventReady:'EVENTO LISTO · DEMO', done:'Finalizar',
    nothingCreated:'No se creó ninguna cita, pago, correo electrónico ni evento de calendario real.', notFound:'Demo no encontrado', returnWebFactory:'Volver a WebFactory PR',
    product:'Producto', serviceType:'Servicio', listing:'Propiedad', classType:'Clase', language:'Idioma', spanish:'Español', english:'English',
    dates:['Vie 18','Sáb 19','Lun 21','Mar 22'], defaultCustomer:'Cliente Demo',
  },
  en: {
    demoNotice:'DEMO WEBSITE · fictional business and information · no real payments or bookings are processed', createWebsite:'Create my website ↗',
    menu:'Menu', services:'Services / Shop', team:'Team', about:'About', contact:'Contact', cart:'Cart',
    exploreCatalog:'Explore catalog', viewServices:'View services', location:'LOCATION', hours:'HOURS', call:'CALL',
    experience:'EXPERIENCE', commerceHeading:'Explore, choose, and take action.', servicesHeading:'Choose the service that fits.',
    catalogIntro:'The catalog stays hidden until the customer decides to open it. This keeps the page clean even when the business has dozens of products or services.',
    catalogAvailable:'CATALOG AVAILABLE', productsServices:'products / services', catalogHint:'Open a dedicated window to explore the catalog without leaving the page.',
    viewCatalog:'View products and services →', teamLabel:'TEAM', teamHeading:'The right person for the right service.',
    teamIntro:'Each professional shows only the services they can offer. This is the Service + Employee logic used by the booking system.',
    viewAvailability:'View availability', aboutDemo:'ABOUT THE DEMO', livePreview:'LIVE FEATURE PREVIEW',
    bookingPreview:'See how booking feels before you buy.', commercePreview:'See how commerce feels before you buy.',
    interactHint:'Interact with this page: open details, add items to the cart, or simulate a booking. Everything is in demo mode.',
    demoMode:'WEBFACTORY DEMO MODE', availabilityReady:'Availability ready', commerceReady:'Commerce ready', openCart:'Open cart',
    visitContact:'VISIT / CONTACT', phone:'PHONE', status:'STATUS', fictionalBusiness:'Demo business · fictional', mapPreview:'MAP PREVIEW',
    demoBy:'demo by WebFactory PR', moreDemos:'Explore more WebFactory demos →', catalog:'CATALOG', catalogTitle:'Products and services',
    catalogSelect:'Select any item to view its details.', view:'View details', add:'Add', reserve:'Book',
    detail:'DETAIL', duration:'Duration', deposit:'Deposit', groupCapacity:'Group capacity', availableWith:'Available with', addToCart:'Add to cart', close:'Close',
    demoCart:'DEMO CART', selections:'Your selections', emptyCart:'Your cart is empty.', emptyCartHint:'Add a product or service to see the full cart experience.', qty:'Qty', remove:'Remove',
    subtotal:'Subtotal', taxes:'Taxes', calculatedCheckout:'Calculated at checkout', totalPreview:'Total preview', demoCheckout:'Demo checkout',
    checkoutSuccess:'✓ Checkout simulated. No payment was processed.', backendPricing:'Demo mode only · authoritative pricing and payment verification occur on the backend in production.',
    bookingProgress:'Demo booking progress', select:'Select', checkout:'Checkout', verify:'Verify', confirmed:'Confirmed', demoBooking:'DEMO BOOKING', appointment:'Appointment',
    fullPayment:'Full payment', noPayment:'No payment required', chooseProfessional:'Choose professional', anyAvailable:'Any available', chooseDate:'Choose date', chooseTime:'Choose time', busy:'Busy',
    bookingHold:'Temporary booking hold · demo only', continueCheckout:'Continue to demo checkout', continueNoPayment:'Continue · no payment required', holdSafe:'Demo mode only · this hold does not block any real calendar slot.',
    demoCheckoutLabel:'DEMO CHECKOUT', completeFlow:'Complete the booking flow.', noPaymentInfo:'No real payment information is requested or transmitted.', service:'Service', professional:'Professional', dateTime:'Date & time', depositDue:'Deposit due', amountDue:'Amount due',
    name:'Name', email:'Email', choosePayment:'Choose simulated payment method', back:'← Back', simulatePayment:'Simulate approved payment →', noExternalRecord:'No card, ATH transaction, charge, booking record, or calendar event is created.',
    paymentVerified:'DEMO PAYMENT VERIFIED', noPaymentRequired:'NO PAYMENT REQUIRED', readyConfirm:'Ready to confirm the booking.', verifiedIntro:'The demo now simulates the final backend checks that a real WebFactory site would perform.',
    revalidated:'✓ Service + employee + time revalidated', holdActive:'✓ Temporary hold still active', paymentSkipped:'✓ Payment step skipped', calendarPassed:'✓ Calendar conflict check passed (demo)', paymentVerifiedLine:'payment verified (demo)',
    confirmBooking:'Confirm demo booking →', checksVisual:'These checks are visual simulation only. No external service is contacted.', demoConfirmed:'DEMO CONFIRMED', bookingComplete:'Booking experience complete.',
    bookingStatus:'Booking status', confirmedDemo:'CONFIRMED · DEMO', payment:'Payment', verifiedDemo:'VERIFIED · DEMO', notRequired:'NOT REQUIRED', calendar:'Calendar', eventReady:'EVENT READY · DEMO', done:'Done',
    nothingCreated:'No real appointment, payment, email, or calendar event was created.', notFound:'Demo not found', returnWebFactory:'Return to WebFactory PR',
    product:'Product', serviceType:'Service', listing:'Listing', classType:'Class', language:'Language', spanish:'Español', english:'English',
    dates:['Fri 18','Sat 19','Mon 21','Tue 22'], defaultCustomer:'Demo Customer',
  },
} as const

export type DemoUi = typeof demoUi.es | typeof demoUi.en

