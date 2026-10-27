# Booking Engine Pro — integración en PR #125

Fecha: 2026-10-26. Solo preview; no autorización de producción.

## Base auditada

La integración parte de `7e7eac3f50b255da750b9b7b9721be4acd395e88` en `feat/kiosk-skin-engine`. Se revisaron main y PR #115 sin aplicar merges a ciegas. El motor de la integración ya contenía horarios, ausencias, buffers, límites diarios, reservas temporales con bloqueo y sincronización Google. Se conserva ese motor, Netlify Blobs y los registros canónicos. PR #126 se incorpora a la rama del preview #125; no se necesita otro sitio ni otra agenda.

Goldie se utilizó como referencia funcional para vistas, reglas, recurrencia y seguimiento de asistencia, sin copiar sus recursos.

## Implementado

- Agenda diaria, tres días, semanal y mensual, Hoy, navegación, filtros de profesional/localidad, estados, pagos, duración y detalle accesible. Acciones existentes de comercio y enlaces privados para reprogramar; aprobación/rechazo de solicitudes desde el detalle.
- Endpoint de agenda con autorización canónica y rango máximo de 42 días. Preserva reservas anteriores al límite de 250 registros del panel comercial y restringe empleados/sucursales.
- Políticas validadas en servidor: anticipación, horizonte, intervalos, buffers y plazos independientes para cancelar/reprogramar. Defaults compatibles; horizonte 0 mantiene el comportamiento previo.
- Aprobación manual opcional únicamente para pago presencial. Las solicitudes pendientes ocupan disponibilidad. Aprobar vuelve a validar con el mismo motor y comparte el bloqueo de cambios de la reserva.
- Lista de espera opcional por negocio con consentimiento explícito, límite por IP/email, tokens aleatorios almacenados como hashes, cancelación y gestión del propietario. Ofertas tras cancelaciones privadas y acción del propietario; invitaciones con caducidad, sin retener ni confirmar la cita. El checkout existente valida disponibilidad de nuevo.
- Series semanales, quincenales y mensuales, máximo 12 ocurrencias dentro de 365 días, procesadas de tres en tres. Identificadores estables, conflictos por ocurrencia y cancelación futura con las políticas existentes. Solo pago presencial; no cobros automáticos.
- No-show sin cargos automáticos, indicador de cancelación tardía y contadores del período visible. Se conserva completar citas y conciliación de pagos.
- Conversión de zona horaria que rechaza horas inexistentes por DST y elige de forma determinista la primera hora repetida.
- Lecturas paginadas en lotes de 20 y exclusión controlada de la propia solicitud durante aprobación. No se añade proveedor de datos.

## Seguridad y compatibilidad

Los endpoints administrativos reutilizan `requireSiteCapability`, Owner/Employee, restricciones de localidad y origen. El empleado recibe el registro permitido por `employeeCommerceRecord`. Aprobación, cancelación privada y acciones comerciales sobre reservas con token comparten bloqueo. Las escrituras de aprobación e invitación utilizan condiciones de versión. Emails operativos usan la cuenta conectada del negocio; no se añade fallback corporativo.

Se conservan Marketplace, Builder, POS, kiosco, skins, QR, impresión, recibos, OAuth y proveedores de pago. No hay migración destructiva ni cobros o mensajes reales de pruebas.

## Verificación automatizada

- `npm test`: 779 pruebas, 779 aprobadas. Incluye aislamiento/autorización, disponibilidad/concurrencia, gestión privada, POS/kiosco y proveedores simulados ya existentes; además políticas, DST, lista de espera, recurrencia y aprobación simultánea.
- `CONTEXT=deploy-preview npm run build`: correcto, incluye TypeScript. Aviso existente de chunks grandes.
- `scripts/browser-booking-pro-smoke.mjs`: Chromium, 28 combinaciones (320, 375, 390, 430, 768, 1024 y 1440 × ES/EN × Light/Dark), cuatro vistas, sin desbordamiento horizontal, abrir detalle/cerrar con Escape. Datos sintéticos locales. Esta prueba de componente no sustituye un recorrido completo autenticado del portal.
- El navegador predeterminado falló al descargar; se ejecutó la prueba con Playwright 1.51.1 aislado, sin alterar las dependencias del proyecto.

## Límites y aceptación pendiente

