export type TemplateVisualStyle = 'modern' | 'luxury' | 'minimal' | 'bold'

export const templateVisualStyle = (category: string): TemplateVisualStyle => {
  if (['Beauty','Real Estate'].includes(category)) return 'luxury'
  if (['Wellness','Professional Services'].includes(category)) return 'minimal'
  if (['Restaurant','Retail','Other'].includes(category)) return 'bold'
  return 'modern'
}

export type TemplateItem = {
  id: string
  type: 'product' | 'service' | 'listing' | 'class'
  name: string
  price: number
  displayPrice?: string
  description: string
  image: string
  appointment?: boolean
  duration?: number
  deposit?: number
  employees?: string[]
  badge?: string
  groupCapacity?: number
  purchasable?: boolean
}

export type TemplateEmployee = {
  id: string
  name: string
  role: string
  initials: string
  services: string[]
}

export type TemplateConfig = {
  slug: string
  category: string
  name: string
  shortName: string
  kicker: string
  headline: string
  description: string
  heroImage: string
  gallery: string[]
  location: string
  phone: string
  hours: string
  accent: string
  accent2: string
  dark: string
  cream: string
  features: string[]
  items: TemplateItem[]
  employees: TemplateEmployee[]
  bookingLabel: string
  cartEnabled: boolean
  bookingEnabled: boolean
  groupBooking?: boolean
  aboutTitle: string
  aboutText: string
  trust: string[]
}

const pexels = (id: number, _width = 1600) => `/template-images/${id}.jpg`

