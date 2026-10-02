import { login } from "@netlify/identity";
import { createAuthGateway } from "../lib/auth-gateway.mjs";
import { withHttpOnlyIdentityCookies } from "../lib/http-only-auth.mjs";

export default async (req, context) => createAuthGateway("login", {
  login: (email, password) => withHttpOnlyIdentityCookies(context, () => login(email, password)),
})(req);
export const config = { rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip"] } };