- WebKit depende de bibliotecas del sistema no disponibles inicialmente; su resultado debe registrarse por separado. iPhone/Android físicos no verificados.
- La disponibilidad y la agenda todavía recorren datos históricos paginados. No se ha implementado índice transaccional por fecha ni medido carga distribuida de producción. Requiere trabajo adicional antes de afirmar escalabilidad masiva.
- Lista de espera: máximo 500 solicitudes por lectura; entrega incierta no se reintenta automáticamente para evitar duplicados. Una invitación caducada no vuelve automáticamente a la cola. La caducidad no equivale a borrado automático; cancelar elimina el contacto de la solicitud.
- El historial de asistencia por cliente y métricas históricas consolidadas no están completos; los contadores actuales corresponden al período visible.
- Series: errores de proveedor y recuperación después de una caída real requieren aceptación en sandbox. No se habilitan depósitos/cobros recurrentes.
- Google Calendar, correo conectado, Stripe/ATH y dispositivos reales requieren aceptación de proveedor aislada antes de producción. Tests simulados no prueban entregas reales.

## Comunicación y políticas

El formulario solicita consentimiento específico para avisos de disponibilidad; la invitación explica que no es una reserva. El negocio debe publicar sus plazos de cancelación/reprogramación y condiciones de depósitos. La política de privacidad debe describir solicitudes de espera, contacto, consentimiento, caducidad y mecanismo de cancelación; no debe prometer eliminación automática mientras no exista una tarea de conservación verificada. No se afirma cumplimiento legal absoluto. No se cambian scopes OAuth ni se permiten penalidades automáticas.

## Siguientes mejoras

Índice derivado con reparación y comprobaciones contra el registro canónico, paginación visible de solicitudes, eliminación programada de contactos caducados, historial por cliente y pruebas de carga distribuida. Deben mantenerse dentro del mismo motor y preview antes de cualquier decisión de producción.

## Actualización: ciclo de vida de lista de espera

La gestión del Dueño pagina 50 solicitudes mediante cursor del último ID (orden estable), incluyendo registros posteriores al límite anterior de 500. Se listan metadatos y se leen únicamente los contactos de la página. La lista de claves todavía se recorre; esto no es el índice de disponibilidad pendiente.

Las solicitudes vencidas conservan el registro operativo pero se elimina su contacto con escritura condicional. Las invitaciones entregadas que vencen vuelven a esperar dentro del plazo original de consentimiento, hasta tres invitaciones por solicitud. Los envíos inciertos no se reciclan automáticamente.

`booking-waitlist-maintenance` recorre páginas de negocios de forma incremental cada 15 minutos UTC. Tiene límite de trabajo por ejecución y checkpoints; solo se ejecuta automáticamente en un deploy publicado de producción. En preview permanece inactiva y se prueba con almacenes ficticios. Las lecturas administrativas y ofertas también mantienen los registros examinados. No se ha ejecutado una limpieza sobre datos reales en esta implementación.

## Actualización: caché derivada de disponibilidad

La consulta diaria/mensual lista las versiones de reservas y holds para construir una huella por negocio, empleado, rango y buffers de catálogo. Si esa huella coincide, reutiliza bloques derivados durante un máximo de 30 segundos y filtra holds vencidos al leer. Cualquier cambio de ETag invalida la caché. Fallos de caché vuelven a la lectura canónica; sin ETags no se activa. Google Calendar continúa consultándose por el flujo existente.

Crear un hold ignora siempre esta caché y lee reservas canónicas dentro del bloqueo existente. La caché nunca autoriza una cita. No se migra el histórico ni se crea otra agenda. Prueba sintética: 300 registros, 301 lecturas de objetos en frío y 1 en caliente, además de los listados de metadatos. Prueba integrada: 25 holds simultáneos para la misma hora producen un éxito y 24 conflictos; el siguiente intento también se rechaza.

Esto reduce descargas repetidas, pero no equivale a un índice transaccional completo por fecha. Los listados de claves siguen recorriendo el histórico; la creación de holds mantiene las lecturas completas para preservar la seguridad. Quedan pendientes el índice completo, carga distribuida y aceptación física/proveedores. Los avisos ES/EN de privacidad del preview describen espera, caducidad, asistencia y enlaces privados como comportamiento del producto, sin afirmar cumplimiento legal absoluto.

CI: la prueba POS se actualizó para afirmar QR predeterminado y visible automáticamente, seleccionando efectivo explícitamente en el escenario de pago recibido. Se conservan las comprobaciones de reintento idempotente, respuesta perdida, permisos y confirmación del servidor. El panel de campañas tolera una lista omitida en respuestas parciales, evitando una excepción al abrir Ajustes en las pruebas aisladas.
