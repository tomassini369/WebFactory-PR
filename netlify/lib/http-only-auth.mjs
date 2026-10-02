const identityCookieNames = new Set(["nf_jwt", "nf_refresh"]);
const protectedCookieNames = new Set([...identityCookieNames, "__Host-wf-session"]);

function secureOptions(options) {
  const { domain: _domain, ...rest } = options;
  return { ...rest, httpOnly: true, secure: true, path: "/", sameSite: "Lax" };
}

// Netlify supplies a distinct Context/cookie jar for each request. Adapt only
// that jar, never the SDK module or global context. Buffer SDK writes so a failed
// operation cannot emit partially established authentication cookies.
export async function withHttpOnlyIdentityCookies(context, operation) {
  const cookies = context?.cookies;
  if (!cookies || cookies !== globalThis.Netlify?.context?.cookies) throw new Error("Identity cookie context unavailable.");
  const original = cookies.set;
  const pending = new Map();
  const protectedSet = options => {
    if (protectedCookieNames.has(options.name)) pending.set(options.name, secureOptions(options));
    else original.call(cookies, options);
  };
  cookies.set = protectedSet;
  try {
    if (cookies.set !== protectedSet) throw new Error("Identity cookie context cannot be protected.");
    const result = await operation();
    for (const options of pending.values()) original.call(cookies, options);
    return result;
  } finally { cookies.set = original; }
}

export function upgradeIdentityCookies(context) {
  for (const name of identityCookieNames) {
    const value = context.cookies.get(name);
    if (value) context.cookies.set(secureOptions({ name, value }));
  }
}

export function publicIdentityUser(user) {
  if (!user?.id || !user?.email) return null;
  // Deliberate allowlist. No session tokens, operator tokens or arbitrary metadata.
  return {
    id: user.id, email: user.email, name: user.name,
    roles: Array.isArray(user.roles) ? user.roles.filter(role => typeof role === "string") : [],
    confirmedAt: user.confirmedAt,
  };
}
