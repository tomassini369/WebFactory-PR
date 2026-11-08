# Neutral Liquid Glass — PR #125

## Scope and behavior

The existing Liquid Glass reading panels were transparent over detailed photos.
Theme-dependent ink alone could not provide stable contrast. The replacement
uses local smoke-white/graphite surfaces in Light and charcoal/soft-white in
Dark. The photo outside panels, original logo, business palette, operational
components and Classic glass remain intact. No package, backend schema,
authorization, payment or booking changes are included.

`NeutralReadingLayer` paints a real decorative, aria-hidden, pointer-inert span
above the optical layer and below content. A pseudo-element version was rejected
because WebKit retained stale paint when opacity/theme/system colors changed.
The span receives an explicit fill on each update and reacts to system media.

The single existing Liquid opacity control starts at 82%; Classic keeps its
previous range. Old saved values below that floor render safely and are not
rewritten by rendering. Explicit kiosk header/cart/product colors retain their
hue and matching existing ink; their fill may increase to protect contrast over
both backdrop extremes. The existing blur control now reaches the actual
renderer (portal/POS 0–40, kiosk 0–24), rather than leaving optical blur fixed at
2. Only the existing two kiosk lenses are rendered; other kiosk reading zones
receive lightweight reading layers. Switching views preserves the host and cart.

## Validation method

Unit coverage adds opacity bounds, invalid values, neutral ink over all 256 gray
backdrops and custom business hues over black/white extremes. The suite has 853
passing tests; the production build passes.

The browser contrast regression uses the real appearance handler with isolated
in-memory records, encoded photo uploads and real rendered screenshots. It
hides text with inline styles, samples every background pixel within visible
text rectangles, restores the original styles, and computes WCAG contrast using
the actual ink and effective opacity. Inline masking is necessary because POS
uses high-specificity important text rules. An early ratio of 1 was a mask
failure; fixing the mask resolved it without changing operational POS code.

Cases cover Light/Dark, the room photo, pure-black/pure-white uploaded images,
and saved opacity .2/.96. The lower legacy value is protected without rewriting
the record. Profile, calendar and activity text are sampled; desktop also samples
POS heading, empty catalog and order text with a selected business palette.
A negative control removes the calendar reading fill over white in Dark and
must fail contrast, proving the regression detects the original defect.

Kiosk checks exercise the actual opacity/blur controls, neutral and explicit
custom zone colors, header/cart pixels, catalogue CSS blur and renderer props.
Forced-colors and print behavior are checked with system media emulation.
Full layout/interaction matrices and final deployment evidence are recorded in
the PR after completion. All browser records are fixtures; no real tenant or
commerce mutation is performed. WebKit and viewport emulation do not constitute
a physical iPhone test. These sampled checks are not a claim that every text,
button or possible custom configuration across the platform meets WCAG.

## Design audit

Anti-Slop After/audit-existing-work: preserve existing structure and real copy;
no decorative components, duplicate controls, fonts or dependencies were added.
Impeccable 4.1.0 exits 2 with 20 existing recommendations (18 warnings and two
advisories); none references the new neutral layer or FluidGlassSurface files.
Its existing global font/layout suggestions are outside this approved revision.
