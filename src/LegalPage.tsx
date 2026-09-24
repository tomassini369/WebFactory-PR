import { useEffect, useState } from 'react'
import './legal.css'

type Language='en'|'es'
type LegalKind='privacy'|'terms'|'refund'

const updated={en:'Effective: September 21, 2026 · Last updated: September 21, 2026',es:'Vigente: 21 de septiembre de 2026 · Última actualización: 21 de septiembre de 2026'}

const copy={
  en:{
    privacy:{
      title:'Privacy Policy',
      intro:'This Privacy Policy explains how WebFactory PR collects, uses, stores, and shares information when you use webfactorypr.com, the Builder, Templates, client portals, administrative tools, and business websites operated through the WebFactory platform.',
      sections:[
        ['1. Scope and roles',[
          'WebFactory PR provides a multi-tenant website, commerce, booking, and administration platform. This policy applies to information handled through WebFactory services.',
          'Businesses that use WebFactory remain responsible for the products, services, appointments, customer relationships, and business content they publish. When a visitor submits information to a client business website, WebFactory processes that information to operate the platform while the client business determines the commercial purpose for which it is used.'
        ]],
        ['2. Information we collect',[
          'Account and identity information, such as name, email address, authentication identifiers, business name, account role, and portal access information.',
          'Business configuration information, including contact details, website content, bilingual copy, catalog items, prices, staff information, schedules, booking settings, social links, Google Maps links, payment settings, logos, photographs, and uploaded files.',
          'Commerce and booking information, including customer name, email, phone number, selected products or services, quantities, appointment time, assigned employee, payment status, transaction identifiers, refund status, and related operational records.',
          'Technical and security information generated when the service is used, such as request metadata, authentication/session information, error records, revision data, security events, and service-readiness information.',
          'Integration information required to operate services such as Stripe and Google Calendar. WebFactory does not ask users to enter complete card numbers, Stripe secret keys, banking passwords, or 2FA codes into WebFactory forms.'
        ]],
        ['3. How we use information',[
          'To create and host business websites, authenticate portal users, save and publish configuration changes, process catalog and booking workflows, prevent scheduling conflicts, support payments, send transactional communications, operate trials and subscriptions, provide customer support, and protect the service against abuse or unauthorized access.',
          'To maintain platform reliability, troubleshoot errors, enforce account limits, verify integrations, and improve WebFactory features and usability.'
        ]],
        ['4. Payments and financial information',[
          'WebFactory subscription payments are processed through Stripe. Client businesses may also connect Stripe to accept payments from their own customers. Card and sensitive banking information is collected by Stripe through Stripe-hosted or official Stripe interfaces, not stored as complete payment credentials by WebFactory.',
          'Where a client business enables ATH Móvil Business or in-person payments, the business is responsible for its own merchant account and payment relationship. WebFactory may store configuration information needed to present or route the payment option but does not become the merchant receiving the business’s sales revenue.',
          'WebFactory does not charge a platform commission on client business sales under the current subscription offering.'
        ]],
        ['5. Google Calendar',[
          'If a business chooses to connect Google Calendar, WebFactory uses the authorization granted by that business to check availability and support creation, updating, cancellation, or rescheduling of booking-related calendar events.',
          'Google authorization tokens are stored in encrypted form by the WebFactory backend. Users can stop using the integration by disconnecting access through their Google account and contacting WebFactory if additional removal assistance is needed.'
        ]],
        ['6. AI-assisted Builder',[
          'If you use Factory AI, the business description, requested changes, and limited current Builder content needed to perform the request may be sent through Netlify AI Gateway to Anthropic Claude for inference. WebFactory does not give Claude access to payment credentials, secrets, deployments, repositories, webhooks, or authentication settings.',
          'AI output is returned as structured configuration and is validated before it can be applied to the Builder. Netlify states that AI Gateway does not store prompts or model outputs. Users should avoid including unnecessary sensitive personal information in AI prompts.'
        ]],
        ['7. Service providers and integrations',[
          'WebFactory relies on service providers to operate the platform, including Netlify for hosting, serverless functions, identity, and storage; Stripe for billing, connected-account commerce, and payment processing; Google for Calendar integration; and email infrastructure for transactional messages.',
          'These providers process information under their own terms and privacy policies. WebFactory shares only information reasonably necessary to provide the requested integration or service.'
        ]],
        ['8. Data storage, retention, and security',[
          'WebFactory uses access controls, server-side validation, restricted administrative access, encrypted Google OAuth tokens, secure payment verification, and other technical safeguards designed to protect platform information.',
          'Information is retained while needed to operate an active account or website and for reasonable periods afterward when necessary for security, dispute handling, fraud prevention, backup recovery, accounting, or legal obligations. No Internet service can guarantee absolute security.'
        ]],
        ['9. Your choices and requests',[
          'Portal users can edit much of their business information directly. You may also contact WebFactory to request access, correction, deletion, or other assistance concerning personal information associated with your WebFactory account, subject to security verification and applicable retention obligations.',
          'Businesses are responsible for responding to privacy requests from their own customers when the request concerns the business’s commercial relationship, products, services, or records.'
        ]],
        ['10. Children',[
          'WebFactory business accounts and administrative portals are intended for adults and authorized business users. WebFactory is not designed as a service directed to children.'
        ]],
        ['11. International and third-party processing',[
          'WebFactory and its service providers may process or store information in locations where their infrastructure operates. By using integrations such as Stripe, Netlify, or Google, information may be handled according to those providers’ infrastructure and applicable terms.'
        ]],
        ['12. Changes to this policy',[
          'WebFactory may update this Privacy Policy as the platform, integrations, or legal requirements change. Material revisions will be reflected by an updated effective or revision date on this page.'
        ]],
        ['13. Contact',[
          'Privacy questions or requests may be sent to info@webfactorypr.com.'
        ]]
      ]
    },
    terms:{
      title:'Terms of Service',
      intro:'These Terms of Service govern access to and use of WebFactory PR, including webfactorypr.com, the Builder, Templates, client websites, private portals, commerce tools, booking tools, integrations, and related services.',
      sections:[
        ['1. Acceptance and eligibility',[
          'By creating, activating, purchasing, or using a WebFactory service, you agree to these Terms. Business account owners must be at least 18 years old and have authority to act for the business or organization they configure.'
        ]],
        ['2. The WebFactory service',[
          'WebFactory is a hosted website and commerce platform that can provide Templates or Custom layouts, bilingual content, catalogs, bookings, employee scheduling, client administration, Stripe connectivity, ATH Móvil configuration, Google Calendar integration, and related tools.',
          'Features may depend on third-party availability, account approval, configuration, browser/device support, or the selected business settings.'
        ]],
        ['3. Trial and subscription pricing',[
          'The current public offering includes a 7-day free trial with no card required. After the trial, continued public availability requires an active WebFactory subscription.',
          'Current standard pricing is $30 USD per month or $350 USD per year unless a different written offer is shown at checkout. WebFactory currently charges no commission on the sales processed by a client business through its website.',
        ]],
        ['4. Billing and renewals',[
          'Subscription checkout and recurring billing are processed by Stripe. A paid subscription renews according to the billing interval selected unless it is canceled before the next renewal.',
          'Until a self-service cancellation control is available in the portal, account owners may request subscription cancellation by contacting billing@webfactorypr.com. Cancellation does not automatically erase business records or customer transaction history.',
          'If a renewal fails, Stripe may retry payment. WebFactory may restrict or unpublish service when a subscription becomes unpaid, canceled, paused, or otherwise no longer entitled to public service.'
        ]],
        ['5. Business sales and merchant responsibility',[
          'Each client business is the seller or service provider for its own products, services, bookings, taxes, pricing, customer promises, warranties, cancellations, refunds, licenses, and legal compliance. WebFactory is the platform provider and is not the merchant for those client sales.',
          'Stripe Connect may route eligible customer payments directly to the connected business account. ATH Móvil Business and in-person payments remain under the business’s own merchant relationship.',
          'The business is responsible for maintaining accurate prices, descriptions, inventory, availability, staff schedules, refund rules, tax obligations, and legally required customer disclosures.'
        ]],
        ['6. Accounts and security',[
          'You are responsible for protecting account credentials and limiting portal access to authorized users. Do not share passwords, secret keys, banking credentials, or 2FA codes through ordinary WebFactory content fields.',
          'WebFactory may suspend access where reasonably necessary to investigate abuse, security threats, unauthorized use, fraud, payment problems, or violations of these Terms.'
        ]],
        ['7. Client content and licenses',[
          'You retain ownership of business names, logos, photographs, copy, catalog content, and other materials you provide, subject to any rights held by third parties.',
          'You grant WebFactory a non-exclusive license to host, copy, resize, process, display, transmit, and otherwise use that content only as reasonably necessary to operate, secure, support, and improve the service.',
          'You must have the rights and permissions needed for content you upload. Do not upload content that is unlawful, infringing, deceptive, malicious, or that violates another person’s privacy or intellectual-property rights.'
        ]],
        ['8. Templates and WebFactory intellectual property',[
          'WebFactory Templates, software, platform interfaces, code, branding, design systems, and platform documentation remain WebFactory property or the property of their respective licensors. Selecting a Template gives the customer a right to use the resulting website through the WebFactory service, not ownership of the underlying platform source code or reusable Template system.'
        ]],
        ['9. Bookings and calendar availability',[
          'Booking availability can consider service duration, employee assignment, business hours, stored bookings, temporary holds, limits, and connected Google Calendar conflicts. Because external calendars, networks, customers, and staff can change, WebFactory does not guarantee that every displayed time will remain available until the booking is confirmed.',
          'The client business remains responsible for fulfilling, changing, canceling, and communicating about appointments with its customers.'
        ]],
        ['10. AI-assisted creation',[
          'Factory AI can use Anthropic Claude through Netlify AI Gateway to propose website configuration, bilingual copy, Template selection, layout, features, catalog content, and team-role content.',
          'AI suggestions are drafts. The account owner is responsible for reviewing accuracy, pricing, claims, translations, rights, and legal compliance before applying or publishing AI-generated content. Factory AI is intentionally restricted from creating separate customer deployments or changing platform secrets, payment credentials, authentication, webhooks, repositories, or infrastructure.'
        ]],
        ['11. Third-party services',[
          'Stripe, Google, Netlify, ATH Móvil, email providers, social networks, Google Maps, and other linked services are operated by third parties. Their availability, approval requirements, fees, terms, and outages are outside WebFactory’s direct control.',
          'Use of a third-party integration is also subject to the provider’s own terms and policies.'
        ]],
        ['12. Acceptable use',[
          'You may not use WebFactory for unlawful activity, fraud, malware, credential theft, unauthorized access, intellectual-property infringement, deceptive commerce, prohibited payment activity, or conduct that materially disrupts the platform or harms other users.',
          'WebFactory may remove or restrict content or accounts when reasonably necessary to protect users, comply with legal obligations, enforce provider requirements, or protect platform integrity.'
        ]],
        ['13. Service changes and availability',[
          'WebFactory may maintain, update, replace, add, or discontinue features as the platform evolves. We aim to provide reliable service but do not guarantee uninterrupted or error-free operation, continuous availability of third-party integrations, or that every feature will remain unchanged.'
        ]],
        ['14. Disclaimers and limitation of liability',[
          'To the maximum extent permitted by applicable law, WebFactory is provided on an “as available” basis. WebFactory does not guarantee business revenue, sales, search ranking, appointment volume, third-party approval, or uninterrupted operation.',
          'To the maximum extent permitted by applicable law, WebFactory will not be liable for indirect, incidental, special, consequential, or lost-profit damages arising from use of the platform. Any non-waivable rights or remedies provided by applicable law remain unaffected.'
        ]],
        ['15. Indemnity',[
          'To the extent permitted by law, a business using WebFactory is responsible for claims arising from its products, services, business content, customer promises, taxes, licenses, refunds, employment relationships, or unlawful use of the platform.'
        ]],
        ['16. Termination',[
          'You may stop using WebFactory and request cancellation of an active subscription. WebFactory may terminate or suspend service for material violations, security risks, nonpayment, unlawful activity, or where continued operation is not reasonably possible.',
          'Sections that by their nature should survive termination—including payment obligations, ownership, disclaimers, and limitations—continue to apply.'
        ]],
        ['17. Governing framework and disputes',[
          'These Terms are intended to operate under the laws applicable to WebFactory PR and its services in Puerto Rico and the United States, without limiting consumer rights that cannot lawfully be waived. Before filing a formal dispute, users are encouraged to contact WebFactory so the issue can be reviewed and, when possible, resolved directly.'
        ]],
        ['18. Contact',[
          'Questions about these Terms may be sent to info@webfactorypr.com.'
        ]]
      ]
    },
    refund:{
      title:'Refund Policy',
      intro:'This policy explains refunds for WebFactory subscription fees and separately explains how refunds work for purchases made from businesses that use the WebFactory platform.',
      sections:[
        ['1. 7-day free trial',[
          'The current WebFactory subscription offering begins with a 7-day free trial and does not require a payment card to start. The trial is intended to let the business evaluate its website and portal before purchasing a subscription.'
        ]],
        ['2. WebFactory monthly and annual subscription fees',[
          'After the free trial, standard WebFactory pricing is $30 USD per month or $350 USD per year. Subscription payments are processed through Stripe.',
          'Because access is a digital hosted service made available for the purchased billing period, subscription charges are generally non-refundable after the billing period begins, except where required by applicable law or where WebFactory approves a refund for circumstances such as a duplicate charge, an unauthorized charge confirmed after review, or a material WebFactory billing error.',
          'A request does not guarantee a refund. Approved refunds are returned to the original payment method through Stripe and processing time may depend on Stripe and the customer’s financial institution.'
        ]],
        ['3. Canceling future renewals',[
          'Canceling a subscription stops future renewal charges but does not automatically refund the current paid billing period. Unless otherwise required by law or specifically stated by WebFactory, access may continue through the end of the already-paid period.',
          'Until self-service subscription cancellation is available in the client portal, the account owner can request cancellation at billing@webfactorypr.com. Requests should be sent before the next renewal date.'
        ]],
        ['4. Failed, past-due, or interrupted payments',[
          'A failed payment is not a refund. Stripe may retry a failed renewal. WebFactory may keep service available during a payment-retry state and may later restrict publication if the subscription becomes unpaid, paused, or canceled.'
        ]],
        ['5. Purchases from a WebFactory client business',[
          'WebFactory does not set the refund policy for products, services, deposits, appointments, or other purchases sold by a business using WebFactory. The client business is the merchant and is responsible for its own customer refund, cancellation, return, and no-show rules.',
          'For eligible Stripe transactions, authorized users of a client business may use WebFactory administrative tools to request a full or partial Stripe refund. The refund is processed against the business’s connected Stripe account and remains subject to Stripe rules and the business’s own policy.',
          'ATH Móvil Business payments and in-person payments are handled directly by the client business. Refunds for those payment methods must be arranged with that business using the method it supports.'
        ]],
        ['6. Booking deposits and appointment payments',[
          'Whether a booking deposit or appointment payment is refundable is determined by the client business’s own cancellation and refund policy unless applicable law requires otherwise. WebFactory provides the booking and payment infrastructure but does not independently decide whether the end customer is entitled to a refund.'
        ]],
        ['7. How to request a WebFactory billing review',[
          'For a WebFactory subscription billing issue, email billing@webfactorypr.com from the email associated with the account and include the business name, approximate charge date, amount, and a brief explanation. Do not send full card numbers, banking passwords, secret keys, or 2FA codes by email.'
        ]],
        ['8. Policy changes',[
          'WebFactory may update this Refund Policy as billing features or service plans change. Changes apply prospectively unless applicable law requires otherwise.'
        ]]
      ]
    }
  },
  es:{
    privacy:{
      title:'Política de Privacidad',
      intro:'Esta Política de Privacidad explica cómo WebFactory PR recopila, utiliza, almacena y comparte información cuando utilizas webfactorypr.com, el Builder, Templates, portales de clientes, herramientas administrativas y websites comerciales operados mediante la plataforma WebFactory.',
      sections:[
        ['1. Alcance y funciones',[
          'WebFactory PR ofrece una plataforma multi-tenant para websites, comercio, reservaciones y administración. Esta política aplica a la información manejada mediante los servicios de WebFactory.',
          'Los negocios que utilizan WebFactory continúan siendo responsables de sus productos, servicios, citas, relaciones con clientes y contenido comercial. Cuando un visitante envía información a un website de un negocio cliente, WebFactory procesa esa información para operar la plataforma mientras el negocio cliente determina el propósito comercial para el cual se utiliza.'
        ]],
        ['2. Información que recopilamos',[
          'Información de cuenta e identidad, como nombre, email, identificadores de autenticación, nombre del negocio, rol de cuenta e información de acceso al portal.',
          'Información de configuración comercial, incluyendo datos de contacto, contenido del website, contenido bilingüe, catálogo, precios, equipo, horarios, reservaciones, enlaces sociales, Google Maps, configuraciones de pago, logos, fotografías y archivos subidos.',
          'Información de comercio y reservaciones, incluyendo nombre, email y teléfono del comprador, productos o servicios seleccionados, cantidades, fecha y hora de cita, empleado asignado, estado del pago, identificadores de transacción, reembolsos y registros operacionales relacionados.',
          'Información técnica y de seguridad generada durante el uso del servicio, como metadatos de solicitudes, información de sesión/autenticación, errores, revisiones, eventos de seguridad y estado de las integraciones.',
          'Información de integración necesaria para operar servicios como Stripe y Google Calendar. WebFactory no solicita que introduzcas números completos de tarjeta, llaves secretas de Stripe, contraseñas bancarias o códigos 2FA en los formularios de WebFactory.'
        ]],
        ['3. Cómo utilizamos la información',[
          'Para crear y alojar websites, autenticar usuarios, guardar y publicar cambios, operar catálogo y reservaciones, evitar conflictos de horario, apoyar pagos, enviar comunicaciones transaccionales, administrar pruebas y suscripciones, brindar soporte y proteger el servicio.',
          'Para mantener la confiabilidad de la plataforma, diagnosticar errores, aplicar límites de cuenta, verificar integraciones y mejorar funciones y experiencia de uso.'
        ]],
        ['4. Pagos e información financiera',[
          'Los pagos de suscripción de WebFactory se procesan mediante Stripe. Los negocios clientes también pueden conectar Stripe para aceptar pagos de sus propios clientes. Los datos sensibles de tarjeta y banca son recopilados directamente por Stripe mediante interfaces oficiales o alojadas por Stripe y WebFactory no almacena credenciales completas de pago.',
          'Cuando un negocio activa ATH Móvil Business o pagos presenciales, el negocio es responsable de su propia cuenta comercial y relación de pago. WebFactory puede guardar la configuración necesaria para presentar o dirigir esa opción, pero no se convierte en el comerciante que recibe los ingresos de las ventas del negocio.',
          'Bajo la oferta de suscripción actual, WebFactory no cobra comisión sobre las ventas del negocio cliente.'
        ]],
        ['5. Google Calendar',[
          'Si un negocio conecta Google Calendar, WebFactory utiliza la autorización otorgada para consultar disponibilidad y apoyar la creación, actualización, cancelación o reprogramación de eventos relacionados con reservaciones.',
          'Los tokens de autorización de Google se almacenan cifrados en el backend de WebFactory. El usuario puede revocar el acceso desde su cuenta de Google y contactar a WebFactory si necesita asistencia adicional para remover la integración.'
        ]],
        ['6. Builder asistido por IA',[
          'Si utilizas Factory AI, la descripción del negocio, los cambios solicitados y contenido limitado del Builder necesario para completar la solicitud pueden enviarse mediante Netlify AI Gateway a Anthropic Claude para inferencia. WebFactory no concede a Claude acceso a credenciales de pago, secretos, deployments, repositorios, webhooks ni configuraciones de autenticación.',
          'La respuesta de IA regresa como configuración estructurada y se valida antes de poder aplicarse al Builder. Netlify indica que AI Gateway no almacena prompts ni respuestas del modelo. Los usuarios deben evitar incluir información personal sensible innecesaria en los prompts.'
        ]],
        ['7. Proveedores e integraciones',[
          'WebFactory utiliza proveedores para operar la plataforma, incluyendo Netlify para hosting, funciones, identidad y almacenamiento; Stripe para facturación, cuentas conectadas y procesamiento de pagos; Google para Calendar; e infraestructura de email para mensajes transaccionales.',
          'Estos proveedores procesan información conforme a sus propios términos y políticas. WebFactory comparte solamente la información razonablemente necesaria para ofrecer la integración o servicio solicitado.'
        ]],
        ['8. Almacenamiento, retención y seguridad',[
          'WebFactory utiliza controles de acceso, validación en servidor, acceso administrativo restringido, tokens OAuth de Google cifrados, verificación segura de pagos y otras medidas técnicas diseñadas para proteger la información.',
          'La información se conserva mientras sea necesaria para operar una cuenta o website activo y durante periodos razonables posteriores cuando sea necesario para seguridad, disputas, prevención de fraude, recuperación, contabilidad u obligaciones legales. Ningún servicio de Internet puede garantizar seguridad absoluta.'
        ]],
        ['9. Tus opciones y solicitudes',[
          'Los usuarios del portal pueden editar gran parte de la información de su negocio directamente. También puedes contactar a WebFactory para solicitar acceso, corrección, eliminación u otra asistencia relacionada con información personal de tu cuenta, sujeto a verificación de seguridad y obligaciones aplicables de retención.',
          'Los negocios son responsables de responder solicitudes de privacidad de sus propios clientes cuando la solicitud se relaciona con la relación comercial, productos, servicios o registros del negocio.'
        ]],
        ['10. Menores',[
          'Las cuentas comerciales y los portales administrativos de WebFactory están dirigidos a adultos y usuarios comerciales autorizados. WebFactory no está diseñado como un servicio dirigido a menores.'
        ]],
        ['11. Procesamiento por terceros',[
          'WebFactory y sus proveedores pueden procesar o almacenar información en las ubicaciones donde operen sus infraestructuras. Al utilizar integraciones como Stripe, Netlify o Google, la información puede manejarse según la infraestructura y términos aplicables de esos proveedores.'
        ]],
        ['12. Cambios a esta política',[
          'WebFactory puede actualizar esta Política de Privacidad cuando cambien la plataforma, las integraciones o los requisitos aplicables. Las revisiones materiales se reflejarán mediante una fecha de vigencia o actualización nueva.'
        ]],
        ['13. Contacto',[
          'Preguntas o solicitudes de privacidad pueden enviarse a info@webfactorypr.com.'
        ]]
      ]
    },
    terms:{
      title:'Términos de Servicio',
      intro:'Estos Términos de Servicio regulan el acceso y uso de WebFactory PR, incluyendo webfactorypr.com, Builder, Templates, websites de clientes, portales privados, comercio, reservaciones, integraciones y servicios relacionados.',
      sections:[
        ['1. Aceptación y elegibilidad',[
          'Al crear, activar, comprar o utilizar un servicio de WebFactory aceptas estos Términos. Los titulares de cuentas comerciales deben tener al menos 18 años y autoridad para actuar por el negocio u organización que configuran.'
        ]],
        ['2. Servicio WebFactory',[
          'WebFactory es una plataforma alojada de websites y comercio que puede incluir Templates o layouts Custom, contenido bilingüe, catálogos, reservaciones, empleados, Stripe, ATH Móvil, Google Calendar y herramientas relacionadas.',
          'Algunas funciones dependen de servicios de terceros, aprobación de cuentas, configuración, navegador/dispositivo y ajustes seleccionados por el negocio.'
        ]],
        ['3. Prueba y precios de suscripción',[
          'La oferta pública actual incluye una prueba gratis de 7 días sin tarjeta. Luego de la prueba, mantener el website públicamente disponible requiere una suscripción activa.',
          'El precio estándar actual es $30 USD al mes o $350 USD al año, salvo que se muestre otra oferta escrita en checkout. Actualmente WebFactory no cobra comisión sobre las ventas procesadas por el negocio cliente.',
        ]],
        ['4. Facturación y renovaciones',[
          'El checkout de suscripción y la facturación recurrente se procesan mediante Stripe. La suscripción pagada se renueva según el intervalo seleccionado a menos que se cancele antes de la próxima renovación.',
          'Mientras no exista una opción de cancelación automática dentro del portal, el titular puede solicitar cancelación escribiendo a billing@webfactorypr.com. Cancelar no elimina automáticamente registros comerciales ni historial de transacciones.',
          'Si una renovación falla, Stripe puede reintentar el cobro. WebFactory puede restringir o despublicar el servicio cuando la suscripción quede impaga, cancelada, pausada o sin derecho de publicación.'
        ]],
        ['5. Ventas del negocio y responsabilidad comercial',[
          'Cada negocio cliente es el vendedor o proveedor de sus productos, servicios, reservaciones, impuestos, precios, promesas, garantías, cancelaciones, reembolsos, licencias y cumplimiento legal. WebFactory es la plataforma y no es el comerciante de esas ventas.',
          'Stripe Connect puede dirigir pagos elegibles a la cuenta conectada del negocio. ATH Móvil Business y pagos presenciales permanecen bajo la relación comercial propia del negocio.',
          'El negocio es responsable de mantener precios, descripciones, inventario, disponibilidad, horarios, reglas de reembolso, obligaciones contributivas y divulgaciones al consumidor correctamente.'
        ]],
        ['6. Cuentas y seguridad',[
          'Eres responsable de proteger las credenciales y limitar el acceso a usuarios autorizados. No compartas contraseñas, llaves secretas, credenciales bancarias ni códigos 2FA mediante campos ordinarios de contenido.',
          'WebFactory puede suspender acceso cuando sea razonablemente necesario para investigar abuso, amenazas de seguridad, uso no autorizado, fraude, problemas de pago o violaciones de estos Términos.'
        ]],
        ['7. Contenido del cliente y licencias',[
          'Conservas la titularidad de nombres comerciales, logos, fotografías, textos, catálogo y otros materiales que proporciones, sujeto a derechos de terceros.',
          'Otorgas a WebFactory una licencia no exclusiva para alojar, copiar, redimensionar, procesar, mostrar y transmitir ese contenido solamente en la medida razonablemente necesaria para operar, proteger, apoyar y mejorar el servicio.',
          'Debes tener los derechos necesarios sobre el contenido que subas. No puedes subir contenido ilegal, infractor, engañoso, malicioso o que viole la privacidad o propiedad intelectual de otra persona.'
        ]],
        ['8. Templates y propiedad intelectual de WebFactory',[
          'Los Templates, software, interfaces, código, marca, sistemas de diseño y documentación de WebFactory continúan siendo propiedad de WebFactory o de sus respectivos licenciantes. Seleccionar un Template permite utilizar el website resultante mediante WebFactory; no transfiere la propiedad del código fuente de la plataforma ni del sistema reutilizable de Templates.'
        ]],
        ['9. Reservaciones y disponibilidad',[
          'La disponibilidad puede considerar duración, empleado, horario, citas almacenadas, holds temporales, límites y conflictos de Google Calendar. Debido a que calendarios, redes, clientes y empleados pueden cambiar, WebFactory no garantiza que cada horario mostrado permanezca disponible hasta confirmarse.',
          'El negocio es responsable de cumplir, modificar, cancelar y comunicarse con sus clientes acerca de las citas.'
        ]],
        ['10. Creación asistida por IA',[
          'Factory AI puede utilizar Anthropic Claude mediante Netlify AI Gateway para proponer configuración del website, contenido bilingüe, selección de Template, layout, funciones, catálogo y roles del equipo.',
          'Las sugerencias de IA son borradores. El titular de la cuenta es responsable de revisar exactitud, precios, afirmaciones, traducciones, derechos y cumplimiento antes de aplicar o publicar contenido generado por IA. Factory AI está restringido intencionalmente para que no pueda crear deployments separados de clientes ni modificar secretos, credenciales de pago, autenticación, webhooks, repositorios o infraestructura.'
        ]],
        ['11. Servicios de terceros',[
          'Stripe, Google, Netlify, ATH Móvil, proveedores de email, redes sociales, Google Maps y otros servicios enlazados son operados por terceros. Su disponibilidad, aprobación, tarifas, términos y fallas están fuera del control directo de WebFactory.',
          'El uso de una integración también está sujeto a los términos y políticas del proveedor correspondiente.'
        ]],
        ['12. Uso aceptable',[
          'No puedes usar WebFactory para actividad ilegal, fraude, malware, robo de credenciales, acceso no autorizado, infracción de propiedad intelectual, comercio engañoso, actividad de pago prohibida o conducta que interrumpa materialmente la plataforma o perjudique a otros usuarios.',
          'WebFactory puede remover o restringir contenido o cuentas cuando sea razonablemente necesario para proteger usuarios, cumplir obligaciones, requisitos de proveedores o la integridad de la plataforma.'
        ]],
        ['13. Cambios y disponibilidad del servicio',[
          'WebFactory puede mantener, actualizar, reemplazar, añadir o discontinuar funciones mientras evoluciona la plataforma. Buscamos brindar un servicio confiable, pero no garantizamos operación ininterrumpida, ausencia de errores, disponibilidad continua de integraciones de terceros ni que toda función permanezca sin cambios.'
        ]],
        ['14. Descargos y limitación de responsabilidad',[
          'Hasta el máximo permitido por la ley aplicable, WebFactory se ofrece “según disponibilidad”. WebFactory no garantiza ingresos, ventas, posicionamiento, volumen de reservaciones, aprobación por terceros ni operación ininterrumpida.',
          'Hasta el máximo permitido por la ley aplicable, WebFactory no será responsable por daños indirectos, incidentales, especiales, consecuentes o pérdida de ganancias derivados del uso de la plataforma. Los derechos o remedios que no puedan renunciarse legalmente no se afectan.'
        ]],
        ['15. Responsabilidad del negocio',[
          'En la medida permitida por ley, el negocio que utiliza WebFactory es responsable de reclamaciones relacionadas con sus productos, servicios, contenido, promesas a clientes, impuestos, licencias, reembolsos, relaciones laborales o uso ilegal de la plataforma.'
        ]],
        ['16. Terminación',[
          'Puedes dejar de usar WebFactory y solicitar la cancelación de una suscripción activa. WebFactory puede suspender o terminar el servicio por violaciones materiales, riesgos de seguridad, falta de pago, actividad ilegal o cuando continuar el servicio no sea razonablemente posible.',
          'Las disposiciones que por su naturaleza deban continuar —incluyendo pagos, propiedad, descargos y limitaciones— permanecen aplicables.'
        ]],
        ['17. Marco aplicable y disputas',[
          'Estos Términos están diseñados para operar bajo las leyes aplicables a WebFactory PR y sus servicios en Puerto Rico y Estados Unidos, sin limitar derechos del consumidor que legalmente no puedan renunciarse. Antes de iniciar una disputa formal, se recomienda contactar a WebFactory para evaluar y, cuando sea posible, resolver el asunto directamente.'
        ]],
        ['18. Contacto',[
          'Preguntas sobre estos Términos pueden enviarse a info@webfactorypr.com.'
        ]]
      ]
    },
    refund:{
      title:'Política de Reembolsos',
      intro:'Esta política explica los reembolsos de cargos de suscripción de WebFactory y, por separado, cómo funcionan los reembolsos de compras realizadas a negocios que utilizan la plataforma WebFactory.',
      sections:[
        ['1. Prueba gratis de 7 días',[
          'La oferta actual de suscripción comienza con una prueba gratis de 7 días y no requiere tarjeta para comenzar. La prueba permite al negocio evaluar su website y portal antes de adquirir una suscripción.'
        ]],
        ['2. Suscripción mensual y anual de WebFactory',[
          'Luego de la prueba, el precio estándar es $30 USD al mes o $350 USD al año. Los pagos de suscripción se procesan mediante Stripe.',
          'Debido a que el acceso es un servicio digital alojado disponible durante el periodo adquirido, los cargos de suscripción generalmente no son reembolsables una vez comienza el periodo, excepto cuando la ley aplicable lo requiera o WebFactory apruebe un reembolso por circunstancias como un cargo duplicado, un cargo no autorizado confirmado luego de revisión o un error material de facturación de WebFactory.',
          'Una solicitud no garantiza un reembolso. Los reembolsos aprobados regresan al método original mediante Stripe y el tiempo de procesamiento puede depender de Stripe y la institución financiera.'
        ]],
        ['3. Cancelar futuras renovaciones',[
          'Cancelar una suscripción detiene renovaciones futuras pero no reembolsa automáticamente el periodo ya pagado. Salvo que la ley exija otra cosa o WebFactory lo indique específicamente, el acceso puede continuar hasta finalizar el periodo pagado.',
          'Mientras no exista cancelación automática en el portal, el titular puede solicitar cancelación en billing@webfactorypr.com. La solicitud debe enviarse antes de la próxima fecha de renovación.'
        ]],
        ['4. Pagos fallidos o vencidos',[
          'Un pago fallido no constituye un reembolso. Stripe puede reintentar una renovación fallida. WebFactory puede mantener el servicio durante un estado de reintento y posteriormente restringir la publicación si la suscripción queda impaga, pausada o cancelada.'
        ]],
        ['5. Compras a negocios que usan WebFactory',[
          'WebFactory no establece la política de reembolso para productos, servicios, depósitos, citas u otras compras vendidas por un negocio cliente. El negocio es el comerciante y es responsable de sus propias reglas de devolución, cancelación, reembolso y no-show.',
          'Para transacciones elegibles de Stripe, usuarios autorizados del negocio pueden utilizar herramientas administrativas de WebFactory para solicitar reembolso completo o parcial. El reembolso se procesa contra la cuenta Stripe conectada del negocio y permanece sujeto a las reglas de Stripe y la política del negocio.',
          'Pagos por ATH Móvil Business y pagos presenciales son manejados directamente por el negocio cliente. Los reembolsos de esos métodos deben coordinarse con ese negocio.'
        ]],
        ['6. Depósitos y pagos de citas',[
          'La devolución de un depósito o pago de cita depende de la política propia del negocio cliente, salvo que la ley aplicable exija otra cosa. WebFactory brinda la infraestructura de reservación y pago, pero no decide independientemente si el comprador final tiene derecho a reembolso.'
        ]],
        ['7. Cómo solicitar revisión de un cargo WebFactory',[
          'Para un problema de facturación de una suscripción WebFactory, escribe a billing@webfactorypr.com desde el email asociado a la cuenta e incluye nombre del negocio, fecha aproximada del cargo, cantidad y una explicación breve. No envíes números completos de tarjeta, contraseñas bancarias, llaves secretas ni códigos 2FA por email.'
        ]],
        ['8. Cambios a esta política',[
          'WebFactory puede actualizar esta Política de Reembolsos cuando cambien las funciones de facturación o planes. Los cambios aplican prospectivamente salvo que la ley exija otra cosa.'
        ]]
      ]
    }
  }
} as const

