# Historial de asistencia por cliente

El Dueño puede consultar por email las reservas canónicas de su negocio desde Reservaciones. Muestra citas completadas, ausencias, cancelaciones y cancelaciones tardías, con cada fecha y estado. El email se envía en el cuerpo POST; no se incorpora al URL. La respuesta usa no-store y solo devuelve campos necesarios.

No crea otra tabla de clientes ni altera pagos. Los tests cubren páginas múltiples, aislamiento de negocio/cliente, acceso Employee denegado y CSRF. La consulta agrupa por email exacto normalizado; no supone que dos emails distintos sean una misma persona. El límite es 1000 citas del cliente, con rechazo explícito si se supera para evitar métricas parciales. Sigue leyendo el histórico paginado: no sustituye el índice pendiente de gran escala.

Validación: 784 tests aprobados y TypeScript. Build y Deploy Preview deben verificarse con el commit final. Continúan pendientes la indexación, la retención y paginación de lista de espera, conciliación de ATH/saldos y pruebas de dispositivos/proveedores reales.
