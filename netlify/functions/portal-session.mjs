import { getUser, logout, refreshSession } from "@netlify/identity";
import { createPortalSession } from "../lib/portal-session.mjs";
import { securityState, revokePrimarySession } from "../lib/mfa-security.mjs";

export default async (req, context) => createPortalSession({ getUser, logout, refreshSession }, { status: securityState, revoke: revokePrimarySession })(req, context);
export const config = { rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip"] } };
