# WebFactory PR MVP

Primer prototipo estatico para vender paginas web por nicho desde $20.99 hasta $69.99, con opciones de Stripe y ATH Movil de negocio manejadas por el cliente.

## Que incluye

- Pagina principal del producto.
- Configurador de nicho, paquete, pagos y extras.
- Personalizacion de estilo visual, fuente de texto, colores, logo/foto principal e imagenes de contenido.
- Vista previa del sitio del cliente.
- Ventana tipo screenshot para ver la pagina completa antes de comprar/publicar.
- Componentes reutilizables para paginas de negocio: hero, beneficios, servicios, galeria, pagos/contacto, mapa y WhatsApp.
- Nicho `Auto Service` y estilo `Premium +` inspirado en paginas de alto impacto para servicios locales.
- Configuracion de header y footer con preset simple, profesional y `Premium +`.
- Resumen de propuesta y precio sugerido.
- Formulario compatible con Netlify Forms.
- Plantilla base para paginas de clientes.
- Script generador desde datos JSON.
- Configuracion minima para Netlify.

## Modelo de precio

- Inicio: $20.99.
- Profesional: $49.99.
- Pagos: $69.99.

Restricciones por paquete:

- Inicio: una seccion, estilos/fuentes basicas, logo o foto principal, sin galeria, sin pagos, sin soporte mensual.
- Profesional: pagina completa, todos los estilos/fuentes, colores personalizados, hasta 3 imagenes de contenido, sin pagos.
- Pagos: todo lo profesional, hasta 6 imagenes de contenido, enlaces o botones de Stripe y ATH Movil de negocio.

Este precio cubre la creacion de una pagina usando plantillas. Stripe, ATH Movil de negocio y otros pagos pertenecen al cliente. El cliente crea o maneja sus propias cuentas, comparte enlaces/botones/datos publicos necesarios y luego opera esos cobros aparte.

Los nichos no incluyen sistema de orden online, carrito ni reservas. Si el cliente escoge el paquete Pagos, su pagina solo muestra botones o enlaces de pago conectados a sus propias cuentas de Stripe o ATH Movil de negocio.

No incluye integraciones avanzadas como dashboard financiero, webhooks personalizados, reembolsos, suscripciones, inventario complejo o manejo de credenciales privadas.

## Personalizacion del cliente

El cliente puede escoger:

- Nicho.
- Paquete.
- Estilo visual.
- Fuente de texto.
- Color principal y color de acento.
- Logo o foto principal.
- Imagenes de contenido.
- Header: simple, sticky profesional o `Premium +`.
- Plantilla de entrega: generica por nicho o `Premium +`.
- Boton principal del header: llamar, WhatsApp, contacto o pagos.
- Footer: simple, marca + contacto o `Premium +`.
- Frase de footer y enlaces de Facebook/Instagram. El credito WebFactory PR se incluye automaticamente.
- Imagen del header/logo e imagen del footer para paquetes Profesional y Pagos.
- Enlace de Stripe o instrucciones de ATH Movil de negocio.
- Opcion de no incluir enlaces de pago.
- Mensaje e instrucciones para el contenido.
- Datos publicos del negocio: telefono, email, direccion, horarios, mapa y WhatsApp.

En la version local, las imagenes se muestran como preview en el navegador. Cuando el sitio este publicado en Netlify, el formulario usa `enctype="multipart/form-data"` para poder recibir archivos si Netlify Forms esta activo.

Fuentes disponibles en el configurador:

- Moderna limpia.
- Ejecutiva suave.
- Limpia universal.
- Compacta legible.
- Clasica serif.
- Redondeada amigable.
- Juvenil clara.
- Editorial elegante.
- Academica confiable.
- Artesanal clasica.
- Lujo editorial.
- Formal tradicional.
- Impacto comercial.
- Condensada urbana.
- Elegante sans.
- Tecnica simple.
- Codigo moderno.

## Premium +

El configurador incluye el nicho `Auto Service` y la opcion visual `Premium +` para crear paginas de alto impacto:

- Servicios como diagnostico computarizado, cambio de aceite, frenos, suspension y mantenimiento.
- Beneficios de confianza como trabajo garantizado, mecanicos certificados y satisfaccion garantizada.
- Estilo `Premium +` con fondo fuerte y acento neon.
- Header oscuro con navegacion en mayusculas y boton de llamada.
- Footer oscuro de marca con frase grande, redes sociales y copyright.
- Simulador de entrega tipo screenshot con hero, beneficios, servicios, nosotros, contacto, mapa, pagos y WhatsApp.
- Contacto completo con telefono, WhatsApp, horario, direccion y enlace de mapa.

Este estilo esta disponible en los paquetes Profesional y Pagos. En el paquete Pagos se activa por defecto la plantilla `Premium +`, pero los datos, colores, fuentes, imagenes, pagos y contacto siguen siendo personalizables por cliente. El paquete Inicio conserva opciones mas limitadas.

## Como abrirlo

Abre `index.html` en Microsoft Edge.

## Como publicarlo gratis en Netlify

1. Crea una cuenta en GitHub.
2. Crea un repositorio nuevo.
3. Sube los archivos de esta carpeta.
4. Crea una cuenta en Netlify.
5. Elige "Add new site" y conecta GitHub.
6. Selecciona el repositorio.
7. Usa `.` como carpeta de publicacion.

## Pedidos con Netlify Forms

El formulario principal ya esta configurado como `site-order` con `data-netlify="true"` y `enctype="multipart/form-data"`.

Cuando lo publiques en Netlify:

1. Activa form detection en Netlify.
2. En Forms, configura una notificacion por email para recibir cada pedido.
3. Los archivos subidos por el cliente quedan en el envio original de Netlify Forms.
4. El formulario tambien envia `orderJson`, que resume todas las selecciones del cliente.

## Convertir pedidos en GitHub Issues

Inclui una funcion en `netlify/functions/order-to-github.mjs`.

Cuando Netlify verifica un envio del formulario, la funcion puede crear un GitHub Issue con el pedido. Para activarla, configura estas variables de entorno en Netlify:

- `GITHUB_OWNER`: usuario u organizacion de GitHub.
- `GITHUB_REPO`: repositorio donde quieres recibir issues.
- `GITHUB_ISSUE_TOKEN`: token de GitHub con permiso para crear issues.
- `GITHUB_ISSUE_LABELS`: opcional, por ejemplo `webfactory,pedido`.

Si esas variables no existen, la funcion no crea issue y solo deja un mensaje en logs. No pongas tokens en `index.html` ni en archivos publicos.

## Como generar una pagina de cliente

Cuando tengas Node.js instalado:

```bash
node scripts/generate-site.mjs
```

Eso crea `generated/sabor-boricua/index.html` usando `data/sample-order.json`.

Para probar la plantilla automotriz:

```bash
node scripts/generate-site.mjs data/auto-service-order.json
```

Eso crea `generated/chino-auto-style/index.html`.

## Siguiente version

- Agregar carpetas de plantillas por nicho.
- Crear un script generador para paginas de clientes.
- Guardar imagenes del cliente dentro de la carpeta del sitio generado.
- Conectar enlaces/botones de pago del cliente.
- Guardar ordenes en archivos JSON o Supabase Free.
- Crear previews por cliente en Netlify.
