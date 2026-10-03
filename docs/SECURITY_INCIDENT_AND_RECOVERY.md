# Seguridad, incidentes y recuperación asistida

Actualizado: 2026-10-02, Puerto Rico. Complementa el registro maestro; no certifica cumplimiento legal ni reemplaza una auditoría independiente.

## Recuperación de Authenticator

Control Center → Recursos → Restablecer Authenticator. Antes, intentar un factor alterno o código de recuperación propio. El reset de soporte solo sirve para miembros existentes de un negocio y no permite resetear cuentas administrativas. Conserva passkeys; elimina TOTP y códigos de recuperación, rota el epoch de sesión y fuerza MFA aun si cambia la política global. Todo proof de WebFactory anterior queda inválido; no se promete revocación global de JWT del proveedor ni sesiones de Google/Stripe.

1. Registrar solicitud expresa del titular en un caso privado. No restablecer por un email entrante aislado, nombre del negocio o conocimiento de datos públicos.
2. Contactar por un canal previamente registrado y verificar separadamente autoridad sobre el negocio, utilizando registros ya conocidos. No confiar en un teléfono nuevo incluido en la solicitud. Para casos dudosos, cuentas sensibles o contradicciones, detener recuperación y escalar; la plataforma no automatiza ni garantiza la verificación humana.
3. Conservar en el caso constancia de solicitud y método/resultado de verificación. No copiar documentos de identidad, números de Seguro Social, códigos MFA, contraseñas ni credenciales bancarias en el formulario.
4. El administrador debe demostrar su propio MFA dentro de cinco minutos. Introducir negocio, miembro, referencia, motivo y confirmación literal. La autorización y membresía se validan en servidor; el formulario no concede permisos.
5. El registro privado se persiste antes de mutar. Tras el reset, el cliente debe entrar nuevamente con contraseña. Si conserva una passkey puede verificarla; si no quedan factores debe configurar uno nuevo antes de usar rutas privadas. Los códigos de recuperación nuevos se muestran al titular durante alta, nunca al administrador.
6. Se intenta notificación únicamente al email de la identidad registrada. SMTP aceptado no significa llegada a inbox. Una respuesta incierta no se reenvía automáticamente. Revisar el registro y proveedor antes de considerar una notificación manual autorizada.
7. Ante timeout, conservar el mismo ID de solicitud y consultar el registro de recuperación. No crear solicitudes nuevas ni repetir resets indiscriminadamente. `prepared` exige revisión: puede haber fallo antes de mutar; `reset` con `sending`/`review_required` exige conciliación de la notificación. Auditoría y reset no son una transacción distribuida; los fallos parciales quedan visibles.

La herramienta solo restablece Authenticator de WebFactory. No modifica su aplicación Authenticator, contraseñas ni factores de otros proveedores. No utilizarla como acceso de emergencia a la cuenta del propietario de WebFactory; esta requiere un procedimiento independiente, sin bypass público.

## Respuesta a incidentes

1. Abrir caso con hora PR y UTC, sistemas afectados, señales y responsable; distinguir sospecha de incidente confirmado. No incluir secretos en tickets o capturas compartidas.
2. Preservar logs/referencias de Netlify, Identity, SMTP, Stripe y Calendar. No destruir evidencia mediante borrados o rotaciones improvisadas.
3. Acotar cuentas y negocios afectados. Revocar sesiones/proofs correspondientes y aislar la integración comprometida con autorización operacional; no desconectar todos los negocios por defecto. Si hay claves comprometidas, preparar rotación/migración compatible, especialmente el cifrado MFA.
4. Investigar acceso y datos afectados, duración, cifrado y exposición real; evaluar obligaciones jurídicas con asesoría. No asumir que todo error de login es una brecha o que todo incidente tiene igual obligación de notificación.
5. Aplicar corrección en preview, probar autorización/aislamiento y desplegar una versión compatible. Restaurar solamente en entorno aislado antes de afectar datos productivos.
6. Para notificaciones externas, documentar destinatarios, contenido y autorización. No enviar automáticamente avisos de brecha desde un contador o prueba fallida.
7. Registrar causa, acciones, evidencia de recuperación y seguimiento. Comprobar entrega real de alertas, RPO/RTO y capacidad; no cerrar por un build exitoso.

## Revisión legal pendiente

Confirmar identidad legal y contacto del operador, contratos con negocios/proveedores, inventario de datos y plazos de retención por categoría, incluidos logs/snapshots/casos de soporte; proceso de eliminación, solicitudes y obligaciones ante incidentes. No inventar plazos, domicilio, inscripción comercial ni cumplimiento HIPAA/GDPR.

La Ley 111-2005 de Puerto Rico define información personal y supuestos de notificación. Evaluar su aplicación según datos y circunstancias, incluyendo notificación a DACO cuando corresponda; el texto compilado incluye un plazo de diez días para ese aviso. No tratarlo como plazo universal de comunicación a clientes ni esperar a ese plazo para contener un incidente.

Fuentes: https://bvirtualogp.pr.gov/ogp/Bvirtual/leyesreferencia/PDF/111-2005.pdf ; https://www.ftc.gov/business-guidance/resources/start-security-guide-business ; https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html

## Alcance de verificación técnica

Pruebas automatizadas: MFA real WebAuthn/TOTP y anti-replay, reset y epochs en sesiones concurrentes, solicitud/idempotencia, notificación incierta, fallo de auditoría, membresía, CSRF y límites de payload. Script `node scripts/audit-security-boundaries.mjs https://deploy-preview-N--webfactorypr.netlify.app` comprueba denegación sin credenciales y origen ajeno sin operar cuentas reales.

Pendientes: configuración directa y throttling de Identity, aceptación real de recuperación con cuentas desechables, prueba independiente de penetración, alertas de proveedor con entrega real, restauración completa e iPhone. Auditoría de dependencias no cubre vulnerabilidades del código, configuración, secretos ni lógica de negocio.
