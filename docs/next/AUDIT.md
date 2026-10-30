# WebFactory PR Next: initial source audit

Source: feat/kiosk-skin-engine at 234dd9361f413277b438e754b479e7e5681b036d.
PR125 open/draft, unmerged. Main reference from PR metadata: 79d82cf286efcac1fa69dbb567054a4215542ffb.
Production published deploy: 6adb4386324a7b400c696775. Experimental site: 76c0eacd-27e4-41b9-99ac-5bd5dbe82879.

React 19.3, React DOM19.3, Vite8.3, TS5.9, Tailwind4.3; local CSS modules by surface, Radix/shadcn + Lucide. Existing Framer Motion is retained for existing consumers. New motion will use Anime.js4 only in the experimental shell.
App.tsx manually routes lazy components; ThemeProvider, portal-language, workspace-services and PracticeContext are reusable boundaries. Netlify has 120 function source/test files; functions use server-side Identity/membership authorization, blobs and integration SDKs. Different hostnames alone do not prove isolation.

| Module | Source implementation | Experiment verification target | Initial status |
|---|---|---|---|
| Marketplace | MarketplacePage, marketplace-api, consumer/social/ads endpoints | public discovery with synthetic fixture listings, no real directory | Source present; behavior not yet verified |
| Builder/templates | WebFactoryBuilder, TemplateLayout, TemplatePreview | reuse practice-aware editor + existing renderers | Source present; behavior not yet verified |
| Client portal | ClientAdminPage, ClientAdminV3Panels, glassy-dashboard | reuse existing panels under PracticeContext | Source present; behavior not yet verified |
| Admin portal | WebFactoryAdminPage | preserve source; prohibit real admin API | Source present; experimental admin integration pending |
| Booking | BookingCalendar, policies, waitlist, series, availability/holds backend | reuse practice calendar; real concurrency requires isolated server | Partial simulation; no claim of production-grade booking |
| Catalog/team | catalog editor, ProfessionalEditor, commercial-access | save only example records | Source present; behavior not yet verified |
| POS/kiosk/display | PosWorkspace, Kiosk, CustomerDisplay, pos-domain, kiosk skins | existing finite practice transport | Cash fixture supported; QR/provider simulation partial |
| Skin engine | kiosk-skins, appearance backends | shared Next tokens, do not replace tenant business logic | Source present; extension planned |
| Training | TrainingSession, curriculum, practice-runtime | finite local transport, blocked external actions | Existing implementation, limited action coverage |
| Auth/profile | portal-auth/session, MFA/passkeys, private profile API | no live sessions; explicit practice identities | Real auth intentionally disconnected |
| Billing | Stripe subscription/checkout/connect | preserve7d/$30/$350, simulated reference only | Provider connection intentionally disabled |
| Integrations | Gmail/Calendar/WhatsApp, Stripe, ATH | block all external writes/credentials | No provider verification claimed |
| Privacy/legal | legal pages, consent/privacy/delete handlers | retain sources, do not accept real consumers | Source present; no legal certification |
| Preferences | per-user revision/CAS appearance, language/theme | local experimental preferences with conflict detection | Server preference store not connected |

Installed design guidance: shadcn button/input/card/dialog, UIUX Pro Max MIT, Impeccable Apache2, MagicUI free MIT, ReactBits CommonsClause (not imported to avoid template redistribution uncertainty). ECC, Stitch,21st MCP tools are not all advertised; configured provider does not prove provider read. wf_graph_context retry failed; use source audit. No paid21st generation.

Design read: operational Puerto Rico SaaS, Ocean Blue cinematic interface, ENERGY2/RHYTHM2/MOTION2. Owner's explicit experimental brief supersedes original prohibitions on new fonts/Anime/glass/redesign, only on this branch. Anti-slop After/audit mode retained. Motif: quiet ocean surfaces, generous heading typography, slim illuminated active edge; glass is reserved for studio/dock. Native forms remain solid for legibility. All sample records visibly labelled.
