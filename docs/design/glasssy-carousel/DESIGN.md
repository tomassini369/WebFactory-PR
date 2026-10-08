# Design System: WebFactory Glasssy Highlights

## 1. Visual Theme & Atmosphere
Adapt the user-provided Glasssy Carousel V2 to existing business highlights: smoked glass, a full-size central image card, and two smaller cards receding in a 3D arc. Preserve the original business content, template brand, catalogue and booking contracts. Scope the change to highlights; never import the demo movie app, its global background, profile, sounds or navigation.

## 2. Color Palette & Roles
- Smoked charcoal (#20242E to #0E1016): glass card surface, legible in both platform themes.
- White ink (#FFFFFF): titles and prices.
- Soft silver (#E0E4EB): descriptions and badges.
- Frosted white (#FFFFFF at 88%): control dock; charcoal ink (#12202B).
- Existing business accent: retain the configured template accent for focus controls; do not change tenant colors.

## 3. Typography Rules
Use the existing business sans-serif stack, with 1.1–1.45rem titles and at least 14px description text. Show original item names, descriptions, badges and prices. Long descriptions scroll within the active card; no invented movie/location metadata.

## 4. Component Stylings
32px glass card corners, thin reflected rim, 24px frosted backdrop, faded image blending into the copy. Preserve three informational highlights and all catalog actions in their existing panel. Controls have 44px minimum targets and visible focus. The dock shows current count and item name.

## 5. Layout Principles
Contained perspective stage, never viewport-wide/fullscreen. Desktop cards: 385×525px maximum. Mobile cards: at most 82% of their container and 300×440px. Side cards intentionally overlap in perspective as expressly requested by the supplied reference; text remains inside each card. Clip the stage without producing horizontal page overflow. Retain template, Builder and live storefront parity through their shared renderer.

## 6. Motion & Interaction
520ms transform/opacity easing; no layout-dimension animations, new animation library, autoplay, sound or scrolling lock. Previous/next, side-card selection, horizontal swipe and keyboard arrows/Home/End. Native vertical scrolling and pinch zoom remain enabled. Respect reduced motion with immediate transitions. Announce count and item changes politely.

## 7. Anti-Patterns
No fullscreen demo wrapper, movie assets, extra navigation, provider calls, fabricated metrics, paid generation, global style changes, duplicate commerce controls or new authentication requirements. No background animations when idle; preserve existing user-approved layouts outside highlights.
