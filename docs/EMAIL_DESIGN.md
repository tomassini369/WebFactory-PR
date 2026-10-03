# Correo: marca y previsualización

Las funciones siguen enviando por Nodemailer con Gmail/Mailjet. No se instala Netlify Email Integration, no se cambia remitente SMTP ni se añade un proveedor. Diseño común en `netlify/lib/email-design.mjs`; contenido por propósito en las plantillas de reservas, comercio, contacto y plataforma.

## Marca y cobertura

- WebFactory: invitaciones trial/Complimentary, reset de Authenticator y avisos de plataforma enviados por `sendEmail`. El reset conserva su texto bilingüe, referencia, fecha y reglas de entrega incierta.
- Negocio: confirmación de reserva para cliente/negocio, recordatorios, reprogramación/cancelación, pedidos, reenvío de recibos, contactos y solicitud de reseñas. Nombre según ES/EN; `design.primary` y `design.secondary`; logo del asset del tenant o URL existente. Sin logo, la marca sigue visible como texto.
- Imágenes requieren acceso público y que el cliente de correo permita cargarlas. No se hace público ningún asset privado para enviar correo. Un logo de un sitio sin acceso público puede quedar como texto alternativo; tampoco se garantiza que un correo histórico conserve un logo después de borrar el sitio.
- Los mensajes administrados directamente por Netlify Identity (confirmación/recuperación de contraseña) o Stripe no atraviesan este transport. Su personalización sigue siendo una configuración independiente; no se afirma que cambien por este lote.
- Las invitaciones aceptan `language`/`lang` en ES/EN y conservan EN si no se aporta idioma. Los contenidos de seguridad permanecen bilingües.

HTML con tablas de presentación, CSS inline, imágenes y botones, más texto plano. Colores restringidos a hex de seis dígitos; contraste negro/blanco para marca y botones. Datos y URLs escapados; no insertar HTML de clientes. La identidad se obtiene del site recibido en cada operación, no de una caché global ni de nombres de remitentes inferidos. No replicar video, blur o animaciones del sitio: la marca se expresa por logo, color y composición legible.

Se conservan destinatarios, reply-to, adjuntos .ics, headers Message-ID/List-Unsubscribe, enlaces privados y reglas de idempotencia. Ninguna muestra envía mensajes ni lee tenants productivos.

## Galería

`npm run preview:emails` genera `.email-preview/index.html`: 65 muestras ficticias de tres negocios, ES/EN, plataforma, texto plano y ancho móvil. Abrir ese HTML localmente. Todos los enlaces de las muestras apuntan a dominios `.invalid`, y el logo de plataforma se copia localmente.

En deploy-preview, el build incluye `/email-preview/index.html`. El build de producción elimina esa galería; no se exponen muestras ni interfaces de envío. Las páginas llevan noindex/nofollow. No alterar CONTEXT de producción para publicar muestras.

## Validación y límites

Pruebas de aislamiento de marca, datos escapados/URLs, colores, enlaces de reservas, importes, envío SMTP simulado, headers y adjuntos. `scripts/browser-email-smoke.mjs` verifica las 65 muestras a 390/1280px sin peticiones HTTP. Chromium no equivale a aceptación en Gmail, Outlook, Apple Mail ni a recepción inbox: WF-03/WF-14 siguen abiertos para esas pruebas.

No hay nueva autorización para enviar correos a terceros ni para publicar producción. Google Calendar y su video de verificación siguen como prioridad operativa; este lote no cambia OAuth.
