import { getUser, logout, refreshSession } from "@netlify/identity";
import { createPortalSession } from "../lib/portal-session.mjs";

export default async (req, context) => createPortalSession({ getUser, logout, refreshSession })(req, context);
export const config = { rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip"] } };
