# Owner wages, costs and accounting

The Employees and Analytics pages include the same private accounting panel. General managers, cashiers and employees cannot read or write this ledger. Platform administrators retain their existing support authority. Google and email integrations are unchanged.

## Workflow

1. Save an employee in the existing team editor, then set their hourly USD rate and effective date.
2. Enter work date, regular hours, separately classified overtime hours and explicit overtime rate, agreed commission and tips payable. This version uses manual time entry, not a time clock or automatic statutory overtime rules.
3. Approve the work calculation. The rate and calculated gross amounts are immutable snapshots. Changing a rate does not recalculate earlier entries.
4. Record payments already made against approved work. Partial payments are supported; these records do not transfer money or calculate deductions, withholding, employer contributions or net payroll.
5. Record operating expenses, inventory purchases and material/inventory consumption with employee, catalog item, quantity and invoice reference when applicable. Cost entries do not mutate physical inventory; use the existing Inventory controls for stock movements. Receipt references are text, not uploaded attachments.
6. Existing booking employee IDs attribute revenue automatically; use Assign sale for other transactions or corrections. Unassigned revenue remains visible. An allocation is a whole-transaction attribution, not a split among multiple employees.
7. Filter dates and employee; export CSV from either panel. Existing Stripe and ATH accounting downloads remain available.

## Report meaning

- Work is grouped by work date, with approved gross accrual and linked payments through the selected end date. Payments in the selected period also appear in the audit section.
- Sales use the recorded payment timestamp (creation timestamp if absent), in the business timezone. Orders and bookings are deduplicated by transaction ID. Receipts are not counted again as sales.
- Tax and customer tips are excluded from estimated revenue. Legacy cumulative refund amounts are allocated proportionally to estimate net revenue; refunds remain grouped under the original payment date. This is explicitly not a period-accurate refund ledger or a tax return. Unpaid transactions and unassigned/refunded sales are flagged for review in the export.
- Estimated result subtracts approved wages and commissions, operations and consumption. Inventory purchases and employee tips are separate to avoid double subtraction.
- Inventory valuation is a current quantity snapshot at the latest recorded purchase cost on/before the end date, not historical stock or a definitive accounting valuation. Missing costs remain unknown rather than zero.
- CSV is UTF-8 with a BOM, quoted cells and formula-injection protection. It is a long-form report with section, record, date, employee, field, value and unit columns. Sections include summary, employee metrics, work, sales, expenses, audit, rate history and current inventory.

## Integrity and operations

`client-business-accounting` uses existing Identity/MFA and owner authorization on every request. Writes enforce same origin and use a conditional ETag write to the tenant-private `${siteId}/accounting/ledger.json` in the existing commerce store. Client IDs make successful retries idempotent. Concurrent stale writes fail with 409. Append-only void records preserve corrections; rates already referenced by work cannot be voided, and work with active payment records cannot be voided.

The ledger is never added to a public employee/site response. Existing full tenant commerce backups include its private key. Production uses the site store and previews use deploy stores, consistent with the current platform.

Limits: 5,000 ledger entries / 2 MiB, 10,000 source commerce records and a bounded read duration. Exceeding a limit fails explicitly; no partial report is represented as complete. Exports are non-transactional snapshots of current records. This release does not archive or purge financial history.

Validation: domain tests cover rates, approvals, partial payments, corrections, duplicate requests, dates, costs and refunds. HTTP boundary tests cover owner-only authorization, origin checks, tenant scope, pagination and conditional writes. The isolated design preview shows explicitly labeled sample wage metrics; preview writes remain disabled.
