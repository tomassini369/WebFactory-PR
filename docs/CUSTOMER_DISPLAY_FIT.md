# Customer Display: ajuste a pantalla

La distribución horizontal desde 1024 × 600 usa la altura visible del navegador. Encabezado y contacto compactos, resumen y QR en paralelo; solo la lista de artículos se desplaza cuando crece. La lista permite foco y desplazamiento por teclado. No se ocultan totales ni se aplica zoom a toda la interfaz.

Los tamaños inferiores conservan desplazamiento natural para mantener legibilidad, incluidos dispositivos móviles y ventanas reducidas por zoom. Impresión y colores existentes se conservan. El texto compacto del QR se activa únicamente en Customer Display; el kiosco conserva sus instrucciones completas.

Validación reproducible: `node scripts/browser-customer-display-fit.mjs` (Playwright). Matriz de 1024×600, 1280×720, 1366×650, 1440×900 y 1920×1080; ES/EN, Light/Dark y 1/30 artículos. Comprueba ausencia de scroll documental y posición completa del total y QR por encima del footer. Datos y checkout ficticios; ningún cobro. La lectura del QR con una cámara física queda como aceptación manual.
