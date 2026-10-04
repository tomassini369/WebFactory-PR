# WebFactory PR: registro maestro

Actualizado: 2026-10-03. Base de producción: PR #58, commit `c2e91e519a6477afc8b54900168b738f9482cff9`, deploy `6ac07055e4bf16ec1a470b08`.
Este documento es la fuente de continuidad. Los documentos de fases anteriores conservan evidencia histórica; no sustituyen este estado.

## Lote autónomo actual

Se trabaja en un solo lote con las tareas independientes que pueden implementarse sin cuentas nuevas, credenciales personales o decisiones del propietario. Preparar PR y preview; producción requiere una instrucción de publicación para este lote. No ejecutar cobros, eliminación de negocios reales, revocación de cuentas ni envíos externos de prueba por iniciativa propia.

Implementado en este lote: entrega incierta de recordatorios sin reenvío automático; procesamiento paginado y estado privado; metadatos iniciales por negocio y sitemap; copias privadas con imágenes y checksums; verificación sin restaurar; borrados paginados y comprobados; caché privada de archivos; foco y teclado en paneles ampliados; scripts de auditoría y benchmark; pruebas y runbook.

Las mejoras visuales publicadas, MFA con Authenticator confirmado por Kevin, desconexiones existentes e invitaciones por email no se vuelven a presentar como funciones ausentes. Las pruebas pendientes de aceptación se distinguen de su implementación.

## Evidencia del lote

PR: https://github.com/tomassini369/WebFactory-PR/pull/58. Código verificado: `9c17651850295ffc82c5e26c28f8af0366eb6eaf`; deploy preview `6ac05024d477120008901cfb`, ready, con el mismo SHA. CI https://github.com/tomassini369/WebFactory-PR/actions/runs/37083384292: verify y deploy-preview-smoke correctos; 287 pruebas, build y Chromium teclado a 390/1280 px. Ocho probes públicos/privados correctos; sitemap preview 200/noindex/vacío, slug inexistente 404/no-store. No hubo prueba de tenant público real con metadatos ni recuperación productiva. Los commits posteriores de documentación no cambian esa evidencia; verificar siempre cabeza actual y CI antes de publicar.

Preview: https://deploy-preview-58--webfactorypr.netlify.app/

## Pendientes en orden

| ID | Trabajo que sigue abierto | Evidencia y siguiente condición de cierre |
|---|---|---|
| WF01 | Aceptación completa de acceso y recuperación | Authenticator ya funciona. Verificar recuperación, dos pestañas, cookies y PWA real en iPhone sin compartir códigos. |
| WF02 | Revisión de configuración de Identity y revocación | Rutas privadas y pruebas locales existentes; comprobar configuración del proveedor, recuperación, limitación de intentos y comportamiento de tokens ya emitidos. No prometer revocación instantánea de JWT. |
| WF03 | Entrega externa de correo | Resend activo en producción; prueba recibida en inbox del administrador con SPF/DKIM/DMARC aprobados. Falta aceptar cada flujo y el render multiplataforma. Gmail disponible para reversión explícita. |
| WF04 | Aceptación de calendario y recordatorios | Hay sincronización existente y nuevo procesador con estado. Falta confirmar recordatorios en bandeja real, permisos y entrega incierta con proveedor. |
| WF05 | Aceptación de invitaciones y planes | Invitaciones por email y lógica de planes ya existen. Falta redención real, prueba, caducidad y plan de cortesía con cuentas de prueba. |
| WF06 | Ciclo de Billing en sandbox | Falta clave Stripe de prueba en preview y escenarios alta, renovación, cancelación y webhook. Nunca usar cobros reales como sustituto. |
| WF07 | Connect, pago y devolución en sandbox | Falta cuenta de prueba y aceptación de pagos, reembolsos y webhooks. |
| WF08 | ATH Móvil y conciliación incierta | Falta entorno autorizado del proveedor y pruebas de timeout, devolución y conciliación. |
| WF09 | Aceptación operativa de POS e inventario | Pruebas de concurrencia existentes pasan; falta prueba operativa de caja, conciliación y operación real con datos de prueba. |
| WF10 | Backup y recuperación real | Copia de registros e imágenes y verificación automatizada implementadas. Cron desactivado hasta decidir retención/coste y validar almacenamiento. Falta restauración de binarios en negocio de prueba, reconexión externa, RPO/RTO y aceptación. |
| WF11 | Aceptación de desconexión y eliminación | Funciones ya existen; este lote pagina y verifica borrados de registros, imágenes y snapshots. Falta validar revocación externa y eliminación con cuentas desechables; no se borraron cuentas reales. |
| WF12 | Alertas y operación | Estados privados de reseñas, recordatorios y backups visibles para admin. Falta definir destinatario/canal de alerta y validar incidente completo. No se enviaron mensajes. |
| WF13 | Capacidad del entorno alojado | Benchmark sintético de hasta 5.000 negocios preparado. Falta carga de red/almacenamiento real y presupuesto; resultados locales no equivalen a p95 de producción. |
| WF14 | Aceptación visual, accesibilidad e iPhone/PWA | Foco, Tab, Escape y aislamiento de panel ampliado corregidos; prueba Chromium en CI. Falta revisión integral de accesibilidad y dispositivo físico. |
| WF15 | Aceptación SEO de negocio real | Metadatos por negocio en HTML inicial, canonical y sitemap paginado implementados. Falta confirmar negocio público en preview/producción e indexación; contenido del cuerpo sigue siendo SPA. |
| WF16 | Datos legales y política de retención | Requiere identidad legal, contacto, plazos y aprobación del propietario. No inventar estos datos. |
| WF17 | Continuidad y runbooks | Registro y runbook creados en este lote. Mantenerlos en cada PR con SHA, validación y bloqueos. |
| WF18 | Aplicación nativa y Tap to Pay | Diferido; no bloquea web. |

