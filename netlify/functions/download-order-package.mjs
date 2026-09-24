export default async () => Response.json(
  { ok:false,message:"download-order-package.mjs belongs to the retired WebFactory one-time order system." },
  { status:410,headers:{ "Cache-Control":"no-store" } },
);
