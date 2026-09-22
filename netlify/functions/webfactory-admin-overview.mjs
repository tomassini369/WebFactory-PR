import { requirePlatformAdmin, errorResponse } from "../lib/client-auth.mjs";
import {
  clientAssetStore,
  clientCommerceStore,
  clientEventStore,
  clientSiteStore,
} from "../lib/client-store.mjs";
import { assetStore, eventStore, orderStore, packageStore } from "../lib/order-store.mjs";
import { subscriptionBillingReadiness } from "../lib/subscription-billing.mjs";

const TERMINAL_ORDER_STATUSES = new Set(["IN_PRODUCTION", "PREVIEW_READY", "COMPLETED"]);
const RECOVERABLE_ORDER_STATUSES = new Set(["PAID", "PACKAGE_GENERATING", "PACKAGE_READY", "EMAIL_SENT"]);

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

function positiveNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

async function netlifyResourceUsage() {
  const token = env("NETLIFY_API_TOKEN");
  const siteId = env("NETLIFY_SITE_ID") || globalThis.Netlify?.context?.site?.id || "1fa77856-faad-4f0f-8f7c-2671e772513f";
  const accountId = env("NETLIFY_ACCOUNT_ID") || "6822a73b60eda55f284d7067";
  if (!token) return { connected: false, siteId, accountId, productionDeploysThisMonth: null, estimatedDeployCredits: null };
  const headers = { Authorization: `Bearer ${token}` };
  const request = async (path) => {
    const response = await fetch(`https://api.netlify.com/api/v1${path}`, { headers });
    if (!response.ok) throw new Error(`Netlify API returned ${response.status}.`);
    return response.json();
  };
  try {
    const [site, account, deploys] = await Promise.all([
      request(`/sites/${encodeURIComponent(siteId)}`),
      request(`/accounts/${encodeURIComponent(accountId)}`),
      request(`/sites/${encodeURIComponent(siteId)}/deploys?per_page=100`),
    ]);
    const start = new Date();
    start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
    const productionDeploysThisMonth = (Array.isArray(deploys) ? deploys : []).filter((deploy) => {
      const timestamp = Date.parse(deploy.published_at || deploy.created_at || 0);
      return deploy.context === "production" && Number.isFinite(timestamp) && timestamp >= start.getTime();
    }).length;
    return {
      connected: true,
      siteId,
      accountId,
      plan: account.type_name || site.plan || "Unknown",
      productionDeploysThisMonth,
      estimatedDeployCredits: productionDeploysThisMonth * 15,
      deploysPageComplete: !Array.isArray(deploys) || deploys.length < 100,
      error: "",
    };
  } catch (error) {
    return { connected: false, siteId, accountId, productionDeploysThisMonth: null, estimatedDeployCredits: null, error: error?.message || "Netlify API unavailable." };
  }
}

async function list(store, prefix = "") {
  const result = await store.list(prefix ? { prefix } : undefined);
  return result.blobs || [];
}

async function records(store, prefix = "", limit = 300) {
  const blobs = (await list(store, prefix)).slice(0, limit);
  const values = await Promise.all(blobs.map((blob) => store.get(blob.key, { type: "json" }).catch(() => null)));
  return values.filter(Boolean);
}

