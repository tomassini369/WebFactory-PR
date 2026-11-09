# Consumer account presentation gate

An existing WebFactory Identity login can authenticate a visitor who has not
activated a consumer profile. Previously the account sidebar immediately said
“My account” and offered profile/favorites links, even if profile retrieval
failed. Authentication is not proof of an active consumer profile.

ConsumerPage now binds the resolved profile to the current Identity ID, clears
stale profile/directory state during reload or identity changes, and keeps the
account heading and navigation unavailable until a profile is validated with
neither pending acceptance nor restriction. Pending, confirmation/error and
eligibility states keep logout and browsing available. Pending acceptance
explains that the shared login does not automatically create a consumer profile.
The existing explicit eligibility/terms activation flow remains in place.

Profile validation is independent of the public directory request. Public
listing failures no longer masquerade as consumer identity/profile failures.
This is a presentation fix; server-side Identity, confirmation, consent, MFA
and role/membership checks are unchanged. No live users or profiles are created.

Regression smoke: existing login succeeds but profile returns 403; no account
heading, private anchors or profile form appear and no profile write occurs.
Retry reaches explicit eligibility, still without active-account navigation;
acceptance then enables the existing profile, favorites and privacy flows.
Existing signup, favorites, restricted profile and logout checks remain.
