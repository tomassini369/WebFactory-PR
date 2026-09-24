import { clientCommerceStore } from "./client-store.mjs";
import { cleanText } from "./platform-utils.mjs";

function safeSiteId(siteId) {
  const value = cleanText(siteId, 120);
  if (!value) throw new Error("siteId is required.");
  return value;
}

export function v3Key(siteId, collection, id) {
  const site = safeSiteId(siteId);
  const group = cleanText(collection, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  const recordId = cleanText(id, 180).replace(/[^a-zA-Z0-9_.-]/g, "");
  if (!group || !recordId) throw new Error("Invalid V3 storage key.");
  return `${site}/v3/${group}/${recordId}.json`;
}

export async function getV3Record(siteId, collection, id) {
  return clientCommerceStore().get(v3Key(siteId, collection, id), { type: "json" });
}

export async function putV3Record(siteId, collection, id, value) {
  const record = { ...value, siteId: safeSiteId(siteId) };
  await clientCommerceStore().setJSON(v3Key(siteId, collection, id), record);
  return record;
}

export async function listV3Records(siteId, collection, { limit = 250 } = {}) {
  const site = safeSiteId(siteId);
  const group = cleanText(collection, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!group) throw new Error("Invalid V3 collection.");
  const result = await clientCommerceStore().list({ prefix: `${site}/v3/${group}/` });
  const rows = [];
  for (const blob of result.blobs || []) {
    const value = await clientCommerceStore().get(blob.key, { type: "json" });
    if (value?.siteId === site) rows.push(value);
  }
  return rows
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || "") - Date.parse(a.updatedAt || a.createdAt || ""))
    .slice(0, Math.max(1, Math.min(1000, Number(limit) || 250)));
}
