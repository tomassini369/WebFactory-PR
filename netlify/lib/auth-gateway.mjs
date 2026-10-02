import { assertSameOrigin } from "./client-auth.mjs";
import { validEmail } from "./platform-utils.mjs";

export const authHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
export const authJson = (body, status = 200) => Response.json(body, { status, headers: authHeaders });
const headers = authHeaders;
const json = authJson;

// Bound the stream itself: Content-Length can be missing or dishonest.
export async function readAuthPayload(req, maxBytes = 8192) {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw Object.assign(new Error(), { status: 415 });
  }
  const reader = req.body?.getReader();
  if (!reader) throw Object.assign(new Error(), { status: 400 });
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw Object.assign(new Error(), { status: 413 });
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw Object.assign(new Error('Invalid JSON payload.'), { status: 400 }); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw Object.assign(new Error('Invalid JSON payload.'),{status:400});
  return payload;
}

export function createAuthGateway(action, identity) {
  return async req => {
    if (req.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
    let payload;
    try {
      assertSameOrigin(req);
      payload = await readAuthPayload(req);
    } catch (error) {
      return json({ ok: false, message: "Request rejected." }, [403, 413, 415].includes(error.status) ? error.status : 400);
    }
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const emailValid = email.length <= 320 && validEmail(email);
    if (action === "recovery") {
      // Identical status/body for missing, invalid, unknown and known accounts.
      if (emailValid) {
        try { await identity.requestPasswordRecovery(email); } catch { /* Never expose account existence or provider details. */ }
      }
      return json({ ok: true }, 202);
    }
    const password = payload.password;
    if (!emailValid || typeof password !== "string" || !password.length || password.length > 1024) {
      return json({ ok: false, message: "Unable to sign in." }, 401);
    }
    try {
      await identity.login(email, password);
      // The SDK sets the cookies. Never return tokens, passwords or user metadata.
      return json({ ok: true }, 200);
    } catch (error) {
      const providerStatus = Number(error?.status);
      const status = providerStatus === 429 ? 429 : providerStatus >= 400 && providerStatus < 500 ? 401 : 503;
      return json({ ok: false, message: "Unable to sign in." }, status);
    }
  };
}
