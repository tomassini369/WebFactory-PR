# PR #125 — Centro único de Personalización (30 octubre 2026)

## Alcance

La navegación del portal de negocios tiene una sola entrada visual **Personalización / Personalization**, visible tanto en el menú como en el dock. Su editor centralizado reutiliza servicios y componentes existentes, sin crear una segunda base de datos ni reemplazar los contratos de apariencia.

- **Portal y POS:** preferencias personales (idioma, tema, sonido/háptico) y apariencia del dashboard, incluyendo relieve de tarjetas y botones usado por el cajero. Se mantiene el almacenamiento privado por usuario del endpoint `dashboard-appearance`.
- **Kiosco:** editor existente con un catálogo único de 23 paletas seleccionables (las seis anteriores y las 17 agregadas), todas mostradas como tarjetas del mismo estilo con seis tonos superpuestos y sus códigos HEX. El aspecto se almacena por negocio y solo se muestra a quien tenga el rol y los permisos requeridos para editar ajustes.
- **Página web:** acceso centralizado al Builder existente, con sus verificaciones de suscripción y autorización. El Builder sigue siendo el editor de páginas públicas; no se sustituye por una maqueta.

Se retiraron entradas *duplicadas* para la apariencia desde el perfil de negocio, desde la configuración **operativa** del kiosco y desde el cajero. Las configuraciones operativas de POS y kiosco se conservan en sus secciones anteriores. El portal administrativo de la plataforma mantiene sus preferencias personales existentes.

Las 23 paletas aparecen juntas bajo el título **Paletas de colores / Color palettes**, sin etiquetas ni grupos de tipos. Las seis paletas anteriores incorporan ahora seis tonos de muestra; las cuatro paletas agregadas que solo tenían cuatro colores de referencia se amplían a seis tonos compatibles. Cada paleta mantiene su ID y campos previamente validados de color principal/secundario y degradado. Seleccionar una paleta solo modifica el borrador; **Guardar apariencia** activa sus colores. El cambio de paleta selecciona fondo degradado y desactiva el fondo decorativo solo dentro del borrador para mostrar los colores correctamente. Los recursos de imagen subidos mantienen su propio ciclo de vida y pueden almacenarse antes de activar una apariencia.

## Límites que deben respetarse

No hay migraciones nuevas. No se modifican APIs de operaciones, permisos, pagos, reservas, pantalla vinculada, tokens ni Google OAuth. `main` y producción no deben fusionarse ni publicarse.

La vista previa *real en una pestaña nueva, sincronizada y de solo lectura* requiere trabajo separado de aislamiento de acciones y transporte de borradores. **No está implementada con este cambio.** El editor del kiosco conserva la vista previa visual local que ya tenía, y los ajustes del dashboard conservan su propio editor.

## QA necesario antes de afirmar listo

- Compilar y ejecutar `npm test`.
- Ejecutar pruebas del perfil, navegación, Dashboard, POS y personalización del kiosco en ES/EN, temas claro/oscuro y viewport móvil y escritorio.
- Verificar que empleados no puedan modificar ajustes visuales del kiosco, pero sí preferencias personales.
- Confirmar que el botón de guardado respeta la configuración seleccionada y que salir con un borrador conserva su protección de cambios sin guardar cuando corresponda.
- Confirmar que no se generan solicitudes de cobro/orden desde vistas previas ni se alteran configuraciones de negocios reales durante QA.
- Comprobar el preview #125 generado y su commit SHA, y que el deploy productivo continúe en el commit anterior.

## Integración de Anime.js V4 y roles de las seis muestras

- Se añadió `animejs@4.5.0` (MIT) como dependencia fijada en `package.json` y `package-lock.json`. La API empleada es `animate()` de V4; no se introdujeron scripts externos/CDN.
- Existe **un catálogo canónico** de 23 paletas, en `shared/color-palettes.mjs`, reutilizado en el Dashboard/Pos y el kiosco. No hay división básica/premium.
- Cada paleta aporta seis tonos: (1) fondo, (2) tarjetas, (3) paneles, (4) acciones, (5) detalles y realces, (6) contornos e iluminación. Los colores de texto se calculan por contraste a partir de los fondos en vez de forzar un tono del catálogo potencialmente ilegible.
- El Dashboard y el POS comparten una selección personal validada y guardada a través del endpoint de apariencia existente; el kiosco mantiene su esquema de apariencia por negocio y reconoce las paletas por los colores ya persistidos. Las preferencias previas sin paleta siguen utilizando sus estilos originales.
- La transición de paletas es de 420 ms, usa los tokens CSS de cada superficie y evita que Anime.js y Framer Motion intenten animar el mismo elemento. Al activar movimiento reducido o desactivar animaciones, los valores se aplican directamente.
- Seleccionar una paleta en el editor **no** ejecuta ninguna escritura de configuración; se requiere la acción explícita de guardar. Las vistas del kiosco existentes permanecen como muestra visual sin funciones de cobro.
- El selector admite las 23 paletas tanto en Dashboard/Pos como en kiosco. En el Dashboard el modo claro deriva superficies claras de la misma paleta; el modo oscuro mantiene sus tonos de base. No se modificaron los archivos de identidad visual.
- El website público continúa utilizando el Builder existente y sus estilos guardados: este cambio **no crea una migración del diseño de los sitios públicos existentes**.

Pruebas añadidas: contrato de 23×6 colores, validación de IDs en el backend y aislamiento por usuario, inspección de seis variables CSS en el kiosco, y ciclo de guardar/recargar de un tema del Dashboard. Deben completarse las pruebas CI y QA en navegador antes de declarar que el preview está listo.

## Fondo original y efecto de refracción de código abierto

- **Mantener imagen de fondo original:** casilla en Dashboard y kiosco que elimina el oscurecimiento de la fotografía, sin sobrescribir su posición, archivo o configuración de paleta. El control se mantiene como borrador hasta Guardar.
- **Mayor transparencia del cristal:** Dashboard: 20–96%; kiosco: 25–95%. El mínimo anterior y sus valores guardados siguen siendo válidos.
- **Cristal fluido con código existente:** `simple-liquid-glass@5.4.0`, repositorio https://github.com/lucaperullo/simple-liquid-glass, licencia MIT, compatible con React 19. Se utiliza el componente de refracción del paquete; no se desarrolló un shader propio ni se copió código o componentes de Apple. Conservar los avisos de licencia del paquete.
- La opción `Cristal fluido` activa la biblioteca en las tarjetas `PortalPanel` del Dashboard y en el encabezado y carrito del kiosco. La fuente óptica es la imagen de fondo dentro del mismo documento, mediante `backdropSelector` y referencia aislada por kiosco. Se mantiene la apariencia clásica como opción.
- La librería utiliza WebGL cuando el navegador y la fuente del fondo lo permiten, particularmente Safari/iOS. Si el contexto gráfico o la captura no son compatibles, ofrece un fallback definido por la biblioteca; no afirmar equivalencia píxel por píxel con iOS nativo.
- Con `prefers-reduced-transparency`, impresión o colores forzados, el efecto se desactiva para mantener legibilidad. Comprobar la experiencia en iPhone Safari real, escritorio y Android, y medir memoria, GPU y FPS antes de ampliar el efecto a más superficies o activar por defecto.
- No se modifican el logo, funciones de negocio, contratos de pagos, credenciales, OAuth, main ni producción.
