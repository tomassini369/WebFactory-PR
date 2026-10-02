import { login } from "@netlify/identity";
import { createAuthGateway } from "../lib/auth-gateway.mjs";
import { withHttpOnlyIdentityCookies } from "../lib/http-only-auth.mjs";
import { issuePrimarySession } from "../lib/mfa-security.mjs";

export default async (req, context) => createAuthGateway("login", {
  login: (email, password) => withHttpOnlyIdentityCookies(context, async () => {
    const user = await login(email, password);
    await issuePrimarySession(user, context);
    return user;
  }),
})(req);
export const config = { rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip"] } };