export default function LegalPage({kind}:{kind:LegalKind}){
  const [lang,setLang]=useState<Language>('en')
  const page=copy[lang][kind]
  useEffect(()=>{document.documentElement.lang=lang;document.title=`${page.title} | WebFactory PR`},[lang,page.title])
  return <main className="legal-page">
    <header className="legal-top"><a href="/" className="legal-logo"><img src="/webfactory-pr-logo.png" alt="WebFactory PR"/></a><nav><a href="/templates">Templates</a><a href="/builder">Builder</a><a href="/client-admin">Log In</a><div className="legal-lang"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button></div></nav></header>
    <section className="legal-hero"><div><p>WEBFACTORY PR · LEGAL</p><h1>{page.title}</h1><span>{updated[lang]}</span><p>{page.intro}</p></div></section>
    <article className="legal-content">
      {page.sections.map(([title,paragraphs])=><section key={title}><h2>{title}</h2>{paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</section>)}
      <aside><strong>{lang==='es'?'¿Necesitas ayuda?':'Need help?'}</strong><p>{lang==='es'?'Contáctanos sobre estas políticas o tu cuenta.':'Contact us about these policies or your account.'}</p><a href="mailto:info@webfactorypr.com">info@webfactorypr.com</a></aside>
    </article>
    <footer className="legal-footer"><a href="/privacy" target="_blank" rel="noreferrer">Privacy</a><a href="/terms" target="_blank" rel="noreferrer">Terms</a><a href="/refund-policy" target="_blank" rel="noreferrer">Refund Policy</a><span>© 2026 WebFactory PR</span></footer>
  </main>
}