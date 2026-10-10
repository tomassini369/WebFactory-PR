# Workforce attendance: stages 2–3 increment

This extends the existing WebFactory platform and POS 2.0 on main after PR #102. PR #101 is independent and excluded. Customer Display, Self-Service Kiosk, business-specific modifiers, scheduling/lateness and individual POS module switches are subsequent increments; no inactive buttons or simulated payment features ship here.

## Architecture and security

The existing `webfactory-client-commerce` Netlify Blobs store holds one attendance aggregate per site at `${siteId}/workforce/state.json`. Deploy previews use the existing deploy-scoped store. No second database or employee catalog is created. Configuration, identity bindings, shifts, correction requests, audit events and operation fingerprints participate in the same ETag conditional write. Creation uses `onlyIfNew`, subsequent updates use `onlyIfMatch`; missing concurrency metadata fails closed. Six bounded retries never use blind attendance writes. The journal fails closed at 10,000 events / 4 MiB without removing records; a future archival workflow is required before capacity is reached.

`client-workforce` authenticates existing portal users and verifies tenant membership on every request. Mutations enforce the existing same-origin protection. Self-service identity comes from authenticated `id`/`sub` plus verified membership email and an administrator's link to an existing employee. A supplied employeeId is rejected for self-service operations. The immutable user ID claim prevents a replacement login from inheriting a previous employee's attendance. Branch-restricted managers cannot read, approve, close or reassign records outside their authorized branch, or change global policy. Payroll remains owner-only through the existing accounting handler.

Clock-in/out and breaks use server time exclusively. Concurrent distinct clock-ins permit one active shift; exact retries reuse the operation fingerprint. Paid break policy is snapshotted on each shift and cannot change while a shift is active. A browser network error retains the same operation; a subsequent read checks server confirmation before offering a retry. Refreshes cannot overwrite a newer mutation with an older response.

Administrative close requires a reason, uses server time, retains the original clock-in and does not approve hours. Correction requests are proposals, never authoritative clock timestamps; approval retains original timestamps and attaches an audited correction. Hours cannot be approved while a correction is pending, and approved hours cannot be rewritten through this module.

## Employee and business experience

Overview shows attendance only after the business enables it in existing Settings. Settings links authorized portal members to existing employees and valid locations; no new employee system is created. Employees see their own shift, four clock controls, today's hours, Monday-based weekly hours, breaks, history and correction requests. Totals use the business timezone and clip overnight shifts and unpaid breaks at period boundaries. Administrators also see real working/break/off-shift counts, minutes awaiting approval, per-employee status, branch/date/employee filters, review actions and audit history. No wages or fictional lateness figures are returned by attendance.

CSV exports respect authorization, business timezone and employee/branch/date filters. They include original and corrected timestamps, break intervals, paid-break policy, approval identity and administrative-close reason. Formula-like cells are escaped. Lateness is explicitly unavailable until actual scheduled workforce shifts are implemented; appointment availability is not treated as an employee work schedule.

## Existing accounting integration

The owner's existing accounting panel imports closed, approved attendance shifts. Employee ID, work date and minutes are derived on the server. The accounting date is the reviewed shift's start date. The owner supplies overtime minutes and rate; commission and tips can continue through existing accounting controls. A deterministic `attendance_${shiftId}` ledger ID and ETag write prevent concurrent/retried duplicate imports. Source shift, reviewed timestamps, location and approval timestamp remain on the ledger entry. Imports require the existing effective hourly rate, remain pending compensation approval and never create a payment. Shifts over 24 hours require review before import; statutory payroll/overtime rules are not inferred.

## Validation and activation

Tests cover server timestamps, transitions, duplicate clock-ins, concurrent retries, identity substitution, arbitrary employee IDs, CSRF, tenant/branch authorization, immutable corrections, reviewed hours, overnight totals, safe exports, admin close and concurrent ledger imports. Browser QA uses isolated fixtures only and covers 320/375/390/430/768/1024/1440 px, both languages/themes, keyboard focus, reduced motion, clock transitions, corrections, settings and lost-response recovery. The CI workflow runs the new Chromium and touch WebKit checks against built assets.

No production employee records, attendance, stock or financial transactions are changed by QA or deployment. Businesses activate attendance themselves from Settings, then link employees. Owners must review paid-break and overtime policy before approving compensation. Customer Display secure pairing and Kiosk checkout remain separate development stages.
