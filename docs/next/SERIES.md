# Local weekly appointment series

Experimental branch only. New-appointment form supports 1,2,4,6 or12 weekly example appointments. The entire batch is checked against both inherited practice bookings and saved Next bookings, plus buffers and active professional/service assignment, before one local write. A conflict rejects the batch without partial records. Weekly repetition preserves business wall time across DST. Cancelled appointments cannot be completed/reconfirmed; unpaid appointments cannot be completed.

26 Next tests pass, including four new regressions for batch persistence, conflict atomicity, unpaid completion and DST. This is browser-local behavior, not server concurrency or cross-device persistence. Existing advanced server-backed waitlist, attendance and payment provider work remains pending. No production or PR125 changes.
