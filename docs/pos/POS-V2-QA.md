# POS 2.0 · QA Etapa 1

## Resultado local ejecutado

- `npm test`: **405 PASS, 0 FAIL, 0 skipped**, incluye integración commerce, competencia por la última unidad, reservas, reintentos/recovery y permisos de venta directa/idempotente/checkout/Terminal.
- `CONTEXT=deploy-preview npm run build`: **PASS**, TypeScript + Vite + postprocesado. `tsc --noEmit` separado: PASS.
- Nuevo `browser-pos-v2-smoke.mjs`, Chromium: **28 combinaciones**, 320/375/390/430/768/1024/1440 × Light/Dark × ES/EN. Sin overflow ni excepciones JavaScript, stock/agotados/filtros/cantidades, importes y objetivos 44 px.
- Mismo smoke, WebKit táctil: **16 combinaciones**, 320/375/390/430 × Light/Dark × ES/EN. Mismas comprobaciones e interacción. Es WebKit Linux, no un iPhone físico.
- Rechecks finales Chromium 390/1440: **8 combinaciones PASS**, contraste/control del icono de búsqueda, superficies sólidas, layout sticky desktop/static móvil, panel ampliado/Escape/collapse y operaciones aisladas.
- Operaciones de QA: todo request interceptado. Respuesta perdida → exacto mismo payload/attemptId; doble cobro bloqueado; marcador restaurado tras navegación; confirmación solo después del estado backend `paid`; nueva venta obtiene nuevo ID. Los marcadores no contienen customer, email ni tokens.
- Permisos: employee sin POS; cashier sin descuentos/propinas ni editor de catálogo; tenant distinto rechazado en lectura de intentos; server no retorna customers/response secreta.
- Regresión del workspace de ambos portales: **PASS**, 20 layouts y navegación, menús, Escape, roles y transiciones existentes. Home/Builder tienen smokes adicionales y también se ejecutan en CI; resultados finales remotos se registran en el PR.
- `git diff --check`: PASS.

La nueva matriz Chromium/WebKit queda integrada en `.github/workflows/v3-ci.yml`, después del build y la instalación de browsers. El presupuesto máximo del job sube de 30 a 40 minutos por las dos matrices adicionales; no se omiten regresiones previas.

## Errores encontrados y corregidos

1. Límite de UI 100 vs API presencial 20: ahora la UI permite 20 como máximo y limita existencias conocidas; servidor conserva validación/CAS.
2. IVA/IVU estimado agregado ignoraba artículos exentos, overrides e IVU incluido: centavos y cálculo por línea, probados contra `calculateTax` existente.
3. Editar carrito borraba el checkout pendiente: snapshot bloqueado, intento estable, verificación explícita y estado de sesión mínimo.
4. Cajero podía enviar ajustes directamente a endpoints: guard compartido antes de side effects en los cuatro flujos POS/Terminal. Prueba verifica 403 y cero cambios de stock/markers.
5. Capas globales del portal reintroducían degradado/blur/sombra: especificidad acotada al POS; QA exige `backgroundImage=none`, `backdropFilter=none`.
6. Icono de búsqueda superponía texto por padding heredado: padding verificado ≥44 px. Toolbar del panel estático dentro del POS para evitar superposición.
7. Contraste de controles/marcas: bordes propios y fallback a azul calibrado si la marca no permite texto legible. Importe con tabular figures; foco visible.
8. TypeScript detectó `user_metadata` (la API frontend usa `userMetadata`) y ausencia de style en PortalPanel: corregidos; style opcional mantiene las instancias anteriores.
9. QA inicial usaba una clase de sidebar inexistente: selector por rol y nombre accesible. Smoke Home usaba otra variable de ejecutable y falló al buscar browser no instalado; se diagnosticó y reejecutó con `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. No se contabilizó ese intento como aprobado.

## Anti-Slop e Impeccable

After conforme AGENTS.md. Motivos: catálogo visual para reconocer artículos, jerarquía de total/acción para cobrar, superficies sólidas dentro del glass existente para lectura y Safari, mínimo movimiento y componentes/stack nativos. No efectos continuos, números ficticios ni nuevos destinos vacíos. Fotografías de capturas corresponden a fixtures aislados y un recurso stock ya usado en templates, no a clientes reales.

Impeccable 4.1.0: **20 recomendaciones heredadas**, exit 2 esperado, ningún hallazgo en los archivos nuevos del POS. [JSON](POS-V2-IMPECCABLE.json). El detector no certifica todo el producto.

Pares calculados con fórmula WCAG: ink/white 15.25:1; secondary/light canvas 5.75:1; ink/dark surface 14.60:1; secondary/dark 9.14:1; white/CTA blue 6.41:1; borde interactivo light 3.72:1; borde dark 5.24:1. `posBrandPair` prueba white/navy y fallback seguro; no se afirma auditoría AA global.

Delivery Gate **PASS para el alcance modificado**: controles funcionales, estados vacíos/error/pending, temas/idiomas, reduced motion, foco y navegación; identidad/jerarquía derivadas del negocio y DESIGN; sin escrituras reales de QA. Detector conserva recomendaciones heredadas documentadas.

## Reproducción cloud

```bash
export PATH=/workspace/.cloud-tools/node_modules/node/bin:$PATH
export npm_config_cache=/workspace/.npm-cache
export NODE_USE_ENV_PROXY=1
npm test
CONTEXT=deploy-preview npm run build
QA_CHROMIUM_PATH=/usr/bin/chromium node scripts/browser-pos-v2-smoke.mjs
PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright \
LD_LIBRARY_PATH=/workspace/.webkit-deps/usr/lib/x86_64-linux-gnu \
QA_WEBKIT_PATH=/workspace/.playwright/webkit-2336/pw_run.sh \
QA_ENGINE=webkit QA_PORT=5221 QA_WIDTHS=320,375,390,430 \
node scripts/browser-pos-v2-smoke.mjs
```

## Límites

No se realizaron pagos reales, llamadas de venta a Stripe/ATH ni registros de asistencia. Fixtures y stores en memoria conservan datos productivos. El preview se valida después del push, por SHA en estado Netlify/GitHub; este informe local no afirma que un deploy ya haya terminado. POS se mantiene dentro del portal autenticado. No hay demo pública que suplante un negocio existente.

Workforce, Display, Kiosk, permisos por módulo, extras/modificadores y reglas por negocio siguen en Etapas 2–6, según [arquitectura/propuesta](POS-V2-ARCHITECTURE.md). No se fusiona main ni PR #101.