## Avances posteriores a publicación PR58

PR58 publicado 2/oct 23:03 PR, 295 pruebas/CI aprobados. Nova Fade Studio: recuperación asistida ejecutada por el usuario; auditoría `91081824-1e38-437a-9c92-c1a527e6b351` reset/accepted y mensaje enviado verificados. Usuario confirmó nuevo Authenticator y login Safari. No repetir el escenario como pendiente; WF01 sigue abierto por códigos de un uso, rechazo de códigos antiguos/sesiones previas, expiración, dos pestañas, contraseña e invitaciones/PWA. Recepción inbox no comprobada por el agente. Las notas anteriores de este documento describen la etapa previa a la publicación y no la contradicen.

Lote de marca en correos solicitado el 3/oct: diseño común, identidad WebFactory/tenant, plantillas ES/EN y galería ficticia sin envíos. Véase `EMAIL_DESIGN.md`. Implementación en rama de revisión; no publicada por esa solicitud. Proveedor, MFA, facturación y OAuth conservados. WF03/WF14 avanzan, pero aceptación real en distintos clientes de correo/entregabilidad sigue pendiente. El video para Google Calendar sigue prioritario; guion preparado y permisos de Google Cloud por cotejar. IA y nativo/Tap to Pay separados.

## IA: carril separado

No forma parte del lote web actual. Mantener separados proveedores/modelos, costes y límites, generación asistida, seguridad y privacidad de entradas, evaluación de calidad y criterios de aceptación. BLIPO queda excluido. No activar IA ni contratar servicios sin una petición específica.

## Prompt maestro de continuidad

> Continúa WebFactory PR desde `docs/WEBFACTORY_MASTER_STATUS.md` y `docs/AUTONOMOUS_OPERATIONS_RUNBOOK.md` del repositorio `tomassini369/WebFactory-PR`. Comprueba main, PRs abiertos, CI, SHA del preview y despliegue publicado antes de decidir qué falta. No repitas tareas completadas ni confundas implementación con aceptación externa. Ejecuta en un lote todas las tareas independientes que puedas completar con los accesos disponibles; no pidas confirmación para cambios reversibles dentro del alcance. Mantén la IA separada, excluye BLIPO y deja aplicación nativa/Tap to Pay diferidos. No uses subagentes salvo petición explícita. No inventes resultados de proveedores, iPhone, restauración real ni cumplimiento legal. No ejecutes cobros, borrados de negocios reales o mensajes externos sin autorización específica. Conserva el registro con evidencia y bloqueos, prepara PR y preview verificados; publica producción únicamente cuando esté autorizado para el lote actual. Si una tarea requiere mi intervención, registra el paso exacto y continúa con las demás. Al terminar informa lo completado, pruebas, enlaces y únicamente los pendientes reales.


## Segundo lote: seguridad y recuperación asistida

Solicitud autorizada: reset de Authenticator de clientes y revisión de riesgos. Añade Control Center → Recursos → recuperación de clientes, registro privado, solicitud/identidad atestadas por soporte, MFA reciente del administrador, protección de cuentas admin, epoch que invalida todos los proofs antiguos y alta nueva, códigos viejos inválidos y passkeys conservadas. Notificación con un solo intento y estado incierto, sin reenvío automático. Véase `SECURITY_INCIDENT_AND_RECOVERY.md`. Pruebas con almacenes aislados; ninguna cuenta real restablecida. La verificación humana y aceptación real de soporte siguen pendientes. WF01/02/11/12/16 avanzan parcialmente; no se cierran por esta implementación. Auditoría independiente, configuración Identity y legal continúan abiertas.
