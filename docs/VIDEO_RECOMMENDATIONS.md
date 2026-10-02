# Recomendaciones de los videos: WebFactory PR

Fecha: 2 de octubre de 2026. Base: producción `fe6a71d`.

Este documento consolida las recomendaciones discutidas en el chat y distingue lo implementado de lo que requiere configuración, datos reales o pruebas adicionales. No constituye una certificación de cumplimiento legal ni de capacidad.

## Diseño

| Recomendación | Estado |
| --- | --- |
| Transparencias inspiradas en iOS, home y portales | Ya publicadas; se conservan |
| Login con regreso a WebFactory, logo estable en dark/light | Ya publicado; se conserva |
| Video del Hero visible, quitar imagen duplicada del Business Control Center | Ya publicado; se conserva |
| Mantener desplazamiento y movimiento reducido | Ya existente; se conserva |
| Consistencia entre Templates, Builder y páginas generadas | Ya publicada; regresión de 23 Templates en ambos idiomas |

## Acceso y seguridad

| Recomendación | Trabajo realizado o siguiente validación |
| --- | --- |
| Autenticación administrada, sin guardar contraseñas en texto | Ya delegada a Netlify Identity mediante su SDK |
| Permisos en servidor en cada operación | Reforzados: un rol ausente ya no equivale a owner; roles desconocidos no heredan permisos; roles administrativos se resuelven consistentemente |
| Aislamiento entre negocios | Pruebas de acceso cruzado y comprobación de negocio, cliente y suscripción antes de cancelar renovaciones |
| No confiar en IDs/roles enviados por el navegador | El usuario proviene de Identity; membresía y suscripción se obtienen de registros del servidor |
| Errores genéricos | Login y recuperación dejan de revelar detalles del proveedor; errores internos de las APIs modificadas no se devuelven al navegador |
| Validación en servidor | Se rechazan cantidades no enteras, negativas, superiores al límite o IDs de productos duplicados; revisión del Builder y aceptación de renovación son obligatorias en servidor |
| CSRF y límites | Se exige mismo origen en contacto y nuevos endpoints de facturación; límites nativos añadidos a facturación, bajas y POS idempotente |
| Contraseñas largas | Activación y recuperación solicitan 15 caracteres. **Pendiente:** aplicar y verificar la misma política en Identity, protección de contraseñas comprometidas y límites de login/recovery del proveedor |
| Cierre de sesión real | Se mantiene logout del SDK; después de confirmar cierre se limpian datos del portal. **Pendiente:** prueba con una cuenta controlada para validar revocación/reutilización de tokens y sesiones entre pestañas |
| Tokens fuera del alcance de JavaScript | **Pendiente:** migración completa de login, refresh, invitaciones y recovery a sesiones del servidor con cookies HttpOnly. La versión actual del SDK usa cookies accesibles a JavaScript; no se marca esto como resuelto |
| MFA/2FA para propietarios y administradores | **Pendiente:** implementación mediante autenticación administrada y verificación del flujo de recuperación; no se añade una comprobación visual que pueda saltarse |
| Llaves privadas fuera del frontend | Ya se usan variables privadas; no se incorporaron credenciales nuevas. La revisión de secretos del último deploy estaba limpia |
| RLS | No se usa Supabase. El equivalente aplicable es autorización por tenant en las funciones; no se añade una política RLS a Blobs |

## Privacidad, contenido y suscripciones

| Recomendación | Trabajo realizado o siguiente validación |
| --- | --- |
| Privacidad, términos y reembolsos visibles | Políticas de plataforma existentes actualizadas; políticas del negocio visibles en el footer y junto a formularios/checkout mediante diálogo accesible |
| Políticas propias de cada comerciante | Builder solicita textos propios; portal permite editarlos. No se inventan plazos universales de devolución |
| Revisión previa a publicación | Servidor exige aceptación de términos, revisión de contenido/derechos/reseñas y políticas; registra fecha, versión y email del responsable |
| Datos mínimos y avisos de formulario | Aviso de finalidad y responsable junto a contacto y compra; teléfono continúa opcional; sin pedir fecha de nacimiento indiscriminadamente |
| Renovación clara y aceptación verificable | Checkbox sin marcar, importe/intervalo, cancelación y enlaces legales; registro de consentimiento en almacenamiento privado; precio real de Stripe debe coincidir con lo mostrado |
| Cancelación sencilla | Endpoint exclusivo del owner/admin, verificación de pertenencia en Stripe y botón “Cancelar futuras renovaciones”; conserva el periodo pagado; webhook firmado controla el estado de acceso |
| Evitar checkouts de suscripción duplicados | Bloqueo por negocio, reutilización de sesión abierta y expiración de sesión anterior al cambiar intervalo |
| Emails promocionales separados de transaccionales | Emails de reseñas requieren opt-in explícito, dirección postal del negocio y enlace de baja; recibos y confirmaciones no dependen de ese opt-in |
| Darse de baja | Token aleatorio, almacenado como hash, preferencias separadas por negocio y soporte de baja de un clic. GET muestra confirmación sin cambiar preferencias para evitar bajas por escáneres de email |
| Fuentes externas y grabación de sesiones | No se encontraron Google Fonts remotos ni session replay en la revisión. No se agrega tracking |
| Consentimiento de cookies no esenciales | Condicional: debe bloquear tecnologías opcionales antes de aceptarlas si se incorporan. No se añade un banner decorativo al no haber activado tracking opcional |
| COPPA/servicios dirigidos a menores | Condicional a cada negocio y a su público real. Se confirma representación adulta en el Builder, sin presentarla como solución universal a COPPA |
| Derechos de imágenes y reseñas veraces | Revisión obligatoria del responsable; ejemplos de Templates siguen marcados como ficticios; el Builder no acredita licencias automáticamente |
| DMCA | **Pendiente externo:** identidad legal y datos verificados del agente, registro aplicable, procedimiento de avisos/contraavisos y política de infractores reiterados. No se afirma que exista safe harbor |
| Identidad comercial y políticas legales | **Pendiente externo:** revisar nombre legal, domicilio, mercados atendidos, reglas sectoriales y textos con los datos reales del negocio |

