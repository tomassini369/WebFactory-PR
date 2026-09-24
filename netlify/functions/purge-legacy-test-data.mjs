import { assertSameOrigin, errorResponse, requirePlatformAdmin } from "../lib/client-auth.mjs";
import { assetStore, orderStore, packageStore } from "../lib/order-store.mjs";

async function purgeStore(store) {
  const listed = await store.list();
  for (const blob of listed.blobs || []) await store.delete(blob.key);
  return (listed.blobs || []).length;
}

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok:false,message:"Method not allowed." }, { status:405 });
  }
  try {
    assertSameOrigin(req);
    const admin = await requirePlatformAdmin();
    const payload = await req.json();
    if (String(payload.confirmation || "").trim() !== "DELETE LEGACY DATA") {
      throw Object.assign(new Error("Type DELETE LEGACY DATA to confirm."), { status:400 });
    }

    const [orders, assets, packages] = await Promise.all([
      purgeStore(orderStore()),
      purgeStore(assetStore()),
      purgeStore(packageStore()),
    ]);

    return Response.json({
      ok:true,
      deletedBy:admin.email,
      deleted:{ orders, assets, packages },
      retired:true,
    }, { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
