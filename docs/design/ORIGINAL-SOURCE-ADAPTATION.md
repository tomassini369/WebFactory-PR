# Original source adaptation — 2026-10-09

Owner-supplied source is preserved unmodified in `original-sources/`. It is reference material, not imported into the application or published as a working demo. Migration scripts require an explicit extracted reference directory and leave the archive untouched.

| Reference | Restored implementation | Necessary integration adaptations |
| --- | --- | --- |
| Glasssy Carousel V2 | Original GlassCard, GlassCarousel and BottomControlDock components, Framer Motion springs, 3D arc, image fade, reflections, animated text, drag, expand/options, dock, play/pause and bookmarks | Real product/service fields; three highlights; contained responsive stage; native accessible modal; local bookmarks; opt-in rotation; reactive reduced motion; platform/business colors; no movie/profile/audio demo |
| Glassy login forms | Masked reflection border, focus underline/glow, glass depth, original shine and press/hover feedback | Existing native email/password, password visibility, autofill, recovery, MFA and passkeys retained; no fake success alerts or demo authentication |
| Glassy dashboard | Original reflective corners, curved SVG console detail, specular edge, glass depth and navigation/button feedback | Existing operational panels/data/authentication retained; no fabricated messages, users, workflows or provider connections; decorative curve contained inside real sidebar; platform palette |
| Fly-to-cart | Original motion image, 700ms path with lifted Y midpoint, image shrink/fade, source opacity and cart spring (400 stiffness/10 damping) | Cart mutations stay synchronous; repeated additions never lost; iframe ownerDocument; unmount cleanup; reduced motion; no provider calls |

Color accents use `--pg-accent` for platform controls and `--template-accent`/`--template-dark` for business surfaces. Original demo gold/pink/violet colors are not retained as active brand accents. Approved platform backgrounds and primary blue buttons are preserved. This is a source-derived integration, not a byte-identical replacement of production by four standalone demonstration applications.

Only PR97's draft preview branch is authorized. No merge or production publish. Browser tests use isolated fixtures for authenticated/payment/email flows and do not send real payments or emails. Physical-device password-manager/Face ID and physical printing remain acceptance checks.