function countBy(values, key) {
  return values.reduce((counts, value) => {
    const label = String(value?.[key] || "unknown");
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
}

function latestDate(value) {
  return value?.updatedAt || value?.createdAt || value?.paidAt || "";
}

function publicClient(site) {
  const members = Array.isArray(site.members) ? site.members : [];
  const owner = members.find((member) => member.role === "owner") || members[0];
  const servicePlan = site.servicePlan || {};
  return {
    siteId: site.siteId,
    slug: site.slug,
    businessName: site.business?.name || "Negocio sin nombre",
    ownerEmail: owner?.email || "",
    status: site.status || "unknown",
    revision: Number(site.revision || 0),
    catalogItems: Array.isArray(site.catalog) ? site.catalog.length : 0,
    employees: Array.isArray(site.employees) ? site.employees.length : 0,
    stripeStatus: site.paymentRules?.stripeCapabilityStatus || "not_started",
    calendarConnected: Boolean(site.googleCalendar?.connected),
    planName: servicePlan.name || "WebFactory Premium Commerce Website",
    billingModel: servicePlan.billingModel || "one_time",
    billingStatus: servicePlan.billingStatus || "paid",
    subscriptionStatus: servicePlan.subscriptionStatus || "not_started",
    updatedAt: site.updatedAt || site.createdAt || "",
    templateMode: site.design?.mode === "demo_base" ? "template_base" : (site.design?.mode || (site.design?.templateSlug ? "template_base" : "custom")),
    templateName: site.design?.templateName || (site.design?.templateSlug ? site.design.templateSlug : "Custom"),
    templateCategory: site.design?.templateCategory || "",
    templatePath: site.design?.templateSlug ? (site.design?.templateRoute || `/templates/${site.design.templateSlug}`).replace(/^\/demos\//, "/templates/") : "",
    publicPath: site.slug ? `/sites/${site.slug}` : "",
  };
}

function publicOrder(order) {
  return {
    orderId: order.orderId,
    businessName: order.business?.name || "Negocio sin nombre",
    customerEmail: order.client?.email || "",
    status: order.status || "unknown",
    amount: Number(order.amountTotal || order.amount || 0),
    updatedAt: latestDate(order),
    packageReady: Boolean(order.productionPackageKey || order.productionPackageReadyAt),
    adminEmailSent: Boolean(order.adminEmailMessageId || order.productionPackageSent),
    customerEmailSent: Boolean(order.customerConfirmationSent),
  };
}

function capacity(sites, blockers) {
  const safeLimit = Math.floor(positiveNumber(env("WEBFACTORY_SAFE_CLIENT_CAPACITY"), 25));
  const active = sites.length;
  const remaining = Math.max(0, safeLimit - active);
  const percent = Math.min(100, Math.round((active / safeLimit) * 100));
  let level = "healthy";
  if (percent >= 90 || blockers > 3) level = "critical";
  else if (percent >= 80 || blockers > 1) level = "warning";
  else if (percent >= 60 || blockers > 0) level = "watch";
  return {
    level,
    safeClientCapacity: safeLimit,
    activeClients: active,
    estimatedOpenings: remaining,
    utilizationPercent: percent,
    model: "WebFactory safety threshold; not a Netlify hard limit.",
  };
}

export default async (req) => {
  try {
    if (req.method !== "GET") {
      return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    }
    const user = await requirePlatformAdmin();
    const [sites, orders, commerce, stripeEvents, clientEvents, clientAssets, orderAssets, packages, netlifyUsage] = await Promise.all([
      records(clientSiteStore(), "sites/"),
      records(orderStore(), "orders/"),
      records(clientCommerceStore()),
      records(eventStore(), "events/"),
      records(clientEventStore()),
      list(clientAssetStore()),
      list(assetStore()),
      list(packageStore()),
      netlifyResourceUsage(),
    ]);

    const now = Date.now();
    const stuckOrders = orders.filter((order) => RECOVERABLE_ORDER_STATUSES.has(order.status) && (
      now - Date.parse(latestDate(order) || 0) > 30 * 60 * 1000
    ));
    const pendingTransactions = commerce.filter((record) => ["pending", "payment_pending", "held"].includes(record.status));
    const blockers = stuckOrders.length + pendingTransactions.length;
    const clientRows = sites.map(publicClient).sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
    const orderRows = orders.map(publicOrder).sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
    const connectedStripe = sites.filter((site) => site.paymentRules?.stripeCapabilityStatus === "active").length;
    const connectedCalendar = sites.filter((site) => site.googleCalendar?.connected).length;
    const completedOrders = orders.filter((order) => TERMINAL_ORDER_STATUSES.has(order.status)).length;
    const publishedSites = sites.filter((site) => ["active", "published", "live"].includes(site.status)).length;
    const activeSubscriptions = sites.filter((site) => ["active", "trialing"].includes(site.servicePlan?.subscriptionStatus)).length;
    const pastDueSubscriptions = sites.filter((site) => ["past_due", "unpaid"].includes(site.servicePlan?.subscriptionStatus)).length;
    const secretNames = [
      "STRIPE_SECRET_KEY",
      "STRIPE_PRICE_WEBFACTORY_PREMIUM",
      "STRIPE_PRICE_WEBFACTORY_MONTHLY",
      "STRIPE_PRICE_WEBFACTORY_ANNUAL",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_CONNECT_WEBHOOK_SECRET",
      "WEBFACTORY_GMAIL_USER",
      "WEBFACTORY_GMAIL_APP_PASSWORD",
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "WEBFACTORY_TOKEN_ENCRYPTION_KEY",
      "NETLIFY_API_TOKEN",
    ];
    const configuration = secretNames.map((name) => ({ name, configured: Boolean(env(name)) }));
    const configuredCount = configuration.filter((item) => item.configured).length;
    const monthlyCredits = positiveNumber(env("WEBFACTORY_NETLIFY_MONTHLY_CREDITS"));
    const creditsUsed = positiveNumber(env("WEBFACTORY_NETLIFY_CREDITS_USED"), 0);
    const creditPercent = monthlyCredits ? Math.min(100, Math.round((creditsUsed / monthlyCredits) * 100)) : null;
    const deploy = globalThis.Netlify?.context?.deploy || {};
    const siteContext = globalThis.Netlify?.context?.site || {};

    return Response.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      administrator: { id: user.id, email: user.email, name: user.name || "WebFactory Admin" },
      summary: {
        clients: sites.length,
        publishedSites,
        setupPending: sites.length - publishedSites,
        productionOrders: orders.length,
        completedOrders,
        commerceRecords: commerce.length,
        connectedStripe,
        connectedCalendar,
        activeSubscriptions,
        pastDueSubscriptions,
        blockers,
      },
      capacity: capacity(sites, blockers),
      resources: {
        netlify: {
          plan: netlifyUsage.plan || env("WEBFACTORY_NETLIFY_PLAN") || "Free",
          monthlyCredits,
          creditsUsed: monthlyCredits ? creditsUsed : null,
          utilizationPercent: creditPercent,
          productionDeployCreditCost: 15,
          productionDeploysThisMonth: netlifyUsage.productionDeploysThisMonth,
          estimatedDeployCredits: netlifyUsage.estimatedDeployCredits,
          apiConnected: netlifyUsage.connected,
          apiError: netlifyUsage.error || "",
          source: netlifyUsage.connected ? "Netlify API + optional official credit snapshot" : (monthlyCredits ? "Configured WebFactory credit snapshot" : "Netlify project metadata; open official billing for exact credits"),
          dashboardUrl: "https://app.netlify.com/projects/webfactorypr/usage-and-billing",
        },
        storage: {
          clientAssets: clientAssets.length,
          orderAssets: orderAssets.length,
          productionPackages: packages.length,
          trackedObjects: clientAssets.length + orderAssets.length + packages.length,
          bytesKnown: false,
        },
        runtime: {
          deployId: deploy.id || "",
          deployContext: deploy.context || "unknown",
          published: Boolean(deploy.published),
          siteId: siteContext.id || "",
          siteName: siteContext.name || "webfactorypr",
          siteUrl: siteContext.url || env("URL") || "https://webfactorypr.netlify.app",
        },
      },
      integrations: {
        configured: configuredCount,
        total: configuration.length,
        configuration,
      },
      subscriptionBilling: subscriptionBillingReadiness(),
      operations: {
        orderStatuses: countBy(orders, "status"),
        transactionStatuses: countBy(commerce, "status"),
        stripeWebhookEvents: stripeEvents.length,
        clientWebhookEvents: clientEvents.length,
        stuckOrders: stuckOrders.map(publicOrder).slice(0, 25),
        pendingTransactions: pendingTransactions.slice(0, 25).map((record) => ({
          transactionId: record.transactionId || "",
          siteId: record.siteId || "",
          kind: record.kind || "unknown",
          status: record.status || "unknown",
          updatedAt: latestDate(record),
        })),
      },
      clients: clientRows.slice(0, 200),
      orders: orderRows.slice(0, 100),
    }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) {
    return errorResponse(error);
  }
};
