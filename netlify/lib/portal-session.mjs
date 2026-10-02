import { assertSameOrigin } from "./client-auth.mjs";
import { authHeaders, authJson, readAuthPayload } from "./auth-gateway.mjs";
import { publicIdentityUser, upgradeIdentityCookies, withHttpOnlyIdentityCookies } from "./http-only-auth.mjs";

export function createPortalSession(identity) {
  return async (req, context) => {
    try {
      if (req.method === "GET") return authJson({ ok: true, user: publicIdentityUser(await identity.getUser()) });
      if (req.method !== "POST") return new Response(null, { status: 405, headers: { ...authHeaders, Allow: "GET, POST" } });
      assertSameOrigin(req);
      const payload = await readAuthPayload(req);
      if (payload.action === "logout") {
        await identity.logout();
        return authJson({ ok: true });
      }
      if (payload.action !== "refresh") return authJson({ ok: false, message: "Request rejected." }, 400);
      // Protect legacy cookies only after Identity has accepted the user. A
      // refreshed token is read on the next request, never echoed into JSON.
      if (await identity.getUser()) upgradeIdentityCookies(context);
      await withHttpOnlyIdentityCookies(context, () => identity.refreshSession());
      return authJson({ ok: true });
    } catch (error) {
      return authJson({ ok: false, message: "Unable to update authentication." }, [403,413,415].includes(error?.status) ? error.status : 503);
    }
  };
}
