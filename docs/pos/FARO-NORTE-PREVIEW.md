# Faro Norte: reproducible preview business

Owner-requested fictional barber shop in Arecibo, Puerto Rico. This is test data
in the existing tenant model and existing deploy-scoped stores, not another POS.
The logo and four catalog illustrations were generated for this example; no
WebFactory brand asset was replaced. Prompts and optimized WebP files live in
`preview/fixtures/faro-norte/`.

## Lifecycle and access

`scripts/seed-preview-barber.mjs` runs after a successful build. It requires all
of `CONTEXT=deploy-preview`, source `HEAD=feat/kiosk-skin-engine` (falling back to BRANCH only when HEAD is absent), `REVIEW_ID=125`, and
the explicit build variable `WF_PREVIEW_TEST_BUSINESS=faro-norte-v1`.
`WF_PREVIEW_TEST_OWNER_EMAIL` names the already existing account requested by
the owner; it is not stored in the repository. The seed writes its canonical
membership and discovery index. It never creates an Identity user, changes
credentials, creates a primary/MFA session, or bypasses authenticated APIs.

Only `getDeployStore` is used: client-sites, client-assets, client-commerce.
Production, other PRs, branch deploys and local builds skip without opening a
store. Existing tenant and slug conflicts fail rather than replace another site.
Same-deploy reruns preserve the existing business, settings and financial records.

**Saved baseline, not shared mutable data:** every new eligible deploy receives
the same business/catalog/assets/kiosk baseline from the versioned recipe. Edits,
orders, reservations, sessions and Google/email connections from the preceding
deploy are not copied forward. Save intentional baseline changes in the recipe.
The old deployment retains its data subject to Netlify deployment retention.
There is no destructive reset endpoint and no public pairing token in the recipe.

## Business configuration

Public slug: `faro-norte-preview`; ID: `site-preview-faro-norte`.
Clearly marked PRUEBAS / TEST. No fabricated address, phone, reviews or customers.
The location is Arecibo with timezone `America/Puerto_Rico`. Mon–Fri 09:00–18:00,
Sat 09:00–16:00, Sunday closed. One fictional professional serves all reservable
services. No portal account is created for that professional.

| Service | Base price | Duration | 30% deposit | Base balance |
| --- | ---: | ---: | ---: | ---: |
| Classic haircut | $25.00 | 30 min | $7.50 | $17.50 |
| Haircut and beard | $35.00 | 45 min | $10.50 | $24.50 |
| Beard grooming | $15.00 | 15 min | $4.50 | $10.50 |
| Hot towel ritual | $45.00 | 60 min | $13.50 | $31.50 |

Each has a walk-in variant and an appointment variant because the existing
catalog contract separates `requiresAppointment` items from cart items. Both
variants reuse one corresponding illustration. Walk-ins use full-price online
checkout; reservations use the existing deposit calculation. Kiosk new booking
and existing-booking modes are both enabled, with QR checkout. Existing booking
lookup still requires code plus private PIN or its original private link. No
synthetic paid reservation is inserted: test a real sandbox deposit first to
exercise subsequent balance settlement.

Prices were chosen from publicly listed Arecibo-area ranges, checked October 24,
2026: https://booksy.com/en-us/s/barber-shop/107269_sabana-hoyos and
https://booksy.com/en-us/s/barber-shop/34787_arecibo. Durations and 30% are sample
configuration choices. This fixture deliberately has tax disabled and no tips
to make test arithmetic explicit; it is not tax guidance or a production setup.

The previously verified Connect merchant in the selected Stripe sandbox can be
provided using build-only `WF_PREVIEW_STRIPE_ACCOUNT`. This field is business
configuration, never a visual setting. No API key or webhook secret is included.
The existing runtime still refuses live Stripe writes outside production.
ATH is disabled in this sample. Receipts continue through the existing flow;
transactional email is not configured in preview. Customer email in the business
recipe is `.invalid`; enter only test customer details in actual sandbox QA.

Calendar is disconnected intentionally. Inspection of `availabilityForDate`
confirmed that internal schedule, capacity and hold rules work without Calendar;
when Calendar is connected the existing provider checks remain in force. No
OAuth scopes, redirects or tokens are added or changed.

## Glass appearance

Glass Premium, petroleum teal `#123D42`, copper `#BE8152`, original generated logo
as both business identity and registered kiosk background. `imageFit=contain`,
image blur 0, overlay opacity 0, glass blur 0, glass opacity 70 (existing minimum).
The complete logo is preserved without cropping; panel tint still affects the
background underneath. Existing readable controls and accessibility fallbacks
remain. No arbitrary CSS, HTML, JavaScript or external image endpoint is allowed.

## Validation

Six new tests in `netlify/lib/preview-barber.test.mjs` cover deployment gates,
canonical owner authorization and foreign rejection, assets/configuration,
walk-in and booking capabilities, deposit balances, rerun preservation, clean
new-deploy state, invalid configuration and conflicting records. They use only
in-memory stores and do not charge or send email. Full suite: 684 passing;
`npm run build` succeeds locally with seed disabled outside the selected preview.
Confirm actual Netlify seed output and existing public site/assets endpoints
after deployment. Browser login, mobile/desktop visual QA, actual sandbox charge,
signed webhook, appointment and receipt/reset remain separate acceptance steps;
never infer their success from these unit tests.
