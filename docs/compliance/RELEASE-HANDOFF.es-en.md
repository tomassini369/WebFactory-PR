# Preparación de publicación — bloqueada / Release handoff — blocked

**No ejecutar ahora / Do not execute now.** El propietario excluyó publicación. Este documento prepara un cambio futuro y no modifica configuración de producción. / The owner excluded publication. This prepares a future change and does not alter production configuration.

## Paquete preparado / Prepared package

- PR #125: `feat/kiosk-skin-engine`, integra Marketplace, POS y cumplimiento / integrates Marketplace, POS and compliance.
- URLs conservadas / preserved: `/privacy`, `/terms`, `/refund-policy`; `/copyright` preparado / prepared.
- Identidad confirmada / confirmed identity: Kevin Tomassini Santiago, operador individual / individual operator. Mercado inicial / initial market: Puerto Rico.
- Agente registrado / registered agent: DMCA-1084143, activo comprobado / verified active. Datos autorizados en `WF_DMCA_PUBLIC_CONTACT_JSON`, contexto `deploy-preview`, scope `functions`; no incluir el valor en Git, PR, logs o reportes / keep the value out of Git, PR, logs and reports.
- Procedimientos / procedures: [operaciones](OPERATIONS-RUNBOOK.es-en.md), [retención](DATA-RETENTION.es-en.md), [estado de decisiones](OWNER-RELEASE-CHECKLIST.es-en.md).

## Pasos solo tras autorización futura / Steps only after future authorization

1. ES: Obtener revisión jurídica final y registrar versión aprobada, alcance y decisiones de retención. Confirmar recepción y monitoreo de los contactos existentes sin enviar correos a clientes.
   EN: Obtain final legal review and record approved version, scope and retention decisions. Confirm existing contact receipt/monitoring without emailing customers.
2. ES: Consultar de nuevo main, PR y Netlify; revisar exactamente qué cambios se publicarán. No dar por aprobado todo un PR por una autorización ambigua.
   EN: Refresh main, PR and Netlify; review the exact release contents. Do not infer full-PR approval from ambiguous authorization.
3. ES: En una acción expresamente autorizada de publicación, preparar `WF_DMCA_PUBLIC_CONTACT_JSON` en contexto production y scope functions, usando los datos reales del Preview y el directorio oficial. Validar campos permitidos: status, registration, name, organization, address, phone, email. No copiar tokens, llaves, datos de pagos ni cambiar otras variables. El endpoint es deliberadamente público: solo datos autorizados para publicación.
   EN: During an expressly authorized release action, prepare the variable in production context/functions scope using verified preview/directory contact data. Validate only the listed public fields; copy no tokens, keys or payment data and change no other variables. The endpoint intentionally publishes only authorized public contact data.
4. ES: Aplicar fecha efectiva real al contenido aprobado y retirar únicamente los avisos de borrador que corresponda; no antedatar ni cambiar rutas registradas en Google. No cambiar scopes, credenciales, dominios, consent screen, redirect URIs ni Limited Use.
   EN: Apply the actual effective date to approved wording and remove only appropriate draft notices; do not backdate or change Google-registered routes. Preserve scopes, credentials, domains, consent screen, redirect URIs and Limited Use.
5. ES: Publicar solo el commit autorizado. Comprobar coincidencia de SHA y estado Ready, rutas legales ES/EN, contacto público y ausencia de datos de casos privados. Si falla, usar el despliegue anterior autorizado; la reversión del deploy no revierte variables automáticamente. No cobrar, reembolsar o cancelar operaciones reales como prueba.
   EN: Release only the authorized commit. Check SHA, Ready status, ES/EN legal routes, public contact and absence of private case data. On failure use the previous authorized deploy; deploy rollback does not automatically revert variables. Do not test through real charges, refunds or cancellations.

## Evidencia mínima / Minimal evidence

ES: Registrar revisión/decisión externa, commit, deploy, fechas reales y resultados sin copiar información residencial o de consumidores. Ningún punto de esta guía cambia el estado a “cumplimiento legal absoluto”.

EN: Record external review/decisions, commit, deploy, actual dates and results without copying residential or consumer data. Nothing in this guide establishes absolute legal compliance.
