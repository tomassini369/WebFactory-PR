# Resend migration

Resend is the production provider only for WebFactory-owned transactional mail. Tenant operational mail is isolated from this quota and is sent through each business's connected Gmail or Google Workspace account. Gmail remains available as an explicit rollback for the central WebFactory transport; there is no automatic cross-provider failover.

## Setup

1. Connect a Resend account and start on Free unless a paid plan is explicitly approved.
2. Add and verify `webfactorypr.com` in Resend using exactly the DNS records supplied for that account. Keep ImprovMX's root MX records so corporate mail continues forwarding to Gmail. Do not replace root MX for Resend inbound mail. Check for conflicting records before adding DKIM or a sending return-path subdomain.
3. Save `RESEND_API_KEY` as a secret in Netlify, scope Functions, context Production. It must have permission to send for the verified domain. Do not put it in source control, browser code or chat. Complete entry through the user's credential handoff.
4. Deploy with the new environment while keeping `WEBFACTORY_EMAIL_PROVIDER=gmail`. In Admin → Resources select **Verify Resend**. SMTP authentication alone does not certify domain verification or actual delivery.
5. After verification, explicitly select `WEBFACTORY_EMAIL_PROVIDER=resend`, deploy and use **Send test email** to the authorized administrator. Confirm actual reception and sender; monitor Resend events and logs. Revert to `gmail` if validation fails. Do not retry ambiguous sends automatically, to avoid duplicate messages.
6. Preserve `WEBFACTORY_EMAIL_FROM_TEAM`, `..._SUPPORT`, `..._BILLING`, `..._INFO` with verified corporate addresses. Existing branded HTML/text, Reply-To, headers and ICS attachments are reused through Nodemailer.
7. Validate WebFactory-owned invitation, security, billing and administrative workflows on the central transport. Booking, reminder, order/receipt, contact-form and review-request delivery must be validated separately through a tenant's connected business email. Netlify Identity's own SMTP and Stripe-managed emails remain independent.
8. Maintain valid SPF, DKIM and DMARC for Resend and ImprovMX. Retired provider credentials and diagnostics are not required.

## Transport

Official settings: `smtp.resend.com`, port `465` with implicit TLS, username `resend`, password `RESEND_API_KEY`. Host and port are fixed in code to prevent accidental use of another SMTP destination.

References: https://resend.com/docs/send-with-smtp and https://resend.com/docs/dashboard/domains/introduction

## Status

Resend domain and SMTP verified; production activated on 2026-10-03 for WebFactory-owned mail. Tenant operational email has since been separated so customer-facing business traffic does not consume the WebFactory Resend quota. Businesses connect Gmail or Google Workspace through OAuth; no tenant message silently falls back to Resend. Legacy provider transport and diagnostics remain retired by owner request.
