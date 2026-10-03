# Operación del lote autónomo

## Verificación

`npm ci`, `npm test`, `npm run build`, `git diff --check`.

CI instala Chromium con `npx playwright install --with-deps --only-shell chromium` y ejecuta `node scripts/browser-accessibility-smoke.mjs`. Prueba Tab, Shift+Tab, Escape, retorno de foco y aislamiento del fondo en 390 y 1280 px. No sustituye prueba de iPhone ni auditoría completa WCAG.

`node scripts/audit-public-runtime.mjs https://deploy-preview-N--webfactorypr.netlify.app` comprueba rutas públicas y denegación de estados privados sin sesión. No usa cookies ni opera sobre datos.

`node scripts/benchmark-autonomous-batch.mjs` mide HTML y sitemap sintéticos hasta 5.000 negocios. `node scripts/benchmark-backup-archive.mjs` mide archivo/restauración en memoria. Son pruebas locales; no demuestran capacidad ni coste de producción.

## Recordatorios

El cron corre cada cinco minutos solo en producción publicada. Usa bloqueo global, cursores, páginas y límites de 10 negocios/100 reservas/20 por negocio por lote. El estado en Recursos requiere admin y MFA; no expone destinatarios.

Un error SMTP o un marcador enviado que no pudo persistirse queda `delivery_uncertain`; un claim `sending` de más de diez minutos también. No se borra para reintentar automáticamente. La bandera persistente `deliveryReviewRequired` evita que otro lote exitoso esconda el incidente. Revisar logs del proveedor y claves privadas de recordatorio antes de cualquier reenvío autorizado; sin evidencia de rechazo no reenviar. La bandera no se limpia automáticamente y requiere reconciliación operativa, no solo pulsar actualizar. El proveedor debe devolver al destinatario entre los aceptados SMTP. Esto reduce duplicados, no garantiza entrega exactamente una vez ni llegada a bandeja.

## Snapshots privados

Store: `webfactory-client-backups`, scoped por deploy en preview. Cron horario opt-in con `WEBFACTORY_BACKUP_SCHEDULE_ENABLED=true`, exclusivamente en producción publicada. Queda desactivado por defecto. Antes de activarlo acordar retención, coste, capacidad y RPO; validar permisos/almacenamiento y hacer un simulacro de restauración real con datos de prueba.

Se rota un negocio por ejecución, hasta 5.000 negocios listados. Con N negocios el intervalo nominal por negocio es N horas y puede crecer por fallos; no prometer RPO de 24 horas. Copia no transaccional: valida revisión del negocio y etags de imágenes, pero las reservas pueden cambiar durante la captura.

Límites: archivo de registros 4 MiB/5.000 registros, 100 imágenes y 64 MiB de binarios por negocio; presupuesto de ejecución acotado. Excederlos falla sin reemplazar la última copia válida. Snapshot contiene `records.json`, binarios verificados SHA-256 y `manifest.json`. `latest/<siteId>.json` solo se actualiza al finalizar verificaciones. Copias incompletas quedan privadas con `incomplete.json`; no se borran fuentes.

La acción «Verificar» comprueba checksums y lista completa de imágenes; no restaura, no reconecta Calendar/Stripe/ATH y no prueba recuperación real. La recuperación actual del panel cubre registros/manifiesto; no etiquetar una verificación de imágenes como restauración de imágenes. Restauración binaria completa y aceptación WF10 siguen pendientes.

No hay eliminación automática por antigüedad. Antes de mantenimiento manual revisar pointer actual, namespaces y retención aprobada; nunca borrar la última copia válida. La eliminación de negocio también borra sus snapshots y usa el mismo bloqueo global que el cron. No afirmar cumplimiento de retención legal hasta aprobar política.

## Eliminación y privacidad

Borrado por prefijo recoge todas las páginas antes de mutar, verifica cada borrado y falla ante claves ajenas, límite o timeout. Puede quedar una eliminación parcial que debe reintentarse; no anuncia éxito falso. El máximo síncrono es 5.000 claves por prefijo. La revocación externa de Google/Identity todavía requiere aceptación; no asumir que el éxito del borrado local prueba su revocación.

Archivos privados exigen autenticación y `private, no-store`; públicos tienen TTL 60 segundos. No compartir respuestas de endpoints privados. Verificar 401 sin sesión en estados de recordatorios y backup.

## SEO y despliegue

`/sites/:slug` entrega shell construido con metadatos seguros por negocio, canonical a producción y JSON-LD. Preview usa `noindex`; `/sitemap.xml` de preview queda vacío. Sitemap de producción lista páginas estáticas y negocios públicos con entitlement vigente, paginando; falla 503 si alcanza límites en vez de publicar lista parcial. El shell `dist/index.html` se incluye en el bundle de la función. Comprobar un negocio real autorizado después del despliegue; no inventar un negocio para indexarlo.

Aprobar CI y Netlify sobre el mismo SHA, comprobar rutas públicas y errores de bundle. Rollback a despliegue conocido compatible con los registros actuales; no retroceder a versión que omita soporte de inventario/archivo. No cambiar ni regenerar la clave MFA ya configurada. Autenticación personal, OAuth, sandbox, políticas legales y pruebas físicas se entregan al propietario solo cuando las demás tareas estén terminadas.
