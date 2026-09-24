function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

export function detectStripeKeyMode(secretKey = "") {
  const key = String(secretKey || "").trim();
  if (!key) return "missing";
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  return "unknown";
}

export function stripeRuntimeState({ context = "", secretKey = "" } = {}) {
  const resolvedContext = String(context || env("CONTEXT") || "unknown").trim().toLowerCase() || "unknown";
  const resolvedKey = String(secretKey || env("STRIPE_SECRET_KEY") || "").trim();
  const keyMode = detectStripeKeyMode(resolvedKey);
  const production = resolvedContext === "production";
  const writeSafe = keyMode === "test" || (keyMode === "live" && production);
  return {
    context: resolvedContext,
    keyMode,
    production,
    writeSafe,
  };
}

export function assertStripeWriteAllowed(options = {}) {
  const state = stripeRuntimeState(options);
  if (state.keyMode === "missing") {
    throw Object.assign(new Error("Stripe is not configured for this deploy context."), { status: 503 });
  }
  if (state.keyMode === "unknown") {
    throw Object.assign(new Error("Stripe key mode could not be verified for this deploy context."), { status: 503 });
  }
  if (!state.writeSafe) {
    throw Object.assign(
      new Error("Live Stripe writes are disabled outside production. Configure a Stripe test key for this deploy context."),
      { status: 503 },
    );
  }
  return state;
}
