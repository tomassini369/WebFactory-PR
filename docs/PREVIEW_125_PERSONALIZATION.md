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
