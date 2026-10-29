# Personal portal profile — PR #125

Owner-approved scope: the authenticated user's private photo, name, personal
phone, saved language/theme, existing appearance editor, existing account
security and read-only membership. This builds on the Vaso rollback; it does not
restore liquid-glass dependencies or effects. Preview only.

## One place to edit personal settings

- **My profile / Mi perfil** appears in both portal menus. The existing overview
  circle opens it. All modules → My profile provides access on every screen.
  The duplicate header photo is removed at the owner’s request.
- **Personal details:** upload/replace/remove photo, name and personal phone.
  Sign-in email is read-only. This does not introduce an unverified email-change
  flow or change the authentication identity's metadata.
- **Preferences:** the existing dashboard editor is mounted here once. Customize
  remains a shortcut to this same view. Header language/theme and the profile
  selectors share the existing app state and save to the private user profile.
  Existing dashboard values/storage keys remain intact. Sound/haptics move here
  and remain explicitly device-local preferences.
- **Security:** reuse MfaSettings unchanged: password recovery, passkeys and
  Authenticator. Remove the separate business-menu entry and the admin Resources
  copy. Existing programmatic security destinations resolve to this same view,
  including the isolated Training security reference.
- **My access:** actual business/platform and role, plus assigned capabilities
  in readable language. These fields are read-only; no grants are added.

Business identity/logo, public contact, integrations, team administration,
subscription, business notifications, POS/kiosk editors and the existing
business/account lifecycle controls retain their existing locations and
permissions. No new notification-delivery, session-management or email-change
service is advertised as implemented.

## Private storage and image handling

`portal-profile` reuses current site-membership or platform-admin authorization
on every read, write and asset request. It derives the record key only from the
authenticated user's ID; request bodies cannot choose a user, email or role.
The profile follows that user across authorized businesses and portals, rather
than replacing shared business information. Its `profiles/` records are separate
from existing appearance `users/` records, inside the environment-separated
private store. Stable preview hostname retains data across preview releases.

Raster uploads: JPEG/PNG/WebP, 4 MB request limit, 40 MP decoding limit, no
animated images/SVG. Sharp rotates, checks/crops to at most 512 × 512 and reencodes
WebP without original metadata. Raw bytes are sent as an ArrayBuffer for reliable
browser transport. Only photo metadata is returned in JSON; the protected asset
has private/no-store headers. Photo removal preserves name/preferences. Account
deletion also removes this private profile record in the current environment.

Same-origin checks, application versions and storage CAS protect writes.
Conflicts and failed saves preserve drafts; reload is explicit. Pending operations
are serialized and results are ignored after provider unmount. Training makes
no profile network requests or live security changes.

## Verification

- 816 Node tests pass, including five focused authorization, user isolation,
  image optimization/deletion, bounded input and stale-write tests.
- TypeScript/full production build pass.
- Chromium: 28 width/theme/language combinations, both portals, plus final
  390/1440 regression after explicit binary transport. Photo upload, actual image
  decoding, circle replacement, reload, removal, own access and single existing
  preferences/security editor checked.
- Additional Chromium checks: employee's own profile, automatic language/theme
  persistence, header synchronization, stale-tab conflict and failed-save retry.
- WebKit: eight combinations at 390/1440, both portals, plus employee,
  quick preferences, reload, stale-tab and failed-save checks pass.
- Existing dashboard smoke: eight combinations at 390/1440, both portals,
  private wallpaper upload/deletion, stale-tab conflict and employee navigation.
- Deterministic design detector: 20 recommendations; no automatic redesign.

All operational API calls use isolated synthetic fixtures. No real tenant data,
account email, password, MFA, role, payment or OAuth configuration was changed.
Physical iPhone acceptance is not claimed. Hosted preview results are reported
in the PR after the deployment is ready.

## Owner photo framing revision

The owner requests removal of the duplicate oversized header photo. Keep the
overview avatar at 80 px desktop / 64 px mobile, with a fixed square box, clipped
circular frame and cover image. The profile editor retains its small 80 px photo.

A local framing preview appears only after choosing a photo or Adjust framing.
It supports dragging, horizontal/vertical sliders, zoom, reset, explicit Save
photo and Cancel. The circular preview and saved 512 px square use the same
source rectangle. The circular avatar masks that square; no transparency or
black corners are introduced into the source photo. The preview is not another
permanent dashboard avatar. No image is uploaded before Save photo. Failed
uploads keep the framing controls and the previous saved photo. Cancel releases
the local object URL without writing. Unsaved framing participates in the
existing leave-draft guard. Existing optimized photos can be framed further;
recovering discarded original image area requires uploading the original again.

No server photo schema, authorization, tenant permissions or other images are
changed. Browser regression checks inspect actual saved pixels from a synthetic
striped image, avatar dimensions/clipping, header removal, drag, cancel and
failed-upload retry, alongside the existing profile scenarios.

Correction validation: build/TypeScript, 816 Node tests, 28 Chromium profile
combinations and eight WebKit combinations; final regressions after cancellation
cleanup cover 390/1440 Chromium and 390 WebKit. Both portals, ES/EN, light/dark,
actual crop pixels, circular fixed-size frame, no header avatar, pointer drag,
cancel, reopening an existing photo and failed upload/retry pass. No real photo
was uploaded during QA; the fixture is a locally generated three-color raster.

## Summary card identity

The overview card displays the authenticated user's saved personal profile name
and the actual site-access role (localized), alongside their private photo. It
subscribes to the existing profile provider, so a successful name save is visible
on returning to the summary without an extra fetch. Business identity remains
in the page header. Business metrics/actions and employee/owner visibility are
unchanged; the label never grants authority. The profile smoke checks the saved
name and Owner/Dueño in the summary while retaining the business header.
