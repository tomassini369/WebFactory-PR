import { requestPasswordRecovery } from "@netlify/identity";
import { createAuthGateway } from "../lib/auth-gateway.mjs";

export default async req => createAuthGateway("recovery", { requestPasswordRecovery })(req);
export const config = { rateLimit: { windowLimit: 5, windowSize: 180, aggregateBy: ["ip"] } };
