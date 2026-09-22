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

const pexels = (id: number, _width = 1600) => `/demo-images/${id}.jpg`

export const demoConfigs: DemoConfig[] = [
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
    aboutText: 'Este demo combina catálogo de menú, ordering, carrito, horarios y reservaciones para mostrar cómo un restaurante puede centralizar su experiencia digital.',
    trust: ['Fresh daily', 'Secure checkout', 'Mobile ordering']
  },
  {
    slug: 'velocity-auto', category: 'Automotive', name: 'Velocity Auto Care', shortName: 'VELOCITY',
    kicker: 'DETAILING · PROTECTION · CARE', headline: 'Your car deserves showroom energy.',
    description: 'Detailing premium con servicios reservables, técnicos asignados, depósitos y una experiencia visual de alto impacto.',
    heroImage: pexels(37809581), gallery: [pexels(5233271), pexels(14908957), pexels(31389821)],
    location: 'Bayamón, Puerto Rico', phone: '(787) 555-0184', hours: 'Lun–Sáb · 8 AM–6 PM',
    accent: '#8DFF00', accent2: '#D2FF66', dark: '#050505', cream: '#F6F8F3',
    features: ['Service booking', 'Technician selection', 'Deposits', 'WhatsApp'],
    items: [
      {id:'vel-1',type:'service',name:'Lavado exterior con espuma',price:149,description:'Lavado exterior del vehículo con jabón y espuma, tal como se representa en la imagen.',image:pexels(5233271),appointment:true,duration:180,deposit:40,employees:['Mateo','Luis'],badge:'Popular'},
      {id:'vel-2',type:'service',name:'Pulido de pintura',price:299,description:'Pulido profesional de la carrocería para mejorar brillo y acabado, exactamente como se observa en la imagen.',image:pexels(14908957),appointment:true,duration:240,deposit:50,employees:['Mateo'],badge:'Premium'},
      {id:'vel-3',type:'service',name:'Limpieza interior detallada',price:95,description:'Limpieza manual del interior del vehículo con paño y trabajo de detalle.',image:pexels(31389821),appointment:true,duration:120,deposit:25,employees:['Luis','Adrián']},
      {id:'vel-4',type:'product',name:'Productos de cuidado automotriz',price:39,description:'Set de botellas y productos para limpieza y mantenimiento del vehículo como los mostrados en la imagen.',image:pexels(11139243),badge:'Shop'}
    ],
    employees: [
      {id:'mateo',name:'Mateo Cruz',role:'Paint & Ceramic Specialist',initials:'MC',services:['Lavado exterior con espuma','Pulido de pintura']},
      {id:'luis',name:'Luis Vega',role:'Detail Technician',initials:'LV',services:['Lavado exterior con espuma','Limpieza interior detallada']},
      {id:'adrian',name:'Adrián Soto',role:'Interior Specialist',initials:'AS',services:['Limpieza interior detallada']}
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
    aboutText: 'Este demo está diseñado para enseñar claramente la lógica principal de WebFactory: un cliente escoge el servicio, luego el profesional autorizado y finalmente un horario disponible.',
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
    description: 'Boutique retail enfocada en catálogo, product detail, carrito y checkout para demostrar el lado commerce de WebFactory.',
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
    description: 'Real estate demo con listings, vistas individuales, agentes y citas para visitas.',
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
    aboutText: 'Este demo combina paquetes, horarios, depósitos, técnicos y productos complementarios en una experiencia rápida desde móvil.',
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
    description: 'Demo para artista musical con paquetes de presentación, fechas reservables, depósitos y contacto para eventos privados.',
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
    aboutText: 'Este demo convierte paquetes musicales en opciones claras con disponibilidad, depósito y contacto directo para producción.',
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
    aboutText: 'Este demo está diseñado para presentar servicios de cuido, perfiles y disponibilidad sin hacer afirmaciones médicas.',
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
  }
]

export const demoBySlug = (slug: string) => demoConfigs.find((demo) => demo.slug === slug)
