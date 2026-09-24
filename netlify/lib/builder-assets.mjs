import { getDeployStore, getStore } from "@netlify/blobs";
import { safeFileName } from "./platform-utils.mjs";

function isProduction() {
  return globalThis.Netlify?.context?.deploy?.context === "production";
}

export function builderDraftAssetStore() {
  return isProduction()
    ? getStore("webfactory-builder-draft-assets", { consistency: "strong" })
    : getDeployStore("webfactory-builder-draft-assets");
}

export { safeFileName };
