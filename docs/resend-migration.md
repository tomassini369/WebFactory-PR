# Resend migration

Resend is the production provider for central transactional mail. Gmail remains available in other contexts and for explicit rollback. Provider selection is explicit; adding a key alone does not override configured Gmail. Automatic send retries or SMTP failover are not enabled.

## Setup

1. Connect a Resend account and start on Free unless a paid plan is explicitly approved.
2. Add and verify `webfactorypr.com` in Resend using exactly the DNS records supplied for that account. Keep ImprovMX's root MX records so corporate mail continues forwarding to Gmail. Do not replace root MX for Resend inbound mail. Check for conflicting records before adding DKIM or a sending return-path subdomain.
3. Save `RESEND_API_KEY` as a secret in Netlify, scope Functions, context Production. It must have permission to send for the verified domain. Do not put it in source control, browser code or chat. Complete entry through the user's credential handoff.
4. Deploy with the new environment while keeping `WEBFACTORY_EMAIL_PROVIDER=gmail`. In Admin → Resources select **Verify Resend**. SMTP authentication alone does not certify domain verification or actual delivery.
5. After verification, explicitly select `WEBFACTORY_EMAIL_PROVIDER=resend`, deploy and use **Send test email** to the authorized administrator. Confirm actual reception and sender; monitor Resend events and logs. Revert to `gmail` if validation fails. Do not retry ambiguous sends automatically, to avoid duplicate messages.
6. Preserve `WEBFACTORY_EMAIL_FROM_TEAM`, `..._SUPPORT`, `..._BILLING`, `..._INFO` with verified corporate addresses. Existing branded HTML/text, Reply-To, headers and ICS attachments are reused through Nodemailer.
7. Validate booking, invitation, reminder, order and receipt workflows. Netlify Identity's own SMTP and Stripe-managed emails need independent configuration; this central transport does not override them.
8. Maintain valid SPF, DKIM and DMARC for Resend and ImprovMX. Retired provider credentials and diagnostics are not required.

## Transport

Official settings: `smtp.resend.com`, port `465` with implicit TLS, username `resend`, password `RESEND_API_KEY`. Host and port are fixed in code to prevent accidental use of another SMTP destination.

References: https://resend.com/docs/send-with-smtp and https://resend.com/docs/dashboard/domains/introduction

## Status

Resend domain and SMTP verified; production activated on 2026-10-03. Administrator test received in Gmail INBOX with SPF/DKIM/DMARC passing. Individual booking, receipt, invitation and reminder workflows and Outlook/Apple Mail rendering still require acceptance. Legacy provider transport and diagnostics retired by owner request.
