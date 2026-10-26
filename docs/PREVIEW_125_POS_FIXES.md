# Correcciones de POS y empleados — preview 125

- Profesionales: botón Eliminar con confirmación, guardado explícito y bloqueo para perfiles vinculados a cuentas. No elimina transacciones históricas ni cuentas de acceso.
- Teléfono: separación progresiva NANP en cajero y reservas del kiosco; campo telefónico añadido a pedidos del kiosco. Se conservan números internacionales.
- POS: QR predeterminado, etiqueta de pago QR y QR visible al crear checkout. Se conserva el registro de efectivo/ATH manual recibido y el botón que inicia el checkout existente.
- POS: cancelación de checkout Stripe pendiente con permisos del operador y sucursal; no borra un intento ni libera inventario ante timeout, pago completado o estado incierto.
- Kiosco: acción cancelar vinculada a la venta activa del dispositivo. Soporta pedidos presenciales pendientes y checkout Stripe de órdenes. No cancela citas confirmadas, saldos de citas ni pagos ATH en estado incierto: esos casos requieren revisión con el personal.

Verificación local: 782 tests aprobados antes de la comprobación final, TypeScript correcto. Proveedores simulados; sin pagos ni mensajes reales. La aceptación autenticada en dispositivos físicos y la validación sandbox de ATH siguen pendientes. Este cambio no completa los pendientes de indexación, historial de asistencia y retención del Booking Engine Pro documentados por separado.
