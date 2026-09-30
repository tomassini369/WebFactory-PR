# Business Control Center preview — September 30, 2026

Status: visual review only. Do not merge to main or deploy to production without Kevin's explicit approval.

The deployed frontend differs from GitHub main (349111270d6b7bfc7066294faa275b761f5f7e59). The preview recovers authored frontend sources from production source maps for index-CxWjDeiy.js and its referenced route chunks. Published client portal CSS is retained in client-admin.css and portal-production.css. PortalTraining.tsx is unchanged from the published source (SHA-256 8007e01c103a09a2dc3a304442dd988835ae3d4261efa5818f0e780d576b879e).

New design scope: Client Portal overview and responsive navigation. Existing editor panels, permissions, authentication, Training, and integration logic are retained. Homepage, Builder, Templates, and admin redesigns are outside this visual preview.

The center uses loaded commerce records, net paid amounts after recorded refunds, unique customer emails in those records, seven daily sales totals, upcoming bookings, and recent activity. Loaded history is explicitly labeled and must not be interpreted as full accounting history or a complete CRM total.

Preview only: preview/entry.tsx uses sample data and blocks external requests. preview.config.ts aliases Identity to a local stub for visual review. These are separate from the production Vite entry and configuration.

Validation: TypeScript and Vite production frontend build passed. Browser checks passed for EN/ES, Light/Dark, panel hide/show, expand/Escape, report navigation, mobile menu and no page overflow at 320px, and Training add-product/reset/exit with unchanged real sample sales. The self-contained comparison includes the old and redesigned portal, original reference video, and prior conceptual mockup.

Before any deployment: reconcile production backend and build scripts with GitHub, verify full authenticated integration flows, inspect final approved design, and ensure deployed functions and operational settings are preserved. No production deployment was performed in this task.
