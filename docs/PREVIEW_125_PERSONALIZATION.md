# PR #125 — Centro único de Personalización (30 octubre 2026)

## Alcance

La navegación del portal de negocios tiene una sola entrada visual **Personalización / Personalization**, visible tanto en el menú como en el dock. Su editor centralizado reutiliza servicios y componentes existentes, sin crear una segunda base de datos ni reemplazar los contratos de apariencia.

- **Portal y POS:** preferencias personales (idioma, tema, sonido/háptico) y apariencia del dashboard, incluyendo relieve de tarjetas y botones usado por el cajero. Se mantiene el almacenamiento privado por usuario del endpoint `dashboard-appearance`.
- **Kiosco:** editor existente con sus presets originales y 17 paletas premium adicionales. El aspecto se almacena por negocio y solo se muestra a quien tenga el rol y los permisos requeridos para editar ajustes.
- **Página web:** acceso centralizado al Builder existente, con sus verificaciones de suscripción y autorización. El Builder sigue siendo el editor de páginas públicas; no se sustituye por una maqueta.

Se retiraron entradas *duplicadas* para la apariencia desde el perfil de negocio, desde la configuración **operativa** del kiosco y desde el cajero. Las configuraciones operativas de POS y kiosco se conservan en sus secciones anteriores. El portal administrativo de la plataforma mantiene sus preferencias personales existentes.

El kiosco conserva los seis presets/paletas básicos. Las 17 paletas nuevas son opciones **adicionales** y no migran ni sobrescriben apariencias guardadas. Seleccionar una paleta edita el borrador; solo **Guardar apariencia** activa esos colores. Seleccionar una paleta premium cambia el modo a degradado y desactiva el fondo decorativo del borrador para poder comprobar sus colores. Los recursos de imagen subidos se gestionan por su propio ciclo de vida y pueden almacenarse antes de activar una apariencia.

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
