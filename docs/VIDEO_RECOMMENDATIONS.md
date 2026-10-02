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
| Tokens fuera del alcance de JavaScript | Implementación en preview: login, refresh y finalización de invitación/recovery emiten cookies HttpOnly/Secure/SameSite desde el servidor; el navegador consulta datos de usuario permitidos. **Pendiente de aceptación:** prueba integral con cuenta controlada, enlaces reales y cookies inspeccionadas en el navegador antes de producción |
| MFA/2FA para propietarios y administradores | Implementada en preview con passkeys y códigos de recuperación; aplicada en servidor. Pendiente aceptación con dispositivos reales y activar política en producción |
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
| Antispam | Rate limits corregidos a ventanas admitidas por Netlify (máximo 180 segundos), más honeypot en contacto; negocio sin entitlement público no recibe mensajes |
| Consultas eficientes | Cocina evita polling oculto y consultas superpuestas; lecturas fuertes también en preview; caché público existente se conserva |
| Concurrencia y reintentos | Bloqueos compartidos entre POS y finalización de Stripe; intentos POS protegidos y ligados a su contenido; un error interno deja el intento incierto para revisión antes de repetir |
| Webhooks duplicados | Contención devuelve error reintentable en lugar de confirmar un evento aún no procesado; se prueba entrega simultánea y otro evento para el mismo pago |
| Load balancers/autoescalado | Netlify ya administra distribución de tráfico. No se incorpora un balanceador propio o Redis sin necesidad demostrada |
| Capacidad bajo carga | **Pendiente:** prueba graduada en staging de usuarios, lecturas, reservas y pagos de prueba, métricas de p95/p99, errores, cuotas y costos. Las pruebas unitarias no demuestran capacidad para 10,000 solicitudes |
| Inventario online estricto y transacciones | **Pendiente:** reservas de stock en todos los canales y recuperación de fallos parciales entre registros. Blobs no proporciona transacciones multiobjeto; evaluar almacenamiento transaccional antes de prometer ausencia de sobreventa entre todos los canales |
| Backups y recuperación | Export v2 con checksum, paginación y alcance explícito; simulacro aislado en preview para hasta 100 registros. Pendiente recuperación integral con archivos, credenciales externas, volúmenes reales, RPO/RTO y calendario de backups |
| Monitoreo y procesamiento de reseñas | Procesamiento paginado con cursores por negocio y solicitud, contadores y avisos visibles; entregas inciertas no se reintentan automáticamente. Pendiente validar carga real y considerar una cola dedicada según volumen |
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

## Segunda entrega: protección del acceso

- Login de ambos portales e inicio de sesión posterior a una invitación pasan por un endpoint del servidor con CSRF, cuerpo máximo de 8 KB, errores genéricos y 10 solicitudes por minuto/IP. No se reintentan automáticamente contraseñas.
- Recuperación desde los logins usa un endpoint con 5 solicitudes por 180 segundos/IP y respuesta idéntica para emails conocidos, desconocidos o inválidos. No se devuelven tokens ni detalles del proveedor en JSON.
- El login del servidor utiliza `@netlify/identity`, seguido de navegación completa para restaurar la sesión desde sus cookies. **Las cookies del SDK y la sesión hidratada siguen accesibles a JavaScript; esto no completa HttpOnly.** Invitaciones, recovery y refresh todavía requieren la migración integral pendiente.
- Se corrigen tres reglas previas con ventanas de 3600 segundos, que excedían el máximo nativo de 180. Los límites nativos pueden tardar hasta 10 segundos en bloquear; no se presentan como un contador transaccional inmediato.
- Se niegan nombres heredados del prototipo como roles (`constructor`, `toString`, `__proto__`).
- **Pendiente del proveedor:** los endpoints directos de Identity siguen existiendo; sus límites y la política de contraseñas deben verificarse además de estos gateways. Esta entrega no afirma impedir todo ataque distribuido ni toda enumeración temporal.
- **MFA:** no se encontró una API de enrolamiento/verificación MFA en el SDK instalado. La documentación distingue 2FA de las cuentas del equipo Netlify de la autenticación de usuarios de los portales. Antes de habilitar MFA se necesita una integración administrada compatible, con enrolamiento y recuperación verificados y aplicación en cada endpoint privado.

