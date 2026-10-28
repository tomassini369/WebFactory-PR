# Preview 125 · Login controls and password surface

The second recording exposed internal reflow that the earlier outer-card checks did not cover: Home/locale/theme controls and fields moved when the lazy portal stylesheet arrived. The password input also received the legacy input inset shadow inside its already bordered wrapper, producing a second pill.

The eager authentication stylesheet now defines the toolbar's flex layout, control metrics, form/preview spacing, labels, inputs, remember row, submit and recovery layout. The disabled loading preview uses the same field and password-wrapper structure. It accepts no credentials. Shared 821–999 px shell padding also fixes the additional vertical shift found in WebKit at 980 px. The nested password input has no native appearance, border, inset shadow or independent background; the wrapper owns the surface and visible focus ring.

Authentication handlers, session/MFA decisions, remembered email, password visibility, the artwork and tenant data contracts are preserved. The changes remain in PR 125.

Validation:

- 811 Node tests and full TypeScript/build passed.
- New browser regression measures card, toolbar, individual locale/theme/Home controls, logo, heading, email, password wrapper, remember, submit and recovery rectangles across independently delayed session and lazy-module phases. Tolerance is below 2 px. It also focuses the password, verifies one surface, toggles visibility and preserves a disposable fixture value without submitting login.
- Chromium: 320/375/390/430/768/980/1024/1440, both portals, ES/EN and Light/Dark (64 cases across the full matrix and the targeted 980 px regression).
- Local WebKit 26.5: 390/980/1440, both portals, ES/EN and Light/Dark (24 cases); narrow contexts enable mobile/touch emulation. The 980 px case initially reproduced an 8 px shift and now passes.
- Existing commercial lifecycle: 28 cases; keyboard/toolbar/MFA/logout stability: six cases. All passed with isolated transport fixtures. No real credentials, authentication attempt or business write was performed.
- Mobile loading/ready screenshots reviewed, including WebKit. The deterministic detector retains its existing recommendations. Physical iPhone acceptance is not claimed.
- The detailed regression is part of the existing Chromium/WebKit CI step, including 980 px.
