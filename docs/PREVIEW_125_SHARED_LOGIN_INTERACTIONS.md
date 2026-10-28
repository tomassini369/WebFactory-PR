# Shared login interactions

Owner request: remove the animated underline on field focus, retain the blue
submit action while checking credentials, and use the same interactions on
all platform logins. The three canonical credential forms are /client-admin,
/webfactory-admin and /cuenta; Builder/Templates link into the business login.

All three forms now use wf-login-form and the eager login-interactions.css.
They share hover shine/elevation, press feedback, focus illumination without an
underline, and blue/white busy feedback. Consumer access reuses the existing
three-bar PortalLoginProgress component, with aria-busy, disabled double-submit
protection and live status. Normal unavailable signup actions remain disabled;
this does not change signup policy or authentication. Mobile hover is gated to
hover-capable devices. Reduced-motion keeps status text and static bars; forced
colors preserves system controls. Password visibility/autofill and card geometry
remain unchanged. Existing underline/shine markup in the portal forms is removed.

The new shared smoke holds intercepted login requests, checks blue busy state,
three bars/reduced motion, visible field focus/no underline, failed credentials
401 and unavailable server 503, no automatic password retry, and enabled retry
without private-account rendering. It covers the three forms, ES/EN, Light/Dark
and the existing mobile/desktop widths. Existing commercial lifecycle, MFA,
keyboard/viewport, loading and consumer signup/profile/favorites/logout smokes
provide surrounding regression coverage. Requests use isolated fixtures only.

This change is for draft PR #125 / Netlify preview, with no production publish.
Browser-engine verification does not claim a physical iPhone test or delivery
of actual recovery email/passkey prompts.