Referencias: [Identity en Functions](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/use-identity-in-functions/), [rate limits y límite de 180 segundos](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/), [2FA del equipo Netlify](https://docs.netlify.com/manage/security/secure-netlify-access/enforce-2fa/).

## Tercera entrega: sesión del servidor

- `portal-session` permite leer un usuario con campos explícitos; refresh y logout requieren POST del mismo origen. El SDK sigue verificando al usuario en los endpoints privados existentes.
- Los cambios de cookies del SDK se adaptan solamente en el Context de la solicitud: HttpOnly, Secure, SameSite=Lax, path=/, sin Domain. Los writes se acumulan hasta que la operación termina correctamente; no se modifica el SDK ni el contexto global. Si el runtime no permite adaptar su cookie jar, el login falla cerrado.
- El frontend importa solamente tipos de Identity. Login, invitaciones, recuperación, refresh y logout usan endpoints propios; no lee/escribe cookies, no hidrata tokens ni los guarda en localStorage. Se elimina la sesión heredada `gotrue.user`. La actualización de cookies heredadas requiere que Identity acepte el usuario.
- Las operaciones de verificación de enlaces y cambio de contraseña llaman desde el servidor a la API del proveedor; `@netlify/identity` conserva login, lectura de usuario, refresh, logout y gestión administrativa. Así se evita usar los helpers de cuenta con un current-user compartido entre invocaciones.
- Enlaces de email: su secreto se retira del URL y vive en memoria hasta enviar el nuevo password. No se consume el token en un GET. El servidor exige al menos 15 puntos de código y limita el cuerpo a 8 KB. Un refresh de la página después de retirar el hash necesita abrir de nuevo el enlace.
- Se serializa refresh por página y, cuando existe Web Locks, entre pestañas. Se renueva solo con la página visible. Un error de red no equivale a logout. Los eventos entre pestañas no llevan datos privados; cambiar de cuenta borra los datos anteriores antes de consultar la nueva.
- Se incrementa la versión del service worker para actualizar los shells PWA. Las pestañas que ya tienen JavaScript antiguo abierto deben recargarse; no se afirma poder borrar tokens previamente copiados. Los endpoints de Identity externos al gateway siguen disponibles.
- Logout elimina las cookies mediante el SDK y limpia los datos locales. **No se promete revocación inmediata de todos los JWT ya emitidos:** Identity documenta que el logout revoca refresh tokens pero los access tokens pueden ser válidos hasta expirar; el SDK además tolera fallos del logout remoto. La revocación central inmediata y un simulacro con sesiones reales permanecen pendientes.
- **MFA sigue pendiente:** no hay una API de enrolamiento/verificación en el SDK usado. Stripe Directory se consultó como vía de descubrimiento, pero su plugin no pudo ejecutarse en este entorno (socket local no permitido). No se configuró un proveedor nuevo, no se asumió una cuenta disponible ni se activó una pantalla de MFA sin verificación del servidor.
- Verificación automatizada: SDK real con proveedor simulado para login y refresh, dos cuentas concurrentes, errores sin cookies parciales, recuperación/invitación sin tokens en JSON, contraseña Unicode, origen inválido, callbacks repetidos de React, ausencia de acceso a cookies desde JS y cambio de cuenta entre pestañas.
- **Antes de producción:** probar una cuenta controlada con login válido/erróneo, inspección de flags HttpOnly en navegador, expiración/renovación, invitación real, recuperación real, dos pestañas, logout y sesión instalada como PWA. Las pruebas sin cuenta real no sustituyen esta aceptación.

Fuente del comportamiento de logout y verificación: [API del proveedor de Netlify Identity](https://github.com/netlify/gotrue).

### Fase 4 — Segundo factor con passkeys (vista previa)

- Identity valida la contraseña; una sesión privada adicional HttpOnly de ocho horas se crea únicamente después de ese login. WebAuthn exige verificación de usuario y valida firma, challenge de un uso, origen y RP ID en el servidor.
- Todos los endpoints que usan `requireClientUser` exigen segundo factor cuando la cuenta tiene passkeys o la política lo requiere. La vista previa exige inscripción; producción mantiene inscripción opcional hasta activar `WEBFACTORY_REQUIRE_MFA=true` después de la aceptación real.
- Ambos portales muestran el paso de seguridad y permiten administrar hasta cinco passkeys. Diez códigos aleatorios de recuperación se muestran una vez; solo se almacenan hashes y cada código se consume una vez bajo bloqueo. Regenerar códigos o eliminar dispositivos invalida las verificaciones de otras sesiones.
- Registrar el primer dispositivo exige contraseña verificada en los últimos cinco minutos. Cambiar credenciales o códigos requiere segundo factor reciente. La última passkey no puede eliminarse; primero hay que registrar su reemplazo.
- Los registros privados se eliminan después de borrar la cuenta de Identity. La eliminación de Identity y Blobs no constituye una transacción: un fallo posterior requiere limpieza administrativa. La limpieza programada añadida en fase 5 recoge los registros nuevos mediante índices de caducidad; su caducidad también se exige al leerlos.
- Las credenciales quedan vinculadas al origen de inscripción. La vista previa usa un store por deploy y no transporta credenciales a producción ni al próximo deploy. Antes de activar la política en producción hay que fijar el dominio canónico y completar aceptación en dispositivos reales, incluido código de recuperación y reemplazo de passkey. Los tests criptográficos no sustituyen esa aceptación.
- No se habilitó MFA nativo de un proveedor nuevo ni se publicó a producción. No se promete revocación inmediata de todos los JWT de Identity para cuentas sin inscripción cuando la política de producción está desactivada.


### Fase 5 — Mantenimiento de seguridad y recuperación verificable

- Cada sesión privada y desafío MFA nuevo crea primero un índice de caducidad. Una función horaria publicada recoge hasta 100 índices por ejecución, con presupuesto de 18 segundos y bloqueo de cuenta. Solo considera horas anteriores; puede haber una demora adicional antes de borrar un registro caducado. Las credenciales y sesiones vigentes nunca se eliminan por un índice malformado. Los índices huérfanos se limpian al caducar. El handler no ejecuta mantenimiento en preview; las pruebas usan almacenamiento aislado.
- Los backups JSON v2 incluyen checksums SHA-256 sobre el contenido, todos los registros de comercio y eventos paginados y las colecciones V3 derivadas de esos registros, eliminando el corte anterior de 1,000 filas. SHA-256 detecta alteraciones accidentales; **no acredita la autenticidad de quien preparó el archivo**. Se validan duplicados y límites entre negocios aunque el checksum haya sido recalculado.
- El export síncrono admite hasta 4 MiB, hasta 5,000 entradas por negocio y hasta 100 negocios en el export conjunto, con presupuesto compartido de 40 segundos. Exceder los límites devuelve un error, nunca un archivo parcial marcado como exitoso. Los registros pueden cambiar durante la lectura: Blobs no aporta una instantánea transaccional multiobjeto.
- El alcance es configuración, commerce, eventos/políticas/preferencias y un **manifiesto de assets**. No contiene binarios de imágenes, secretos OAuth, credenciales MFA/Identity, variables privadas del proveedor ni una réplica de Stripe. Conservar originales de los assets y volver a conectar integraciones sigue siendo necesario para una recuperación integral.
- Recursos del portal administrativo permite subir un export v2 para un simulacro en **deploy preview exclusivamente**, con admin/MFA, mismo origen, límite de cuerpo de 4 MiB y hasta 100 registros incluyendo índices reconstruidos. El servidor escribe en `webfactory-backup-drills` dentro del deploy, nunca en los stores operativos, vuelve a leer y compara cada registro y reconstruye índices de slug y membresía. Las copias temporales se borran antes de devolver éxito, también después de fallos parciales. Un fallo de limpieza genera error y deja una referencia de mantenimiento en logs, sin contenido privado. Un cierre abrupto de la función puede dejar residuos en ese store separado; eliminar el deploy o limpiar el prefijo de drill es parte del procedimiento administrativo. No hay endpoint de importación a producción.
- Validación offline: `node scripts/validate-backup.mjs /ruta/backup.json` comprueba integridad, límites y estructura sin enviar los datos a un proveedor. Los exports v1 anteriores no incluyen checksum; conservarlos, pero generar v2 para este nuevo flujo.
- Pruebas reproducibles: export de 1,005 clientes V3, restauración y lectura de registros e índices, corrupción, claves cruzadas, duplicados, archivo modificado, desaparición de registros durante export, escritura incierta, fallo de limpieza y límites de entorno/autorización/tamaño. Esto no mide recuperación de producción ni garantiza RPO/RTO.
- **Aceptación pendiente:** ejecutar un backup de staging con cuenta controlada y MFA, verificar el simulacro hospedado, recuperar archivos externos y reconectar integraciones. Medir RTO desde el inicio del incidente hasta recuperar servicio y RPO según el último backup recuperable. El calendario, conservación y objetivos deben fijarse con datos operativos reales; no se inventa una garantía horaria a partir de tests en memoria.


### Fase 6 — Reseñas reanudables y entregas inciertas

- El worker deja de cortar el conjunto a 100 negocios y las reseñas a 500 filas: lista punteros mediante páginas y guarda cursores para repartir el trabajo entre negocios y solicitudes. Ordena los punteros antes de rotarlos; no depende del orden del proveedor. Las pruebas recorren 151 negocios y 505 solicitudes en lotes repetidos.
- Lotes de hasta 10 negocios, 20 solicitudes totales y cinco por negocio, con presupuesto de 18 segundos y reserva previa de ocho segundos para un envío. El schedule propuesto corre cada diez minutos solo en producción publicada. SMTP de reseñas usa timeout total de seis segundos, cierre del transporte y estado incierto si no hay confirmación. Ningún correo se envía desde el preview o desde tests.
- Se relee la solicitud y la configuración, se exige fecha válida, opt-in explícito y dirección postal, y se comprueba la baja nuevamente antes de reclamar el envío. Un bloqueo del lote y otro de la solicitud, más el etag de la lectura, protegen los cambios concurrentes. El correo usa la versión actual de la solicitud, no una copia anterior.
- Se guarda `sending` antes de contactar al proveedor. Si SMTP o la persistencia final falla, se registra `delivery_uncertain`. Si una función se interrumpe, un `sending` de más de 15 minutos se convierte a incierto cuando el cursor vuelve a visitarlo. No se reenvía automáticamente: el proveedor puede haber aceptado el email antes de que falle su respuesta. Esto prioriza evitar duplicados; una incertidumbre también puede corresponder a un correo no enviado. Revisar evidencia del proveedor antes de crear otro intento sigue siendo un procedimiento humano.
- Fallos previos al contacto con el proveedor, como preparar la baja, conservan `pending` con espera de 15 minutos. Un proveedor no configurado no reclama ni consume solicitudes. Un email confirmado por SMTP se marca `sent`; esto indica aceptación del proveedor, **no entrega garantizada en la bandeja de entrada**.
- Recursos administrativos muestra el último lote y avisos por incidencias, proveedor no configurado o más de 30 minutos sin lote en producción. Marketing del negocio muestra las 50 solicitudes recientes y estados legibles. Los contadores son del último lote, no un inventario acumulado de pendientes. No hay alertas externas automáticas ni reenvío por botón.
- La lista de punteros tiene un máximo explícito de 50,000 por consulta y comparte el presupuesto del lote; excederlo genera fallo, no se presenta como procesamiento completo. Todavía se enumeran punteros para ordenar y reanudar. Esta implementación mejora la progresión, pero no reemplaza una cola con índices de vencimiento para volúmenes grandes; pruebas de carga, costos, latencia y monitoreo externo siguen pendientes.
