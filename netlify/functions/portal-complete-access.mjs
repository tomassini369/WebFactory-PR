import { getIdentityConfig, login } from "@netlify/identity";
import { createCompletePortalAccess } from "../lib/complete-portal-access.mjs";

export default async (req, context) => createCompletePortalAccess({ getIdentityConfig, login })(req, context);
export const config = { rateLimit: { windowLimit: 10, windowSize: 180, aggregateBy: ["ip"] } };
