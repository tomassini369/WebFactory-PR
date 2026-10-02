import { assertSameOrigin } from "./client-auth.mjs";
import { authHeaders, authJson, readAuthPayload } from "./auth-gateway.mjs";
import { publicIdentityUser, withHttpOnlyIdentityCookies } from "./http-only-auth.mjs";

async function identityRequest(fetcher, url, options) {
  const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw Object.assign(new Error("Identity request rejected."), { status: response.status });
  return response.json();
}

// SDK login remains the session issuer. These account operations use Identity's
// verification API because the SDK account helpers retain a shared browser-style
// current user, unsuitable for concurrent server requests.
export function createCompletePortalAccess(identity, fetcher = fetch) {
  return async (req, context) => {
    if (req.method !== "POST") return new Response(null, { status: 405, headers: { ...authHeaders, Allow: "POST" } });
    try {
      assertSameOrigin(req);
      const { action, token, password } = await readAuthPayload(req);
      if (!["invite", "recovery"].includes(action) || typeof token !== "string" || token.length < 8 || token.length > 4096 || typeof password !== "string" || Array.from(password).length < 15 || password.length > 1024) {
        return authJson({ ok: false, message: "Invalid link or password." }, 400);
      }
      const identityUrl = identity.getIdentityConfig()?.url;
      if (!identityUrl || new URL(identityUrl).protocol !== "https:") throw new Error("Identity is unavailable.");
      const verified = await identityRequest(fetcher, `${identityUrl}/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: action === "invite" ? "signup" : "recovery", token, ...(action === "invite" ? { password } : {}) }),
      });
      if (typeof verified.access_token !== "string") throw new Error("Identity verification failed.");
      const authorization = { Authorization: `Bearer ${verified.access_token}` };
      const account = await identityRequest(fetcher, `${identityUrl}/user`, { headers: authorization });
      if (!account.email) throw new Error("Identity account is unavailable.");
      if (action === "recovery") {
        await identityRequest(fetcher, `${identityUrl}/user`, {
          method: "PUT", headers: { ...authorization, "Content-Type": "application/json" }, body: JSON.stringify({ password }),
        });
      }
      const user = await withHttpOnlyIdentityCookies(context, () => identity.login(account.email, password));
      return authJson({ ok: true, user: publicIdentityUser(user) });
    } catch (error) {
      const status = [403,413,415,429].includes(error?.status) ? error.status : error?.status >= 400 && error.status < 500 ? 400 : 503;
      return authJson({ ok: false, message: "Unable to complete access. The link may have expired." }, status);
    }
  };
}
