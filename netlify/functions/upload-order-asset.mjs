export default async () => Response.json(
  { ok:false,message:"The legacy upload-order-asset route has been retired. Use upload-builder-asset." },
  { status:410,headers:{ "Cache-Control":"no-store" } },
);