export const templateConfigs: TemplateConfig[] = [
  {
    slug: 'brisa-cocina', category: 'Restaurant', name: 'Brisa Cocina', shortName: 'BRISA',
    kicker: 'COCINA COSTERA · SAN JUAN', headline: 'Sabores del Caribe, servidos con calma.',
    description: 'Una experiencia gastronómica contemporánea con ordering online, platos destacados y reservaciones para cena.',
    heroImage: pexels(14415367), gallery: [pexels(12178045), pexels(11223909), pexels(13537755)],
    location: 'San Juan, Puerto Rico', phone: '(787) 555-0118', hours: 'Mar–Dom · 12 PM–10 PM',
    accent: '#E76F51', accent2: '#F4A261', dark: '#1E2B29', cream: '#FFF8F0',
    features: ['Online ordering', 'Table reservations', 'Menu catalog', 'ATH Móvil'],
    items: [
      {id:'brisa-1',type:'product',name:'Pollo frito con papas fritas',price:22,description:'Pollo frito crujiente servido con papas fritas doradas, exactamente como se muestra en la imagen.',image:pexels(12178045),badge:'Chef favorite'},
      {id:'brisa-2',type:'product',name:'Bowl de vegetales frescos',price:18,description:'Bowl con vegetales verdes y coliflor, presentado de forma fresca y ligera como en la imagen.',image:pexels(12791864),badge:'Fresh'},
      {id:'brisa-3',type:'product',name:'Tarta de chocolate con crema',price:9,description:'Postre individual de chocolate servido en plato con crema y presentación gourmet.',image:pexels(11223909),badge:'Dessert'},
      {id:'brisa-4',type:'service',name:'Reserva de mesa',price:0,displayPrice:'Reserva gratis',description:'Reserva una mesa en un comedor preparado para servicio de restaurante como el mostrado en la imagen.',image:pexels(13537755),appointment:true,duration:90,purchasable:false}
    ],
    employees: [], bookingLabel: 'Reservar mesa', cartEnabled: true, bookingEnabled: true, groupBooking: true,
    aboutTitle: 'Cocina contemporánea con raíces locales.',
    aboutText: 'Este template combina catálogo de menú, ordering, carrito, horarios y reservaciones para mostrar cómo un restaurante puede centralizar su experiencia digital.',
    trust: ['Fresh daily', 'Secure checkout', 'Mobile ordering']
  },

  {
    slug: 'northline-barber', category: 'Barber', name: 'Northline Barber Studio', shortName: 'NORTHLINE',
    kicker: 'MODERN GROOMING STUDIO', headline: 'Look sharp. Book fast.',
    description: 'Un barber studio moderno donde cada servicio se conecta con el profesional correcto y su disponibilidad.',
    heroImage: pexels(19664876), gallery: [pexels(7697280), pexels(7447145), pexels(9511913)],
    location: 'Caguas, Puerto Rico', phone: '(787) 555-0139', hours: 'Mar–Sáb · 9 AM–7 PM',
    accent: '#D1B07C', accent2: '#F0D7AE', dark: '#111111', cream: '#F7F3EE',
    features: ['Employee booking', 'Service duration', 'Deposits', 'Google Calendar'],
    items: [
      {id:'north-1',type:'service',name:'Corte de cabello con tijera',price:35,description:'Corte de cabello masculino realizado con tijera y trabajo de precisión, como muestra la imagen.',image:pexels(7697280),appointment:true,duration:45,deposit:10,employees:['Carlos','José'],badge:'Most booked'},
      {id:'north-2',type:'service',name:'Corte profesional',price:50,description:'Servicio completo de corte masculino dentro de una barbería moderna, exactamente como representa la imagen.',image:pexels(7518731),appointment:true,duration:60,deposit:15,employees:['Carlos']},
      {id:'north-3',type:'service',name:'Recorte de barba',price:25,description:'Recorte y definición de barba realizado por barbero profesional, tal como se muestra en la imagen.',image:pexels(7447145),appointment:true,duration:30,employees:['José','Carlos']},
      {id:'north-4',type:'product',name:'Pomada para cabello',price:24,description:'Pomada de styling presentada junto a accesorios de barbería, como aparece en la imagen.',image:pexels(9511913),badge:'Retail'}
    ],
    employees: [
      {id:'carlos',name:'Carlos Rivera',role:'Master Barber',initials:'CR',services:['Corte de cabello con tijera','Corte profesional','Recorte de barba']},
      {id:'jose',name:'José Medina',role:'Barber',initials:'JM',services:['Corte de cabello con tijera','Recorte de barba']}
    ],
    bookingLabel: 'Reservar cita', cartEnabled: true, bookingEnabled: true,
    aboutTitle: 'Service + Employee + Time en acción.',
    aboutText: 'Este template está diseñado para enseñar claramente la lógica principal de WebFactory: un cliente escoge el servicio, luego el profesional autorizado y finalmente un horario disponible.',
    trust: ['45–60 min slots', 'Professional selection', 'Calendar-ready']
  },
  {
    slug: 'aura-beauty', category: 'Beauty', name: 'Aura Beauty Lab', shortName: 'AURA',
    kicker: 'SKIN · BEAUTY · SELF CARE', headline: 'Treatments designed around you.',
    description: 'Beauty studio premium con servicios, especialistas, depósitos y reservas organizadas en una experiencia elegante.',
    heroImage: pexels(33607393), gallery: [pexels(3985333), pexels(16131207), pexels(33580445)],
    location: 'Guaynabo, Puerto Rico', phone: '(787) 555-0162', hours: 'Lun–Sáb · 10 AM–7 PM',
    accent: '#B66D8F', accent2: '#E9BFD1', dark: '#2A1C25', cream: '#FFF8FB',
    features: ['Beauty bookings', 'Specialists', 'Deposits', 'Service gallery'],
    items: [
      {id:'aura-1',type:'service',name:'Tratamiento facial relajante',price:95,description:'Tratamiento facial realizado por una especialista en ambiente de spa, como se muestra en la imagen.',image:pexels(3985333),appointment:true,duration:60,deposit:25,employees:['Sofía','Camila'],badge:'Signature'},
      {id:'aura-2',type:'service',name:'Facial con equipo profesional',price:135,description:'Tratamiento facial utilizando equipo estético profesional, exactamente como representa la imagen.',image:pexels(16131207),appointment:true,duration:75,deposit:35,employees:['Sofía']},
      {id:'aura-3',type:'service',name:'Diseño de cejas',price:42,description:'Servicio profesional de definición y diseño de cejas en salón de belleza.',image:pexels(33580445),appointment:true,duration:35,employees:['Camila']},
      {id:'aura-4',type:'product',name:'Serum facial',price:38,description:'Botella de serum para cuidado de la piel presentada como producto cosmético.',image:pexels(13946076),badge:'Shop'}
    ],
    employees: [
      {id:'sofia',name:'Sofía Morales',role:'Lead Esthetician',initials:'SM',services:['Tratamiento facial relajante','Facial con equipo profesional']},
      {id:'camila',name:'Camila Reyes',role:'Beauty Specialist',initials:'CR',services:['Tratamiento facial relajante','Diseño de cejas']}
    ],
    bookingLabel: 'Book treatment', cartEnabled: true, bookingEnabled: true,
    aboutTitle: 'Una experiencia de reserva tan cuidada como la marca.',
    aboutText: 'Aura demuestra cómo un negocio de belleza puede presentar resultados visuales, organizar especialistas y solicitar depósitos sin complicar el proceso del cliente.',
    trust: ['Specialist matching', 'Deposit options', 'Mobile booking']
  },
  {
    slug: 'balance-wellness', category: 'Wellness', name: 'Balance Wellness Room', shortName: 'BALANCE',
    kicker: 'MOVE · BREATHE · RESTORE', headline: 'Make space for feeling better.',
    description: 'Wellness studio con yoga grupal, masaje individual, capacidades por clase y reservas simples.',
    heroImage: pexels(8436730), gallery: [pexels(23095849), pexels(8436845), pexels(5793681)],
    location: 'Dorado, Puerto Rico', phone: '(787) 555-0151', hours: 'Lun–Dom · 7 AM–8 PM',
    accent: '#799B7A', accent2: '#BCD2B7', dark: '#213128', cream: '#F4F7F0',
    features: ['Group capacity', 'Classes', 'Massage booking', 'Membership-ready'],
    items: [
      {id:'bal-1',type:'class',name:'Clase grupal de yoga y respiración',price:22,description:'Grupo de mujeres practicando yoga con enfoque en respiración y relajación, como muestra la imagen.',image:pexels(23095849),appointment:true,duration:60,employees:['Elena'],groupCapacity:15,badge:'15 spots'},
      {id:'bal-2',type:'class',name:'Yoga en estudio',price:24,description:'Clase grupal de yoga sobre mats en un estudio iluminado, alineada con la imagen.',image:pexels(8436845),appointment:true,duration:60,employees:['Elena','Nadia'],groupCapacity:12},
      {id:'bal-3',type:'service',name:'Masaje relajante',price:110,description:'Masaje de hombros realizado por terapeuta en ambiente de spa, tal como aparece en la imagen.',image:pexels(5793681),appointment:true,duration:75,deposit:25,employees:['Nadia']},
      {id:'bal-4',type:'product',name:'Vela aromática en vidrio',price:28,description:'Vela aromática artesanal presentada en recipiente de vidrio, como se observa en la imagen.',image:pexels(1652095),badge:'Studio shop'}
    ],
    employees: [
      {id:'elena',name:'Elena Ortiz',role:'Yoga Instructor',initials:'EO',services:['Clase grupal de yoga y respiración','Yoga en estudio']},
      {id:'nadia',name:'Nadia Torres',role:'Wellness Therapist',initials:'NT',services:['Yoga en estudio','Masaje relajante']}
    ],
    bookingLabel: 'Reserve your spot', cartEnabled: true, bookingEnabled: true, groupBooking: true,
    aboutTitle: 'Individual appointments + group capacity.',
    aboutText: 'Balance enseña la excepción grupal del sistema: una clase puede tener un instructor y múltiples espacios disponibles, mientras el masaje permanece como cita individual.',
    trust: ['Class capacity', 'Individual services', 'Schedule blocks']
  },
  {
    slug: 'luna-market', category: 'Retail', name: 'Luna Market Boutique', shortName: 'LUNA',
    kicker: 'CURATED EVERYDAY STYLE', headline: 'A small shop with a big online shelf.',
    description: 'Boutique retail enfocada en catálogo, product detail, carrito y checkout para templatestrar el lado commerce de WebFactory.',
    heroImage: pexels(5864244), gallery: [pexels(36730399), pexels(8306374), pexels(5709656)],
    location: 'Ponce, Puerto Rico', phone: '(787) 555-0173', hours: 'Lun–Sáb · 10 AM–6 PM',
    accent: '#6A5ACD', accent2: '#B9AEFF', dark: '#1E1A32', cream: '#F8F6FF',
    features: ['Product catalog', 'Item detail', 'Cart', 'Stripe checkout'],
    items: [
      {id:'luna-1',type:'product',name:'Conjunto casual de lino',price:68,description:'Conjunto casual de lino en tonos neutros, presentado como outfit completo en la imagen.',image:pexels(6996139),badge:'New'},
      {id:'luna-2',type:'product',name:'Bolso tote marrón',price:42,description:'Bolso tote marrón llevado como accesorio de moda, exactamente como muestra la imagen.',image:pexels(1996009),badge:'Bestseller'},
      {id:'luna-3',type:'product',name:'Suéter tejido',price:54,description:'Suéter tejido de estilo casual y cálido mostrado directamente sobre la modelo.',image:pexels(9265900)},
      {id:'luna-4',type:'product',name:'Collar dorado minimalista',price:29,description:'Collar dorado de diseño minimalista expuesto sobre soporte blanco.',image:pexels(12194264)}
    ],
    employees: [], bookingLabel: 'Book styling help', cartEnabled: true, bookingEnabled: false,
    aboutTitle: 'Commerce sin fricción.',
    aboutText: 'Luna se concentra en el flujo retail: descubrir productos, abrir un detalle individual, añadir al carrito y llegar a un checkout claramente preparado para pagos seguros.',
    trust: ['Product detail', 'Global cart', 'Responsive shop']
  },
  {
    slug: 'summit-advisory', category: 'Professional Services', name: 'Summit Advisory Group', shortName: 'SUMMIT',
    kicker: 'STRATEGY · OPERATIONS · GROWTH', headline: 'Clarity for the next business decision.',
    description: 'Firma consultiva ficticia que demuestra servicios profesionales, consultas reservables, formularios y calendarios.',
    heroImage: pexels(7433865), gallery: [pexels(7979435), pexels(8117410), pexels(4344340)],
    location: 'San Juan, Puerto Rico', phone: '(787) 555-0196', hours: 'Lun–Vie · 8:30 AM–5 PM',
    accent: '#2D6CDF', accent2: '#8BB5FF', dark: '#101C31', cream: '#F5F8FC',
    features: ['Consultation booking', 'Lead form', 'Team profiles', 'Calendar'],
    items: [
      {id:'sum-1',type:'service',name:'Consulta de negocio',price:150,description:'Reunión profesional de consulta y discusión en oficina moderna, como muestra la imagen.',image:pexels(7979435),appointment:true,duration:60,employees:['Andrea','Miguel'],badge:'Start here'},
      {id:'sum-2',type:'service',name:'Revisión de documentos y operaciones',price:275,description:'Sesión de planificación donde se revisan documentos y decisiones de negocio.',image:pexels(8117410),appointment:true,duration:90,deposit:75,employees:['Andrea']},
      {id:'sum-3',type:'service',name:'Reunión de estrategia de equipo',price:225,description:'Equipo profesional colaborando alrededor de una mesa durante una reunión estratégica.',image:pexels(4344340),appointment:true,duration:75,deposit:50,employees:['Miguel']},
      {id:'sum-4',type:'service',name:'Consulta introductoria',price:0,displayPrice:'Free',description:'Conversación inicial uno a uno para conocer las necesidades del cliente.',image:pexels(7979435),appointment:true,duration:20,employees:['Andrea','Miguel'],purchasable:false}
    ],
    employees: [
      {id:'andrea',name:'Andrea Vázquez',role:'Principal Consultant',initials:'AV',services:['Consulta de negocio','Revisión de documentos y operaciones','Consulta introductoria']},
      {id:'miguel',name:'Miguel Santos',role:'Growth Advisor',initials:'MS',services:['Consulta de negocio','Reunión de estrategia de equipo','Consulta introductoria']}
    ],
    bookingLabel: 'Schedule consultation', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Professional services without a generic contact page.',
    aboutText: 'Summit demuestra cómo convertir servicios profesionales en opciones claras, reservables y vinculadas a la agenda de la persona adecuada.',
    trust: ['Consultation slots', 'Team assignment', 'Lead capture']
  },
  {
    slug: 'isla-living', category: 'Real Estate', name: 'Isla Living Realty', shortName: 'ISLA LIVING',
    kicker: 'CURATED HOMES · PUERTO RICO', headline: 'Find the space that feels like your next chapter.',
    description: 'Real estate template con listings, vistas individuales, agentes y citas para visitas.',
    heroImage: pexels(12441654), gallery: [pexels(7587880), pexels(22743872), pexels(12891613)],
    location: 'Puerto Rico', phone: '(787) 555-0124', hours: 'Lun–Sáb · 9 AM–6 PM',
    accent: '#B98A54', accent2: '#DEC5A5', dark: '#18211F', cream: '#F8F5EF',
    features: ['Property listings', 'Agent booking', 'Detail views', 'Inquiry flow'],
    items: [
      {id:'isla-1',type:'listing',name:'Casa moderna con jardín',price:785000,displayPrice:'$785,000',description:'Residencia moderna con exterior contemporáneo, patio y áreas verdes como se muestra en la imagen.',image:pexels(7587880),appointment:true,duration:45,employees:['Valeria'],purchasable:false,badge:'Featured'},
      {id:'isla-2',type:'listing',name:'Apartamento moderno con vista urbana',price:625000,displayPrice:'$625,000',description:'Apartamento contemporáneo con diseño elegante, mobiliario moderno y vista urbana.',image:pexels(22743872),appointment:true,duration:45,employees:['Valeria','Diego'],purchasable:false},
      {id:'isla-3',type:'listing',name:'Casa mediterránea con jardín',price:495000,displayPrice:'$495,000',description:'Casa blanca de estilo mediterráneo rodeada de jardín y sendero de piedra.',image:pexels(12891613),appointment:true,duration:45,employees:['Diego'],purchasable:false},
      {id:'isla-4',type:'service',name:'Consulta con agente',price:0,displayPrice:'Free consultation',description:'Reunión profesional con asesor para conversar sobre compra, propiedades y próximos pasos.',image:pexels(7979435),appointment:true,duration:30,employees:['Valeria','Diego'],purchasable:false}
    ],
    employees: [
      {id:'valeria',name:'Valeria León',role:'Real Estate Advisor',initials:'VL',services:['Casa moderna con jardín','Apartamento moderno con vista urbana','Consulta con agente']},
      {id:'diego',name:'Diego Font',role:'Property Advisor',initials:'DF',services:['Apartamento moderno con vista urbana','Casa mediterránea con jardín','Consulta con agente']}
    ],
    bookingLabel: 'Schedule a viewing', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Listings that lead directly to action.',
    aboutText: 'Isla Living usa el mismo motor flexible para presentar listings como vistas detalladas y conectar cada propiedad con los agentes autorizados para atenderla.',
    trust: ['Listing detail', 'Agent selection', 'Viewing appointments']
  },
  {
    slug: 'atelier-nueve', category: 'Other', name: 'Atelier Nueve', shortName: 'ATELIER NUEVE',
    kicker: 'CANDLES · OBJECTS · WORKSHOPS', headline: 'Made slowly. Shared beautifully.',
    description: 'Estudio creativo ficticio que combina productos artesanales, talleres grupales y reservas en un mismo website.',
    heroImage: pexels(6755615), gallery: [pexels(1652095), pexels(8274442), pexels(34241287)],
    location: 'Río Piedras, Puerto Rico', phone: '(787) 555-0147', hours: 'Mié–Dom · 11 AM–7 PM',
    accent: '#C26B45', accent2: '#E8B798', dark: '#2D241F', cream: '#FBF5EE',
    features: ['Products', 'Workshops', 'Group booking', 'Cart'],
    items: [
      {id:'atelier-1',type:'product',name:'Vela aromática artesanal',price:32,description:'Vela aromática hecha a mano en recipiente de vidrio, exactamente como aparece en la imagen.',image:pexels(1652095),badge:'Handmade'},
      {id:'atelier-2',type:'product',name:'Jarrón de cerámica artesanal',price:46,description:'Jarrón de cerámica hecho a mano y fotografiado en un entorno de taller.',image:pexels(8274442),badge:'Small batch'},
      {id:'atelier-3',type:'class',name:'Taller de fabricación de velas',price:65,description:'Taller práctico donde los participantes crean velas con materiales sobre la mesa.',image:pexels(34241287),appointment:true,duration:120,employees:['Lucía'],groupCapacity:10,badge:'10 seats'},
      {id:'atelier-4',type:'class',name:'Taller creativo privado',price:120,description:'Sesión creativa para grupo pequeño trabajando con materiales artísticos alrededor de una mesa.',image:pexels(6925189),appointment:true,duration:120,deposit:40,employees:['Lucía','Marcos'],groupCapacity:6}
    ],
    employees: [
      {id:'lucia',name:'Lucía Ferrer',role:'Founder & Maker',initials:'LF',services:['Taller de fabricación de velas','Taller creativo privado']},
      {id:'marcos',name:'Marcos Gil',role:'Workshop Host',initials:'MG',services:['Taller creativo privado']}
    ],
    bookingLabel: 'Book a workshop', cartEnabled: true, bookingEnabled: true, groupBooking: true,
    aboutTitle: 'One site, two revenue streams.',
    aboutText: 'Atelier Nueve enseña cómo un negocio creativo puede vender productos y, al mismo tiempo, reservar talleres con capacidad grupal.',
    trust: ['Product sales', 'Workshop capacity', 'Combined checkout']
  },
  {
    slug: 'aqua-shine-carwash', category: 'Car Wash', name: 'Aqua Shine Car Wash', shortName: 'AQUA SHINE',
    kicker: 'WASH · DETAIL · PROTECT', headline: 'Drive clean. Shine longer.',
    description: 'Car wash moderno con paquetes rápidos, detailing, add-ons y reservaciones por vehículo y horario.',
    heroImage: pexels(29504462), gallery: [pexels(5233271), pexels(11139243), pexels(37809581)],
    location: 'Carolina, Puerto Rico', phone: '(787) 555-0201', hours: 'Lun–Dom · 8 AM–6 PM',
    accent: '#21A7FF', accent2: '#84D8FF', dark: '#071A2B', cream: '#F2FAFF',
    features: ['Wash packages', 'Detail booking', 'Add-ons', 'WhatsApp'],
    items: [
      {id:'aqua-1',type:'service',name:'Lavado Express',price:25,description:'Lavado exterior rápido con espuma, enjuague y secado.',image:pexels(5233271),appointment:true,duration:30,employees:['Luis','Mara'],badge:'Fast'},
      {id:'aqua-2',type:'service',name:'Full Detail',price:145,description:'Limpieza completa interior y exterior con acabado premium.',image:pexels(31389821),appointment:true,duration:180,deposit:35,employees:['Luis'],badge:'Premium'},
      {id:'aqua-3',type:'service',name:'Ceramic Boost',price:85,description:'Protección rápida para brillo y repelencia de agua.',image:pexels(14908957),appointment:true,duration:75,deposit:20,employees:['Mara']},
      {id:'aqua-4',type:'product',name:'Kit de cuidado',price:39,description:'Productos básicos para mantener el acabado entre visitas.',image:pexels(11139243),badge:'Shop'}
    ],
    employees: [
      {id:'aqua-luis',name:'Luis Vega',role:'Detail Specialist',initials:'LV',services:['Lavado Express','Full Detail']},
      {id:'aqua-mara',name:'Mara Cruz',role:'Wash Specialist',initials:'MC',services:['Lavado Express','Ceramic Boost']}
    ],
    bookingLabel: 'Reservar lavado', cartEnabled: true, bookingEnabled: true,
    aboutTitle: 'Un car wash que también vende conveniencia.',
    aboutText: 'Este template combina paquetes, horarios, depósitos, técnicos y productos complementarios en una experiencia rápida desde móvil.',
    trust: ['Fast booking', 'Vehicle services', 'Secure deposits']
  },
  {
    slug: 'verde-vivo-landscaping', category: 'Landscaping', name: 'Verde Vivo Landscaping', shortName: 'VERDE VIVO',
    kicker: 'LAWNS · GARDENS · OUTDOOR CARE', headline: 'Tu patio, siempre listo.',
    description: 'Servicios de recorte, mantenimiento, limpieza y diseño exterior con visitas programadas y cotizaciones.',
    heroImage: pexels(1458694), gallery: [pexels(58929), pexels(1301856), pexels(1084540)],
    location: 'Arecibo, Puerto Rico', phone: '(787) 555-0202', hours: 'Lun–Sáb · 7 AM–5 PM',
    accent: '#65A30D', accent2: '#B7E37B', dark: '#17351E', cream: '#F6FAF1',
    features: ['Service booking', 'Recurring care', 'Quote requests', 'Maps'],
    items: [
      {id:'verde-1',type:'service',name:'Recorte de patio',price:55,description:'Corte y terminación básica de césped residencial.',image:pexels(58929),appointment:true,duration:90,employees:['Javier','Noel'],badge:'Popular'},
      {id:'verde-2',type:'service',name:'Limpieza de patio',price:95,description:'Remoción de hojas, ramas y desperdicios de áreas exteriores.',image:pexels(1301856),appointment:true,duration:120,deposit:20,employees:['Noel']},
      {id:'verde-3',type:'service',name:'Mantenimiento de jardín',price:125,description:'Mantenimiento de plantas, bordes y áreas verdes.',image:pexels(1084540),appointment:true,duration:150,deposit:25,employees:['Javier']},
      {id:'verde-4',type:'service',name:'Visita para cotización',price:0,displayPrice:'Cotización gratis',description:'Evaluación presencial para trabajos especiales.',image:pexels(1458694),appointment:true,duration:30,employees:['Javier'],purchasable:false}
    ],
    employees: [
      {id:'verde-javier',name:'Javier Soto',role:'Landscape Lead',initials:'JS',services:['Recorte de patio','Mantenimiento de jardín','Visita para cotización']},
      {id:'verde-noel',name:'Noel Díaz',role:'Outdoor Care Technician',initials:'ND',services:['Recorte de patio','Limpieza de patio']}
    ],
    bookingLabel: 'Agendar servicio', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Mantenimiento exterior organizado por zona y horario.',
    aboutText: 'Verde Vivo permite mostrar servicios, solicitar cotizaciones y coordinar visitas sin depender de llamadas para cada cita.',
    trust: ['Route-ready', 'Quote visits', 'Recurring service']
  },
  {
    slug: 'sonido-vivo-artist', category: 'Music Artist', name: 'Sonido Vivo', shortName: 'SONIDO VIVO',
    kicker: 'LIVE MUSIC · EVENTS · BOOKINGS', headline: 'Bring the live set to your event.',
    description: 'Template para artista musical con paquetes de presentación, fechas reservables, depósitos y contacto para eventos privados.',
    heroImage: pexels(1763075), gallery: [pexels(1190297), pexels(164829), pexels(167636)],
    location: 'Puerto Rico', phone: '(787) 555-0203', hours: 'Bookings · By availability',
    accent: '#A855F7', accent2: '#E2B7FF', dark: '#120A1D', cream: '#FAF5FF',
    features: ['Artist booking', 'Event packages', 'Deposits', 'Social media'],
    items: [
      {id:'music-1',type:'service',name:'Set acústico',price:450,description:'Presentación íntima para restaurantes, lounges y eventos pequeños.',image:pexels(1190297),appointment:true,duration:90,deposit:100,employees:['Alex'],badge:'Popular'},
      {id:'music-2',type:'service',name:'Full Live Performance',price:1200,description:'Presentación completa para actividades privadas y eventos.',image:pexels(1763075),appointment:true,duration:180,deposit:300,employees:['Alex'],badge:'Featured'},
      {id:'music-3',type:'service',name:'Meet & Plan',price:0,displayPrice:'Consulta gratis',description:'Llamada para coordinar repertorio, horario y requisitos técnicos.',image:pexels(164829),appointment:true,duration:30,employees:['Alex'],purchasable:false}
    ],
    employees: [{id:'music-alex',name:'Alex Rivera',role:'Performing Artist',initials:'AR',services:['Set acústico','Full Live Performance','Meet & Plan']}],
    bookingLabel: 'Consultar fecha', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Booking artístico sin cadenas de mensajes.',
    aboutText: 'Este template convierte paquetes musicales en opciones claras con disponibilidad, depósito y contacto directo para producción.',
    trust: ['Date availability', 'Event deposits', 'Social links']
  },
  {
    slug: 'motorlab-garage', category: 'Auto Repair', name: 'MotorLab Garage', shortName: 'MOTORLAB',
    kicker: 'DIAGNOSTICS · REPAIR · MAINTENANCE', headline: 'Repairs explained. Appointments simplified.',
    description: 'Taller de mecánica con diagnóstico, mantenimiento, servicios reservables y técnicos asignados.',
    heroImage: pexels(4489732), gallery: [pexels(3806288), pexels(6872172), pexels(8985454)],
    location: 'Bayamón, Puerto Rico', phone: '(787) 555-0204', hours: 'Lun–Sáb · 8 AM–5 PM',
    accent: '#F59E0B', accent2: '#FFD27A', dark: '#151515', cream: '#FFF9ED',
    features: ['Repair booking', 'Diagnostics', 'Technicians', 'Deposits'],
    items: [
      {id:'motor-1',type:'service',name:'Diagnóstico general',price:75,description:'Inspección inicial para identificar fallas y próximos pasos.',image:pexels(3806288),appointment:true,duration:60,employees:['Carlos','Edwin'],badge:'Start here'},
      {id:'motor-2',type:'service',name:'Cambio de aceite',price:65,description:'Servicio de aceite y revisión básica de mantenimiento.',image:pexels(4489732),appointment:true,duration:45,employees:['Edwin']},
      {id:'motor-3',type:'service',name:'Frenos',price:180,description:'Inspección y servicio de frenos según condición del vehículo.',image:pexels(6872172),appointment:true,duration:120,deposit:40,employees:['Carlos']},
      {id:'motor-4',type:'service',name:'Evaluación de reparación mayor',price:95,description:'Evaluación para trabajos de motor, suspensión o transmisión.',image:pexels(8985454),appointment:true,duration:90,employees:['Carlos'],badge:'Advanced'}
    ],
    employees: [
      {id:'motor-carlos',name:'Carlos Méndez',role:'Master Technician',initials:'CM',services:['Diagnóstico general','Frenos','Evaluación de reparación mayor']},
      {id:'motor-edwin',name:'Edwin López',role:'Service Technician',initials:'EL',services:['Diagnóstico general','Cambio de aceite']}
    ],
    bookingLabel: 'Reservar diagnóstico', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Un taller con agenda clara desde el primer contacto.',
    aboutText: 'MotorLab organiza servicios por técnico y duración para reducir llamadas y mejorar el flujo de citas.',
    trust: ['Technician matching', 'Service duration', 'Appointment deposits']
  },
  {
    slug: 'manos-de-confianza-care', category: 'Care Services', name: 'Manos de Confianza', shortName: 'MANOS DE CONFIANZA',
    kicker: 'CHILDCARE · SENIOR CARE · FAMILY SUPPORT', headline: 'Care built around the people you love.',
    description: 'Servicios de cuido para niños y envejecientes con consultas, visitas, cuidadores y horarios coordinados.',
    heroImage: pexels(7551754), gallery: [pexels(3768131), pexels(7551762), pexels(4473870)],
    location: 'San Juan, Puerto Rico', phone: '(787) 555-0205', hours: 'Lun–Dom · By schedule',
    accent: '#4F8A8B', accent2: '#A8D8D8', dark: '#17393A', cream: '#F4FBFB',
    features: ['Care consultation', 'Caregiver booking', 'Family contact', 'Scheduling'],
    items: [
      {id:'care-1',type:'service',name:'Consulta de cuido infantil',price:0,displayPrice:'Consulta gratis',description:'Conversación inicial para conocer necesidades, horarios y rutina del menor.',image:pexels(3768131),appointment:true,duration:30,employees:['María'],purchasable:false},
      {id:'care-2',type:'service',name:'Cuido infantil por hora',price:22,description:'Servicio programado de cuidado infantil en el hogar.',image:pexels(7551754),appointment:true,duration:120,deposit:25,employees:['María','Elena']},
      {id:'care-3',type:'service',name:'Acompañamiento para envejecientes',price:24,description:'Compañía y apoyo no médico para adultos mayores.',image:pexels(7551762),appointment:true,duration:120,deposit:25,employees:['Elena'],badge:'Senior care'},
      {id:'care-4',type:'service',name:'Consulta familiar',price:0,displayPrice:'Consulta gratis',description:'Coordinación inicial de horarios y tipo de apoyo requerido.',image:pexels(4473870),appointment:true,duration:30,employees:['María','Elena'],purchasable:false}
    ],
    employees: [
      {id:'care-maria',name:'María Torres',role:'Childcare Provider',initials:'MT',services:['Consulta de cuido infantil','Cuido infantil por hora','Consulta familiar']},
      {id:'care-elena',name:'Elena Ramos',role:'Family Care Provider',initials:'ER',services:['Cuido infantil por hora','Acompañamiento para envejecientes','Consulta familiar']}
    ],
    bookingLabel: 'Coordinar consulta', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Coordinación clara para servicios sensibles.',
    aboutText: 'Este template está diseñado para presentar servicios de cuido, perfiles y disponibilidad sin hacer afirmaciones médicas.',
    trust: ['Family intake', 'Provider schedules', 'Clear service scope']
  },
  {
    slug: 'pour-house-bartending', category: 'Bartending', name: 'Pour House Events', shortName: 'POUR HOUSE',
    kicker: 'MOBILE BAR · EVENTS · EXPERIENCES', headline: 'A polished bar experience, wherever you celebrate.',
    description: 'Bartending móvil para bodas, cumpleaños y eventos corporativos con paquetes, add-ons y depósitos.',
    heroImage: pexels(1283219), gallery: [pexels(602750), pexels(2531186), pexels(1267361)],
    location: 'Puerto Rico', phone: '(787) 555-0206', hours: 'Events · By reservation',
    accent: '#D4A373', accent2: '#F0D1B2', dark: '#1B1715', cream: '#FFF9F3',
    features: ['Event booking', 'Packages', 'Deposits', 'Inquiry form'],
    items: [
      {id:'bar-1',type:'service',name:'Bartender Solo',price:350,description:'Servicio de bartender para eventos pequeños de duración limitada.',image:pexels(602750),appointment:true,duration:240,deposit:100,employees:['Nico'],badge:'Small events'},
      {id:'bar-2',type:'service',name:'Mobile Bar Experience',price:850,description:'Paquete de barra móvil con setup y servicio para eventos medianos.',image:pexels(1283219),appointment:true,duration:300,deposit:200,employees:['Nico','Sara'],badge:'Popular'},
      {id:'bar-3',type:'service',name:'Wedding Bar Service',price:1500,description:'Servicio ampliado para bodas y actividades de mayor duración.',image:pexels(2531186),appointment:true,duration:420,deposit:350,employees:['Nico','Sara']},
      {id:'bar-4',type:'service',name:'Event consultation',price:0,displayPrice:'Free consultation',description:'Consulta para estimar invitados, tiempo y necesidades del evento.',image:pexels(1267361),appointment:true,duration:30,employees:['Sara'],purchasable:false}
    ],
    employees: [
      {id:'bar-nico',name:'Nico Rivera',role:'Lead Bartender',initials:'NR',services:['Bartender Solo','Mobile Bar Experience','Wedding Bar Service']},
      {id:'bar-sara',name:'Sara León',role:'Event Coordinator',initials:'SL',services:['Mobile Bar Experience','Wedding Bar Service','Event consultation']}
    ],
    bookingLabel: 'Consultar evento', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Paquetes de evento listos para cotizar y reservar.',
    aboutText: 'Pour House convierte consultas de eventos en paquetes claros con depósitos y disponibilidad por fecha.',
    trust: ['Event deposits', 'Package options', 'Date booking']
  },
  {
    slug: 'mesa-boricua-catering', category: 'Catering', name: 'Mesa Boricua Catering', shortName: 'MESA BORICUA',
    kicker: 'CATERING · EVENTS · PRIVATE DINING', headline: 'Menus made for gathering.',
    description: 'Catering para eventos con paquetes por tamaño, degustaciones, depósitos y consultas de menú.',
    heroImage: pexels(587741), gallery: [pexels(1267320), pexels(958545), pexels(262978)],
    location: 'Puerto Rico', phone: '(787) 555-0207', hours: 'Lun–Sáb · 9 AM–6 PM',
    accent: '#C96A3D', accent2: '#F3B38D', dark: '#2B1C17', cream: '#FFF7F1',
    features: ['Catering packages', 'Tastings', 'Event booking', 'Deposits'],
    items: [
      {id:'cat-1',type:'service',name:'Paquete íntimo · hasta 20 personas',price:650,description:'Paquete de catering para reuniones pequeñas y familiares.',image:pexels(1267320),appointment:true,duration:240,deposit:150,employees:['Chef Ana'],badge:'20 guests'},
      {id:'cat-2',type:'service',name:'Paquete celebración · hasta 50 personas',price:1450,description:'Catering para cumpleaños, actividades y celebraciones medianas.',image:pexels(958545),appointment:true,duration:300,deposit:300,employees:['Chef Ana','Luis'],badge:'Popular'},
      {id:'cat-3',type:'service',name:'Paquete evento grande · hasta 100 personas',price:2850,description:'Servicio de catering ampliado para eventos grandes.',image:pexels(587741),appointment:true,duration:420,deposit:600,employees:['Chef Ana','Luis']},
      {id:'cat-4',type:'service',name:'Degustación / consulta',price:75,description:'Sesión para revisar menú, cantidades y necesidades del evento.',image:pexels(262978),appointment:true,duration:60,employees:['Chef Ana']}
    ],
    employees: [
      {id:'cat-ana',name:'Ana Morales',role:'Executive Chef',initials:'AM',services:['Paquete íntimo · hasta 20 personas','Paquete celebración · hasta 50 personas','Paquete evento grande · hasta 100 personas','Degustación / consulta']},
      {id:'cat-luis',name:'Luis Pérez',role:'Event Operations',initials:'LP',services:['Paquete celebración · hasta 50 personas','Paquete evento grande · hasta 100 personas']}
    ],
    bookingLabel: 'Consultar fecha', cartEnabled: false, bookingEnabled: true, groupBooking: true,
    aboutTitle: 'Menús, capacidad y fechas en una sola experiencia.',
    aboutText: 'Mesa Boricua permite presentar paquetes por cantidad de invitados y coordinar degustaciones o eventos desde el mismo sistema.',
    trust: ['Guest-count packages', 'Event deposits', 'Tasting appointments']
  },
  {
    slug: 'pulse-dj-services', category: 'DJ Services', name: 'Pulse DJ Services', shortName: 'PULSE DJ',
    kicker: 'MUSIC · EVENTS · ENERGY', headline: 'Your event. Your crowd. Your soundtrack.',
    description: 'DJ profesional para bodas, cumpleaños y eventos corporativos con paquetes, consulta previa y depósitos.',
    heroImage: pexels(1540406), gallery: [pexels(2608517), pexels(1190297), pexels(167636)],
    location: 'Puerto Rico', phone: '(787) 555-0210', hours: 'Events · By reservation',
    accent: '#7C3AED', accent2: '#C4B5FD', dark: '#120B24', cream: '#FAF8FF',
    features: ['Event booking', 'DJ packages', 'Deposits', 'Consultation'],
    items: [
      {id:'dj-1',type:'service',name:'DJ Essential',price:450,description:'Servicio de DJ para eventos pequeños con setup básico de audio.',image:pexels(1540406),appointment:true,duration:240,deposit:100,employees:['Marco'],badge:'Popular'},
      {id:'dj-2',type:'service',name:'DJ + Lighting',price:850,description:'Paquete con DJ, audio y luces para eventos medianos.',image:pexels(2608517),appointment:true,duration:300,deposit:200,employees:['Marco','Javi'],badge:'Featured'},
      {id:'dj-3',type:'service',name:'Wedding Experience',price:1500,description:'Cobertura extendida para bodas con coordinación musical previa.',image:pexels(1190297),appointment:true,duration:420,deposit:350,employees:['Marco','Javi']},
      {id:'dj-4',type:'service',name:'Consulta musical',price:0,displayPrice:'Consulta gratis',description:'Reunión para definir estilo musical, tiempos y detalles del evento.',image:pexels(167636),appointment:true,duration:30,employees:['Marco'],purchasable:false}
    ],
    employees: [
      {id:'dj-marco',name:'Marco Rivera',role:'Lead DJ',initials:'MR',services:['DJ Essential','DJ + Lighting','Wedding Experience','Consulta musical']},
      {id:'dj-javi',name:'Javi Soto',role:'Event Production',initials:'JS',services:['DJ + Lighting','Wedding Experience']}
    ],
    bookingLabel: 'Consultar fecha', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Paquetes de entretenimiento listos para reservar.',
    aboutText: 'Pulse muestra cómo un DJ puede organizar paquetes, disponibilidad y depósitos sin manejar todo por mensajes.',
    trust: ['Date booking', 'Event deposits', 'Package options']
  },
  {
    slug: 'solid-build-construction', category: 'Construction', name: 'Solid Build Construction', shortName: 'SOLID BUILD',
    kicker: 'BUILD · REMODEL · IMPROVE', headline: 'Built right from the first estimate.',
    description: 'Servicios de construcción y remodelación con consultas, visitas técnicas, estimados y planificación de proyectos.',
    heroImage: pexels(2219024), gallery: [pexels(1216589), pexels(209266), pexels(2219024)],
    location: 'Puerto Rico', phone: '(787) 555-0211', hours: 'Lun–Sáb · 7 AM–5 PM',
    accent: '#E67E22', accent2: '#F7C98B', dark: '#2A2118', cream: '#FFF8F1',
    features: ['Estimate visits', 'Project consultation', 'Team assignment', 'Lead form'],
    items: [
      {id:'build-1',type:'service',name:'Visita para estimado',price:0,displayPrice:'Cotización',description:'Visita inicial para evaluar alcance, medidas y necesidades del proyecto.',image:pexels(1216589),appointment:true,duration:60,employees:['Rafael'],purchasable:false,badge:'Start here'},
      {id:'build-2',type:'service',name:'Remodelación interior',price:3500,displayPrice:'Desde $3,500',description:'Servicio de remodelación de interiores sujeto a evaluación.',image:pexels(209266),appointment:true,duration:120,deposit:250,employees:['Rafael','Luis']},
      {id:'build-3',type:'service',name:'Construcción liviana',price:2500,displayPrice:'Desde $2,500',description:'Trabajos de construcción liviana y mejoras estructurales menores.',image:pexels(2219024),appointment:true,duration:120,deposit:250,employees:['Luis']},
      {id:'build-4',type:'service',name:'Consulta de proyecto',price:95,description:'Sesión para revisar ideas, prioridades y próximos pasos.',image:pexels(209266),appointment:true,duration:45,employees:['Rafael']}
    ],
    employees: [
      {id:'build-rafael',name:'Rafael Ortiz',role:'Project Lead',initials:'RO',services:['Visita para estimado','Remodelación interior','Consulta de proyecto']},
      {id:'build-luis',name:'Luis Vega',role:'Construction Specialist',initials:'LV',services:['Remodelación interior','Construcción liviana']}
    ],
    bookingLabel: 'Solicitar estimado', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Del primer contacto al proyecto organizado.',
    aboutText: 'Solid Build permite convertir solicitudes de construcción en visitas técnicas y consultas estructuradas.',
    trust: ['Estimate visits', 'Project intake', 'Team schedules']
  },
  {
    slug: 'fresh-home-cleaning', category: 'House Cleaning', name: 'Fresh Home Cleaning', shortName: 'FRESH HOME',
    kicker: 'CLEAN · RESET · RELAX', headline: 'A cleaner home, without the back-and-forth.',
    description: 'Servicios de limpieza residencial con paquetes, frecuencia, disponibilidad y personal asignado.',
    heroImage: pexels(4239031), gallery: [pexels(4107120), pexels(4099264), pexels(6197122)],
    location: 'Puerto Rico', phone: '(787) 555-0212', hours: 'Lun–Sáb · 8 AM–6 PM',
    accent: '#38BDF8', accent2: '#BAE6FD', dark: '#113247', cream: '#F3FBFF',
    features: ['Cleaning booking', 'Recurring visits', 'Team assignment', 'Deposits'],
    items: [
      {id:'clean-1',type:'service',name:'Limpieza básica',price:95,description:'Limpieza general de áreas principales del hogar.',image:pexels(4107120),appointment:true,duration:120,deposit:20,employees:['Ana','Mia'],badge:'Popular'},
      {id:'clean-2',type:'service',name:'Deep Cleaning',price:185,description:'Limpieza profunda con atención adicional a cocina, baños y detalles.',image:pexels(4239031),appointment:true,duration:240,deposit:40,employees:['Ana'],badge:'Deep clean'},
      {id:'clean-3',type:'service',name:'Move In / Move Out',price:225,description:'Limpieza completa para propiedades vacías antes o después de mudanza.',image:pexels(6197122),appointment:true,duration:300,deposit:50,employees:['Ana','Mia']},
      {id:'clean-4',type:'service',name:'Consulta de frecuencia',price:0,displayPrice:'Gratis',description:'Consulta para organizar mantenimiento semanal o quincenal.',image:pexels(4099264),appointment:true,duration:20,employees:['Mia'],purchasable:false}
    ],
    employees: [
      {id:'clean-ana',name:'Ana López',role:'Cleaning Lead',initials:'AL',services:['Limpieza básica','Deep Cleaning','Move In / Move Out']},
      {id:'clean-mia',name:'Mia Torres',role:'Home Care Specialist',initials:'MT',services:['Limpieza básica','Move In / Move Out','Consulta de frecuencia']}
    ],
    bookingLabel: 'Reservar limpieza', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Limpieza residencial con horarios claros.',
    aboutText: 'Fresh Home organiza servicios por duración, equipo y frecuencia para facilitar reservas repetidas.',
    trust: ['Recurring service', 'Team assignment', 'Easy booking']
  },
  {
    slug: 'sealpro-roofing', category: 'Roof Sealing', name: 'SealPro Roofing', shortName: 'SEALPRO',
    kicker: 'ROOF SEALING · REPAIR · PROTECTION', headline: 'Protect your roof before the next storm.',
    description: 'Sellado de techos, inspecciones, mantenimiento y reparaciones con visitas para estimado y citas técnicas.',
    heroImage: pexels(439391), gallery: [pexels(259588), pexels(280229), pexels(2219024)],
    location: 'Puerto Rico', phone: '(787) 555-0213', hours: 'Lun–Sáb · 7 AM–5 PM',
    accent: '#0EA5E9', accent2: '#7DD3FC', dark: '#102A3A', cream: '#F4FBFF',
    features: ['Roof inspection', 'Estimate visit', 'Repair booking', 'Lead form'],
    items: [
      {id:'roof-1',type:'service',name:'Inspección de techo',price:75,description:'Evaluación visual para identificar filtraciones, grietas y áreas críticas.',image:pexels(439391),appointment:true,duration:60,employees:['Joel'],badge:'Start here'},
      {id:'roof-2',type:'service',name:'Sellado preventivo',price:850,displayPrice:'Desde $850',description:'Servicio de sellado preventivo sujeto a medida y condición del techo.',image:pexels(259588),appointment:true,duration:120,deposit:150,employees:['Joel','Eric']},
      {id:'roof-3',type:'service',name:'Reparación de filtración',price:275,displayPrice:'Desde $275',description:'Reparación localizada de filtraciones y puntos vulnerables.',image:pexels(280229),appointment:true,duration:90,deposit:75,employees:['Eric']},
      {id:'roof-4',type:'service',name:'Visita para cotización',price:0,displayPrice:'Cotización gratis',description:'Visita para medir área y preparar un estimado.',image:pexels(2219024),appointment:true,duration:45,employees:['Joel'],purchasable:false}
    ],
    employees: [
      {id:'roof-joel',name:'Joel Santiago',role:'Roofing Specialist',initials:'JS',services:['Inspección de techo','Sellado preventivo','Visita para cotización']},
      {id:'roof-eric',name:'Eric Ramos',role:'Repair Technician',initials:'ER',services:['Sellado preventivo','Reparación de filtración']}
    ],
    bookingLabel: 'Solicitar inspección', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Inspecciones y estimados sin complicaciones.',
    aboutText: 'SealPro convierte solicitudes de sellado y filtraciones en visitas técnicas organizadas.',
    trust: ['Inspection booking', 'Estimate visits', 'Repair scheduling']
  },
  {
    slug: 'agua-clara-plumbing', category: 'Plumbing', name: 'Agua Clara Plumbing', shortName: 'AGUA CLARA',
    kicker: 'PLUMBING · REPAIRS · INSTALLATION', headline: 'Leaks fixed. Water flowing.',
    description: 'Servicios de plomería para reparaciones, instalaciones, destapes y diagnósticos con técnicos asignados.',
    heroImage: pexels(8486972), gallery: [pexels(8005397), pexels(8486974), pexels(5691622)],
    location: 'Puerto Rico', phone: '(787) 555-0214', hours: 'Lun–Sáb · 7 AM–6 PM',
    accent: '#0284C7', accent2: '#93C5FD', dark: '#0C2C42', cream: '#F3FAFF',
    features: ['Service booking', 'Emergency requests', 'Technicians', 'Quote visits'],
    items: [
      {id:'plumb-1',type:'service',name:'Diagnóstico de plomería',price:85,description:'Evaluación inicial para identificar la causa del problema.',image:pexels(8486972),appointment:true,duration:60,employees:['Miguel','Leo'],badge:'Start here'},
      {id:'plumb-2',type:'service',name:'Reparación de fuga',price:140,displayPrice:'Desde $140',description:'Reparación de fugas visibles o accesibles.',image:pexels(8005397),appointment:true,duration:90,deposit:30,employees:['Miguel']},
      {id:'plumb-3',type:'service',name:'Destape de tubería',price:125,description:'Servicio de destape para drenajes y tuberías residenciales.',image:pexels(5691622),appointment:true,duration:90,employees:['Leo']},
      {id:'plumb-4',type:'service',name:'Instalación de fixture',price:165,displayPrice:'Desde $165',description:'Instalación de grifería, lavamanos u otros fixtures.',image:pexels(8486974),appointment:true,duration:120,deposit:35,employees:['Miguel','Leo']}
    ],
    employees: [
      {id:'plumb-miguel',name:'Miguel Cruz',role:'Licensed Plumber',initials:'MC',services:['Diagnóstico de plomería','Reparación de fuga','Instalación de fixture']},
      {id:'plumb-leo',name:'Leo Rivera',role:'Plumbing Technician',initials:'LR',services:['Diagnóstico de plomería','Destape de tubería','Instalación de fixture']}
    ],
    bookingLabel: 'Reservar plomero', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Servicios de plomería organizados por problema.',
    aboutText: 'Agua Clara ayuda al cliente a seleccionar el tipo de servicio y coordinar la visita del técnico adecuado.',
    trust: ['Technician assignment', 'Repair booking', 'Quote-ready']
  },
  {
    slug: 'volt-pro-electric', category: 'Electrician', name: 'Volt Pro Electric', shortName: 'VOLT PRO',
    kicker: 'ELECTRICAL · INSTALLATION · TROUBLESHOOTING', headline: 'Safe power. Clear scheduling.',
    description: 'Servicios eléctricos para diagnóstico, instalaciones, paneles y reparaciones con técnicos y citas.',
    heroImage: pexels(257736), gallery: [pexels(442150), pexels(8005397), pexels(5691630)],
    location: 'Puerto Rico', phone: '(787) 555-0215', hours: 'Lun–Sáb · 7 AM–6 PM',
    accent: '#FACC15', accent2: '#FDE68A', dark: '#1F2937', cream: '#FFFDF2',
    features: ['Electrical booking', 'Technicians', 'Estimate visits', 'Contact form'],
    items: [
      {id:'elec-1',type:'service',name:'Diagnóstico eléctrico',price:95,description:'Evaluación de fallas, breakers, tomas y circuitos.',image:pexels(257736),appointment:true,duration:60,employees:['Iván','Raúl'],badge:'Start here'},
      {id:'elec-2',type:'service',name:'Instalación de lámpara o abanico',price:145,displayPrice:'Desde $145',description:'Instalación de fixture eléctrico residencial.',image:pexels(442150),appointment:true,duration:90,deposit:30,employees:['Iván']},
      {id:'elec-3',type:'service',name:'Reparación de circuito',price:175,displayPrice:'Desde $175',description:'Diagnóstico y reparación de problemas en circuitos existentes.',image:pexels(5691630),appointment:true,duration:120,deposit:40,employees:['Raúl']},
      {id:'elec-4',type:'service',name:'Visita para panel / proyecto',price:0,displayPrice:'Cotización',description:'Evaluación para trabajos mayores o paneles.',image:pexels(8005397),appointment:true,duration:45,employees:['Iván'],purchasable:false}
    ],
    employees: [
      {id:'elec-ivan',name:'Iván Morales',role:'Electrician',initials:'IM',services:['Diagnóstico eléctrico','Instalación de lámpara o abanico','Visita para panel / proyecto']},
      {id:'elec-raul',name:'Raúl Pérez',role:'Electrical Technician',initials:'RP',services:['Diagnóstico eléctrico','Reparación de circuito']}
    ],
    bookingLabel: 'Reservar electricista', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Servicios eléctricos con visitas programadas.',
    aboutText: 'Volt Pro organiza diagnósticos y proyectos por técnico, duración y tipo de trabajo.',
    trust: ['Technician schedules', 'Estimate visits', 'Service booking']
  },
  {
    slug: 'precision-auto-body', category: 'Auto Body', name: 'Precision Auto Body', shortName: 'PRECISION',
    kicker: 'BODYWORK · PAINT · COLLISION', headline: 'From damage to clean lines again.',
    description: 'Hojalatería y pintura con inspecciones, estimados, reparación de paneles y citas para evaluación.',
    heroImage: pexels(3806288), gallery: [pexels(6872172), pexels(4489732), pexels(8985454)],
    location: 'Puerto Rico', phone: '(787) 555-0216', hours: 'Lun–Sáb · 8 AM–5 PM',
    accent: '#EF4444', accent2: '#FCA5A5', dark: '#171717', cream: '#FFF5F5',
    features: ['Damage inspection', 'Estimate booking', 'Body repair', 'Paint services'],
    items: [
      {id:'body-1',type:'service',name:'Inspección de daños',price:0,displayPrice:'Evaluación',description:'Evaluación inicial de golpes, paneles y pintura.',image:pexels(3806288),appointment:true,duration:45,employees:['Tony'],purchasable:false,badge:'Start here'},
      {id:'body-2',type:'service',name:'Reparación de panel',price:350,displayPrice:'Desde $350',description:'Reparación de golpes y deformaciones en paneles.',image:pexels(6872172),appointment:true,duration:120,deposit:75,employees:['Tony','Luis']},
      {id:'body-3',type:'service',name:'Pintura parcial',price:450,displayPrice:'Desde $450',description:'Preparación y pintura localizada de paneles.',image:pexels(4489732),appointment:true,duration:120,deposit:100,employees:['Luis']},
      {id:'body-4',type:'service',name:'Cotización de colisión',price:0,displayPrice:'Cotización',description:'Evaluación para reparación de daños por choque.',image:pexels(8985454),appointment:true,duration:60,employees:['Tony'],purchasable:false}
    ],
    employees: [
      {id:'body-tony',name:'Tony Rivera',role:'Body Repair Specialist',initials:'TR',services:['Inspección de daños','Reparación de panel','Cotización de colisión']},
      {id:'body-luis',name:'Luis Cruz',role:'Paint Specialist',initials:'LC',services:['Reparación de panel','Pintura parcial']}
    ],
    bookingLabel: 'Solicitar evaluación', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Evaluación visual antes de comenzar la reparación.',
    aboutText: 'Precision permite organizar inspecciones, estimados y servicios de hojalatería en un flujo claro.',
    trust: ['Damage inspection', 'Repair estimates', 'Paint scheduling']
  },
  {
    slug: 'bella-vita-salon', category: 'Cosmetology', name: 'Bella Vita Salon', shortName: 'BELLA VITA',
    kicker: 'HAIR · BEAUTY · STYLE', headline: 'Your look, your appointment, your stylist.',
    description: 'Salón de belleza y cosmetología con servicios de cabello, color, maquillaje, uñas y estilistas con disponibilidad individual.',
    heroImage: pexels(3992874), gallery: [pexels(3993449), pexels(7755226), pexels(853427)],
    location: 'San Juan, Puerto Rico', phone: '(787) 555-0217', hours: 'Mar–Sáb · 9 AM–7 PM',
    accent: '#D946A8', accent2: '#F4A8D8', dark: '#2B1623', cream: '#FFF6FB',
    features: ['Salon booking', 'Stylist selection', 'Deposits', 'Beauty services'],
    items: [
      {id:'cosmo-1',type:'service',name:'Blower & Styling',price:45,description:'Lavado, blower y estilizado profesional.',image:pexels(3993449),appointment:true,duration:60,deposit:10,employees:['Camila','Andrea'],badge:'Popular'},
      {id:'cosmo-2',type:'service',name:'Color completo',price:120,displayPrice:'Desde $120',description:'Servicio de color completo sujeto a largo y condición del cabello.',image:pexels(7755226),appointment:true,duration:150,deposit:35,employees:['Camila'],badge:'Color'},
      {id:'cosmo-3',type:'service',name:'Keratina',price:175,displayPrice:'Desde $175',description:'Tratamiento de keratina para suavizar y manejar el cabello.',image:pexels(3992874),appointment:true,duration:180,deposit:50,employees:['Camila','Andrea']},
      {id:'cosmo-4',type:'service',name:'Maquillaje profesional',price:85,description:'Maquillaje profesional para eventos y ocasiones especiales.',image:pexels(853427),appointment:true,duration:75,deposit:20,employees:['Valeria']},
      {id:'cosmo-5',type:'service',name:'Manicure & Gel',price:55,description:'Manicure con acabado en gel y diseño básico.',image:pexels(7755653),appointment:true,duration:60,deposit:10,employees:['Valeria']},
      {id:'cosmo-6',type:'service',name:'Consulta de transformación',price:0,displayPrice:'Consulta gratis',description:'Consulta para cambios de color, corte o transformación de imagen.',image:pexels(3764014),appointment:true,duration:30,employees:['Camila'],purchasable:false}
    ],
    employees: [
      {id:'cosmo-camila',name:'Camila Rivera',role:'Master Cosmetologist',initials:'CR',services:['Blower & Styling','Color completo','Keratina','Consulta de transformación']},
      {id:'cosmo-andrea',name:'Andrea López',role:'Hair Stylist',initials:'AL',services:['Blower & Styling','Keratina']},
      {id:'cosmo-valeria',name:'Valeria Soto',role:'Beauty & Nail Artist',initials:'VS',services:['Maquillaje profesional','Manicure & Gel']}
    ],
    bookingLabel: 'Reservar cita', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Un salón completo con agenda por especialista.',
    aboutText: 'Bella Vita demuestra cómo un salón de cosmetología puede conectar cada servicio con la profesional indicada, manejar duración y depósitos, y organizar reservas desde una sola página.',
    trust: ['Stylist selection', 'Service duration', 'Beauty deposits']
  }
]


