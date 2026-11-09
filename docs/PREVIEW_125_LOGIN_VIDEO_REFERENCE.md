# Commercial login video reference correction

The owner clarified the approved appearance using the October 28 14:26 video.
The inset password capsule is intentional, so the previous single-surface
change is reverted while the stable loading/ready layout remains in place.
No logo, canvas, auth, autofill, payment or tenant behavior is changed.

The video's animated button is the existing three-bar pending-auth indicator,
not the hover shine. It was already present in both commercial login forms.
The detailed browser smoke now submits to an intercepted, held fixture request,
checks all three bars and their advancing animation time, the busy/live status,
and the reduced-motion static alternative. No real login requests are sent.

Validation: npm test, build, scoped Impeccable audit, and detailed commercial
login matrix in Chromium and WebKit. Browser emulation is not a physical iPhone
verification. Deployment stays on draft PR #125 / preview only.
