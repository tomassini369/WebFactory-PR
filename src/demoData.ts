export type DemoItem = {
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

export type DemoEmployee = {
  id: string
  name: string
  role: string
  initials: string
  services: string[]
}

export type DemoConfig = {
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
  items: DemoItem[]
  employees: DemoEmployee[]
  bookingLabel: string
  cartEnabled: boolean
  bookingEnabled: boolean
  groupBooking?: boolean
  aboutTitle: string
  aboutText: string
  trust: string[]
}

const pexels = (id: number, width = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`

export const demoConfigs: DemoConfig[] = [
  {
    slug: 'brisa-cocina', category: 'Restaurant', name: 'Brisa Cocina', shortName: 'BRISA',
    kicker: 'COCINA COSTERA · SAN JUAN', headline: 'Sabores del Caribe, servidos con calma.',
    description: 'Una experiencia gastronómica contemporánea con ordering online, platos destacados y reservaciones para cena.',
    heroImage: pexels(14415367), gallery: [pexels(34313364), pexels(18756733), pexels(16028535)],
    location: 'San Juan, Puerto Rico', phone: '(787) 555-0118', hours: 'Mar–Dom · 12 PM–10 PM',
    accent: '#E76F51', accent2: '#F4A261', dark: '#1E2B29', cream: '#FFF8F0',
    features: ['Online ordering', 'Table reservations', 'Menu catalog', 'ATH Móvil'],
    items: [
      {id:'brisa-1',type:'product',name:'Mofongo del Mar',price:22,description:'Mofongo de plátano verde con camarones al ajillo y caldo criollo.',image:pexels(34313364),badge:'Chef favorite'},
      {id:'brisa-2',type:'product',name:'Coastal Bowl',price:18,description:'Arroz jazmín, vegetales frescos, aguacate y proteína a escoger.',image:pexels(6941010),badge:'Fresh'},
      {id:'brisa-3',type:'product',name:'Tres Leches Brisa',price:9,description:'Bizcocho húmedo, crema ligera y toque de canela.',image:pexels(18756733),badge:'Dessert'},
      {id:'brisa-4',type:'service',name:'Reserva para cena',price:0,displayPrice:'Reserva gratis',description:'Reserva una mesa y confirma tu hora preferida.',image:pexels(16028535),appointment:true,duration:90,purchasable:false}
    ],
    employees: [], bookingLabel: 'Reservar mesa', cartEnabled: true, bookingEnabled: true, groupBooking: true,
    aboutTitle: 'Cocina contemporánea con raíces locales.',
    aboutText: 'Este demo combina catálogo de menú, ordering, carrito, horarios y reservaciones para mostrar cómo un restaurante puede centralizar su experiencia digital.',
    trust: ['Fresh daily', 'Secure checkout', 'Mobile ordering']
  },
  {
    slug: 'velocity-auto', category: 'Automotive', name: 'Velocity Auto Care', shortName: 'VELOCITY',
    kicker: 'DETAILING · PROTECTION · CARE', headline: 'Your car deserves showroom energy.',
    description: 'Detailing premium con servicios reservables, técnicos asignados, depósitos y una experiencia visual de alto impacto.',
    heroImage: pexels(37809581), gallery: [pexels(31154216), pexels(29504461), pexels(29185579)],
    location: 'Bayamón, Puerto Rico', phone: '(787) 555-0184', hours: 'Lun–Sáb · 8 AM–6 PM',
    accent: '#8DFF00', accent2: '#D2FF66', dark: '#050505', cream: '#F6F8F3',
    features: ['Service booking', 'Technician selection', 'Deposits', 'WhatsApp'],
    items: [
      {id:'vel-1',type:'service',name:'Signature Detail',price:149,description:'Lavado profundo, descontaminación, interior premium y protección final.',image:pexels(31154216),appointment:true,duration:180,deposit:40,employees:['Mateo','Luis'],badge:'Popular'},
      {id:'vel-2',type:'service',name:'Ceramic Coating',price:299,description:'Preparación de pintura y coating cerámico para brillo y protección duradera.',image:pexels(29504461),appointment:true,duration:240,deposit:50,employees:['Mateo'],badge:'Premium'},
      {id:'vel-3',type:'service',name:'Interior Reset',price:95,description:'Limpieza profunda de superficies, aspirado, tratamiento y acabado interior.',image:pexels(29185579),appointment:true,duration:120,deposit:25,employees:['Luis','Adrián']},
      {id:'vel-4',type:'product',name:'Aftercare Kit',price:39,description:'Kit de mantenimiento para conservar el acabado entre visitas.',image:pexels(37809550),badge:'Shop'}
    ],
    employees: [
      {id:'mateo',name:'Mateo Cruz',role:'Paint & Ceramic Specialist',initials:'MC',services:['Signature Detail','Ceramic Coating']},
      {id:'luis',name:'Luis Vega',role:'Detail Technician',initials:'LV',services:['Signature Detail','Interior Reset']},
      {id:'adrian',name:'Adrián Soto',role:'Interior Specialist',initials:'AS',services:['Interior Reset']}
    ],
    bookingLabel: 'Reservar servicio', cartEnabled: true, bookingEnabled: true,
    aboutTitle: 'Servicios visuales que se venden solos.',
    aboutText: 'Velocity demuestra cómo WebFactory combina servicios reservables, depósitos, selección de técnico, productos complementarios y WhatsApp en una sola experiencia.',
    trust: ['Deposit ready', 'Employee schedules', 'Service gallery']
  },
  {
    slug: 'northline-barber', category: 'Barber', name: 'Northline Barber Studio', shortName: 'NORTHLINE',
    kicker: 'MODERN GROOMING STUDIO', headline: 'Look sharp. Book fast.',
    description: 'Un barber studio moderno donde cada servicio se conecta con el profesional correcto y su disponibilidad.',
    heroImage: pexels(19664876), gallery: [pexels(19225277), pexels(27467943), pexels(3992849)],
    location: 'Caguas, Puerto Rico', phone: '(787) 555-0139', hours: 'Mar–Sáb · 9 AM–7 PM',
    accent: '#D1B07C', accent2: '#F0D7AE', dark: '#111111', cream: '#F7F3EE',
    features: ['Employee booking', 'Service duration', 'Deposits', 'Google Calendar'],
    items: [
      {id:'north-1',type:'service',name:'Signature Haircut',price:35,description:'Consulta rápida, corte de precisión, styling y acabado.',image:pexels(27467943),appointment:true,duration:45,deposit:10,employees:['Carlos','José'],badge:'Most booked'},
      {id:'north-2',type:'service',name:'Cut + Beard',price:50,description:'Corte completo con perfilado y acabado de barba.',image:pexels(7518742),appointment:true,duration:60,deposit:15,employees:['Carlos']},
      {id:'north-3',type:'service',name:'Beard Sculpt',price:25,description:'Diseño, líneas y tratamiento final para barba.',image:pexels(9992820),appointment:true,duration:30,employees:['José','Carlos']},
      {id:'north-4',type:'product',name:'Matte Styling Clay',price:24,description:'Fijación flexible con acabado natural.',image:pexels(19225277),badge:'Retail'}
    ],
    employees: [
      {id:'carlos',name:'Carlos Rivera',role:'Master Barber',initials:'CR',services:['Signature Haircut','Cut + Beard','Beard Sculpt']},
      {id:'jose',name:'José Medina',role:'Barber',initials:'JM',services:['Signature Haircut','Beard Sculpt']}
    ],
    bookingLabel: 'Reservar cita', cartEnabled: true, bookingEnabled: true,
    aboutTitle: 'Service + Employee + Time en acción.',
    aboutText: 'Este demo está diseñado para enseñar claramente la lógica principal de WebFactory: un cliente escoge el servicio, luego el profesional autorizado y finalmente un horario disponible.',
    trust: ['45–60 min slots', 'Professional selection', 'Calendar-ready']
  },
  {
    slug: 'aura-beauty', category: 'Beauty', name: 'Aura Beauty Lab', shortName: 'AURA',
    kicker: 'SKIN · BEAUTY · SELF CARE', headline: 'Treatments designed around you.',
    description: 'Beauty studio premium con servicios, especialistas, depósitos y reservas organizadas en una experiencia elegante.',
    heroImage: pexels(33607393), gallery: [pexels(5178021), pexels(30809944), pexels(6899550)],
    location: 'Guaynabo, Puerto Rico', phone: '(787) 555-0162', hours: 'Lun–Sáb · 10 AM–7 PM',
    accent: '#B66D8F', accent2: '#E9BFD1', dark: '#2A1C25', cream: '#FFF8FB',
    features: ['Beauty bookings', 'Specialists', 'Deposits', 'Service gallery'],
    items: [
      {id:'aura-1',type:'service',name:'Glow Facial',price:95,description:'Facial hidratante con limpieza profunda, exfoliación y máscara.',image:pexels(30809944),appointment:true,duration:60,deposit:25,employees:['Sofía','Camila'],badge:'Signature'},
      {id:'aura-2',type:'service',name:'Advanced Skin Session',price:135,description:'Tratamiento personalizado según objetivos y condición de la piel.',image:pexels(32646004),appointment:true,duration:75,deposit:35,employees:['Sofía']},
      {id:'aura-3',type:'service',name:'Brow Design',price:42,description:'Diseño y definición de cejas con consulta inicial.',image:pexels(6953630),appointment:true,duration:35,employees:['Camila']},
      {id:'aura-4',type:'product',name:'Daily Glow Serum',price:38,description:'Serum facial ligero para rutina diaria.',image:pexels(5178021),badge:'Shop'}
    ],
    employees: [
      {id:'sofia',name:'Sofía Morales',role:'Lead Esthetician',initials:'SM',services:['Glow Facial','Advanced Skin Session']},
      {id:'camila',name:'Camila Reyes',role:'Beauty Specialist',initials:'CR',services:['Glow Facial','Brow Design']}
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
    heroImage: pexels(8436730), gallery: [pexels(7598366), pexels(10976271), pexels(4998846)],
    location: 'Dorado, Puerto Rico', phone: '(787) 555-0151', hours: 'Lun–Dom · 7 AM–8 PM',
    accent: '#799B7A', accent2: '#BCD2B7', dark: '#213128', cream: '#F4F7F0',
    features: ['Group capacity', 'Classes', 'Massage booking', 'Membership-ready'],
    items: [
      {id:'bal-1',type:'class',name:'Morning Flow',price:22,description:'Clase de yoga de ritmo suave para comenzar el día.',image:pexels(8436635),appointment:true,duration:60,employees:['Elena'],groupCapacity:15,badge:'15 spots'},
      {id:'bal-2',type:'class',name:'Reset Yoga',price:24,description:'Movilidad, respiración y recuperación guiada.',image:pexels(6339386),appointment:true,duration:60,employees:['Elena','Nadia'],groupCapacity:12},
      {id:'bal-3',type:'service',name:'Restorative Massage',price:110,description:'Masaje individual enfocado en relajación y recuperación.',image:pexels(6186768),appointment:true,duration:75,deposit:25,employees:['Nadia']},
      {id:'bal-4',type:'product',name:'Balance Candle',price:28,description:'Vela aromática inspirada en el estudio.',image:pexels(35884502),badge:'Studio shop'}
    ],
    employees: [
      {id:'elena',name:'Elena Ortiz',role:'Yoga Instructor',initials:'EO',services:['Morning Flow','Reset Yoga']},
      {id:'nadia',name:'Nadia Torres',role:'Wellness Therapist',initials:'NT',services:['Reset Yoga','Restorative Massage']}
    ],
    bookingLabel: 'Reserve your spot', cartEnabled: true, bookingEnabled: true, groupBooking: true,
    aboutTitle: 'Individual appointments + group capacity.',
    aboutText: 'Balance enseña la excepción grupal del sistema: una clase puede tener un instructor y múltiples espacios disponibles, mientras el masaje permanece como cita individual.',
    trust: ['Class capacity', 'Individual services', 'Schedule blocks']
  },
  {
    slug: 'luna-market', category: 'Retail', name: 'Luna Market Boutique', shortName: 'LUNA',
    kicker: 'CURATED EVERYDAY STYLE', headline: 'A small shop with a big online shelf.',
    description: 'Boutique retail enfocada en catálogo, product detail, carrito y checkout para demostrar el lado commerce de WebFactory.',
    heroImage: pexels(5864244), gallery: [pexels(36730399), pexels(8306374), pexels(5709656)],
    location: 'Ponce, Puerto Rico', phone: '(787) 555-0173', hours: 'Lun–Sáb · 10 AM–6 PM',
    accent: '#6A5ACD', accent2: '#B9AEFF', dark: '#1E1A32', cream: '#F8F6FF',
    features: ['Product catalog', 'Item detail', 'Cart', 'Stripe checkout'],
    items: [
      {id:'luna-1',type:'product',name:'Studio Linen Set',price:68,description:'Conjunto ligero de dos piezas para uso diario.',image:pexels(36730402),badge:'New'},
      {id:'luna-2',type:'product',name:'Everyday Tote',price:42,description:'Tote estructurado con espacio amplio y diseño minimal.',image:pexels(5242823),badge:'Bestseller'},
      {id:'luna-3',type:'product',name:'Soft Knit Layer',price:54,description:'Capa ligera de tejido suave para combinar todo el año.',image:pexels(36730595)},
      {id:'luna-4',type:'product',name:'Minimal Chain',price:29,description:'Accesorio sencillo para looks casuales o de noche.',image:pexels(8306374)}
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
    heroImage: pexels(7433865), gallery: [pexels(7433848), pexels(7433898), pexels(36766669)],
    location: 'San Juan, Puerto Rico', phone: '(787) 555-0196', hours: 'Lun–Vie · 8:30 AM–5 PM',
    accent: '#2D6CDF', accent2: '#8BB5FF', dark: '#101C31', cream: '#F5F8FC',
    features: ['Consultation booking', 'Lead form', 'Team profiles', 'Calendar'],
    items: [
      {id:'sum-1',type:'service',name:'Strategy Session',price:150,description:'Sesión de 60 minutos para prioridades, decisiones y próximos pasos.',image:pexels(7433848),appointment:true,duration:60,employees:['Andrea','Miguel'],badge:'Start here'},
      {id:'sum-2',type:'service',name:'Operations Review',price:275,description:'Revisión estructurada de procesos, cuellos de botella y oportunidades.',image:pexels(7433898),appointment:true,duration:90,deposit:75,employees:['Andrea']},
      {id:'sum-3',type:'service',name:'Growth Planning',price:225,description:'Sesión de planificación para organizar iniciativas de crecimiento.',image:pexels(36766669),appointment:true,duration:75,deposit:50,employees:['Miguel']},
      {id:'sum-4',type:'service',name:'Discovery Call',price:0,displayPrice:'Free',description:'Llamada introductoria para identificar el servicio adecuado.',image:pexels(4342129),appointment:true,duration:20,employees:['Andrea','Miguel'],purchasable:false}
    ],
    employees: [
      {id:'andrea',name:'Andrea Vázquez',role:'Principal Consultant',initials:'AV',services:['Strategy Session','Operations Review','Discovery Call']},
      {id:'miguel',name:'Miguel Santos',role:'Growth Advisor',initials:'MS',services:['Strategy Session','Growth Planning','Discovery Call']}
    ],
    bookingLabel: 'Schedule consultation', cartEnabled: false, bookingEnabled: true,
    aboutTitle: 'Professional services without a generic contact page.',
    aboutText: 'Summit demuestra cómo convertir servicios profesionales en opciones claras, reservables y vinculadas a la agenda de la persona adecuada.',
    trust: ['Consultation slots', 'Team assignment', 'Lead capture']
  },
  {
    slug: 'isla-living', category: 'Real Estate', name: 'Isla Living Realty', shortName: 'ISLA LIVING',
    kicker: 'CURATED HOMES · PUERTO RICO', headline: 'Find the space that feels like your next chapter.',
    description: 'Real estate demo con listings, vistas individuales, agentes y citas para visitas.',
    heroImage: pexels(12441654), gallery: [pexels(17087548), pexels(33685850), pexels(7722158)],
    location: 'Puerto Rico', phone: '(787) 555-0124', hours: 'Lun–Sáb · 9 AM–6 PM',
    accent: '#B98A54', accent2: '#DEC5A5', dark: '#18211F', cream: '#F8F5EF',
    features: ['Property listings', 'Agent booking', 'Detail views', 'Inquiry flow'],
    items: [
      {id:'isla-1',type:'listing',name:'Ocean Residence',price:785000,displayPrice:'$785,000',description:'Residencia contemporánea de espacios abiertos, luz natural y diseño minimal.',image:pexels(17087548),appointment:true,duration:45,employees:['Valeria'],purchasable:false,badge:'Featured'},
      {id:'isla-2',type:'listing',name:'City Penthouse',price:625000,displayPrice:'$625,000',description:'Interior refinado con acabados modernos y distribución abierta.',image:pexels(33685850),appointment:true,duration:45,employees:['Valeria','Diego'],purchasable:false},
      {id:'isla-3',type:'listing',name:'Garden House',price:495000,displayPrice:'$495,000',description:'Residencia amplia con áreas sociales luminosas y ambiente tranquilo.',image:pexels(7722158),appointment:true,duration:45,employees:['Diego'],purchasable:false},
      {id:'isla-4',type:'service',name:'Buyer Consultation',price:0,displayPrice:'Free consultation',description:'Conversación inicial para entender prioridades, presupuesto y áreas de interés.',image:pexels(18273275),appointment:true,duration:30,employees:['Valeria','Diego'],purchasable:false}
    ],
    employees: [
      {id:'valeria',name:'Valeria León',role:'Real Estate Advisor',initials:'VL',services:['Ocean Residence','City Penthouse','Buyer Consultation']},
      {id:'diego',name:'Diego Font',role:'Property Advisor',initials:'DF',services:['City Penthouse','Garden House','Buyer Consultation']}
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
    heroImage: pexels(6755615), gallery: [pexels(6768446), pexels(29689995), pexels(5104706)],
    location: 'Río Piedras, Puerto Rico', phone: '(787) 555-0147', hours: 'Mié–Dom · 11 AM–7 PM',
    accent: '#C26B45', accent2: '#E8B798', dark: '#2D241F', cream: '#FBF5EE',
    features: ['Products', 'Workshops', 'Group booking', 'Cart'],
    items: [
      {id:'atelier-1',type:'product',name:'Sandalwood Candle',price:32,description:'Vela artesanal de aroma cálido y acabado minimalista.',image:pexels(6755615),badge:'Handmade'},
      {id:'atelier-2',type:'product',name:'Studio Vessel',price:46,description:'Objeto decorativo de edición pequeña hecho en estudio.',image:pexels(6768446),badge:'Small batch'},
      {id:'atelier-3',type:'class',name:'Candle Workshop',price:65,description:'Taller guiado para crear una vela personalizada desde cero.',image:pexels(5104706),appointment:true,duration:120,employees:['Lucía'],groupCapacity:10,badge:'10 seats'},
      {id:'atelier-4',type:'class',name:'Private Studio Session',price:120,description:'Sesión privada para grupos pequeños con materiales incluidos.',image:pexels(29689995),appointment:true,duration:120,deposit:40,employees:['Lucía','Marcos'],groupCapacity:6}
    ],
    employees: [
      {id:'lucia',name:'Lucía Ferrer',role:'Founder & Maker',initials:'LF',services:['Candle Workshop','Private Studio Session']},
      {id:'marcos',name:'Marcos Gil',role:'Workshop Host',initials:'MG',services:['Private Studio Session']}
    ],
    bookingLabel: 'Book a workshop', cartEnabled: true, bookingEnabled: true, groupBooking: true,
    aboutTitle: 'One site, two revenue streams.',
    aboutText: 'Atelier Nueve enseña cómo un negocio creativo puede vender productos y, al mismo tiempo, reservar talleres con capacidad grupal.',
    trust: ['Product sales', 'Workshop capacity', 'Combined checkout']
  }
]

export const demoBySlug = (slug: string) => demoConfigs.find((demo) => demo.slug === slug)
