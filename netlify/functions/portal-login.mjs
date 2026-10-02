import { login } from "@netlify/identity";
import { createAuthGateway } from "../lib/auth-gateway.mjs";

export default async req => createAuthGateway("login", { login })(req);
export const config = { rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip"] } };