export type TemplateGroup = {
  id: string
  nameEs: string
  nameEn: string
  categories: string[]
}

export const templateGroups: TemplateGroup[] = [
  {id:'food-hospitality',nameEs:'Comida y Hospitalidad',nameEn:'Food & Hospitality',categories:['Restaurant','Catering','Bartending']},
  {id:'beauty-wellness',nameEs:'Belleza y Bienestar',nameEn:'Beauty & Wellness',categories:['Barber','Beauty','Cosmetology','Wellness']},
  {id:'automotive',nameEs:'Automotriz',nameEn:'Automotive',categories:['Car Wash','Auto Repair','Auto Body']},
  {id:'home-property',nameEs:'Hogar y Propiedad',nameEn:'Home & Property Services',categories:['Landscaping','Construction','House Cleaning','Roof Sealing','Plumbing','Electrician']},
  {id:'events-entertainment',nameEs:'Eventos y Entretenimiento',nameEn:'Events & Entertainment',categories:['Music Artist','DJ Services']},
  {id:'professional',nameEs:'Servicios Profesionales',nameEn:'Professional Services',categories:['Professional Services','Real Estate']},
  {id:'retail-creative',nameEs:'Retail y Creativo',nameEn:'Retail & Creative',categories:['Retail','Other']},
  {id:'care',nameEs:'Servicios de Cuido',nameEn:'Care Services',categories:['Care Services']},
]

export const templateGroupForCategory = (category: string) =>
  templateGroups.find((group) => group.categories.includes(category))

export const templateBySlug = (slug: string) => templateConfigs.find((template) => template.slug === slug)
