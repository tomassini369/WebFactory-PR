# Preview 125 · Route-specific login loading

The supplied recording showed the generic commercial loading card before the Marketplace consumer login, followed by a different header and card. Commercial loading also used anonymous bars instead of the destination form's actual introduction.

The consumer route now loads a lightweight, noninteractive preview of its own Marketplace header, sign-in/sign-up card and field/link layout during both lazy-module loading and the existing MFA gate's session check. Consumer styling loads with that preview. Inputs that accept credentials remain absent until the existing session check completes. The MFA gate accepts an optional loading view; its authentication, authorization, session and security decisions remain unchanged.

Commercial loading retains the established card/viewport geometry for keyboard, MFA and recovery stability, but shows the actual role-specific heading and field layout. Business and platform-admin introductions come from the same static copy module used by their final forms. Anonymous loading bars and the delayed paragraph fade have been removed. Logo artwork, colors, form handlers, password visibility, remember-email and recovery behavior remain intact.

Validation:

- 811 Node tests and the complete TypeScript/build command pass.
- New cold consumer regression: 320/375/390/430/768/1024/1440, ES/EN, Light/Dark, sign-in/sign-up, ordinary motion. JavaScript delivery and the session endpoint are held independently. Header/card bounds stay within 2 px through chunk -> session -> ready; no commercial loading card appears; no credentials are submitted. Visual comparison confirms matching consumer geometry.
- Existing commercial lifecycle regression: both portals at all seven widths and both themes, including saved locale, locale switching without remounts/extra auth calls, reload and unavailable preference storage. Loading bounds are captured atomically to avoid racing an already completed session response.
- Existing stability regression: 320/390/430, Light/Dark; loading/login/MFA/logout geometry, toolbar and keyboard resizing, field preservation, return navigation and the approved landing media. All login/MFA requests use isolated fixtures, with no real credentials or operational writes.
- Consumer regression added to the existing Chromium/WebKit CI step. The stability smoke can also use the built bundle. Local WebKit and physical iPhone acceptance are not claimed. Impeccable retains 21 recommendations.

Scope: existing PR 125 only; no production merge or production settings changes.