Los registros nuevos de políticas, preferencias y facturación están agrupados por negocio; se incluyen en exports de backup y quedan sujetos a la eliminación existente del negocio. La política de retención legal de registros de facturación necesita revisión antes de establecer una retención fija.

## Checklist de publicación y capacidad

| Recomendación | Estado |
| --- | --- |
| HTTPS, CSP y protección contra embedding | Ya configurados; se conservan |
| Favicon, iconos y SEO de la home | Ya existentes; se conservan |
| 404 y enlaces legales | 404 real para rutas desconocidas; rutas SPA conocidas siguen funcionando; se corrige el enlace a `/refund-policy` |
| Accesibilidad | Nombres accesibles en contacto, estados anunciados, políticas con diálogo nativo y foco visible. **Pendiente:** auditoría completa WCAG 2.2, teclado y lector de pantalla; no se declara conformidad total |
| Antispam | Rate limit existente más honeypot en contacto; negocio sin entitlement público no recibe mensajes |
| Consultas eficientes | Cocina evita polling oculto y consultas superpuestas; lecturas fuertes también en preview; caché público existente se conserva |
| Concurrencia y reintentos | Bloqueos compartidos entre POS y finalización de Stripe; intentos POS protegidos y ligados a su contenido; un error interno deja el intento incierto para revisión antes de repetir |
| Webhooks duplicados | Contención devuelve error reintentable en lugar de confirmar un evento aún no procesado; se prueba entrega simultánea y otro evento para el mismo pago |
| Load balancers/autoescalado | Netlify ya administra distribución de tráfico. No se incorpora un balanceador propio o Redis sin necesidad demostrada |
| Capacidad bajo carga | **Pendiente:** prueba graduada en staging de usuarios, lecturas, reservas y pagos de prueba, métricas de p95/p99, errores, cuotas y costos. Las pruebas unitarias no demuestran capacidad para 10,000 solicitudes |
| Inventario online estricto y transacciones | **Pendiente:** reservas de stock en todos los canales y recuperación de fallos parciales entre registros. Blobs no proporciona transacciones multiobjeto; evaluar almacenamiento transaccional antes de prometer ausencia de sobreventa entre todos los canales |
| Backups y recuperación | Export existente ampliado para registros nuevos. **Pendiente:** simulacro de restauración, RPO/RTO y política operativa de backups |
| Monitoreo y procesamiento de reseñas | Se acota tiempo del lote y se evita envío simultáneo. **Pendiente:** métricas/alertas y paginación/cola para no depender del límite de 100 negocios o del tiempo de una función |
| SEO de páginas dinámicas y analítica | **Pendiente:** metadatos compartibles por negocio mediante HTML servido, sitemap dinámico y medición opcional con consentimiento cuando corresponda |

## Validación de esta entrega

- Tests de autorización, consentimiento, políticas, bajas y bloqueos.
- Dos ventas POS simultáneas por la última unidad: una venta y un conflicto.
- Un intento POS repetido: un solo recibo y un solo descuento de inventario.
- Eventos de Stripe simultáneos y repetidos: conflicto reintentable y un solo descuento de inventario en el caso probado.
- Regresión de Templates/idiomas y build de TypeScript/Vite.
- No se ejecutan cargos reales ni campañas de email para verificar esta entrega.

## Referencias de implementación

- [OWASP: Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP: Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Stripe: cancelación al finalizar el periodo](https://docs.stripe.com/billing/subscriptions/cancel)
- [FTC: CAN-SPAM](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- [Copyright Office: agentes DMCA](https://www.copyright.gov/dmca-directory/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
