# Kiosk Skin Engine QA

2026-10-24. Implementation branch only; no merge or production deployment.

- `npm test`: 647/647 passing, including skin security and active-sale preservation.
- `npm run build`: passed; `WF_DESIGN_PREVIEW=1 npm run build`: passed.
- Classic Chromium at 390/1440, ES/EN, Light/Dark: passed existing commerce,
  accessibility, settings, receipt, retry, reset, recovery and long catalog checks.
- Expanded five-skin browser matrix: in progress; results will be recorded here.
- Physical printer/iPhone hardware and real provider transactions: not performed.

Standard Playwright browser download failed twice with corrupt/empty archives.
Local Chromium verification uses an isolated npm-delivered Chromium executable,
without adding a product dependency. WebKit verification remains assigned to CI.

Evidence is emitted into `/tmp/webfactory-kiosk/<skin>/` and
`/tmp/webfactory-kiosk-skins/`, and the GitHub Actions `kiosk-skins-*` artifacts.
