export default async () => Response.json(
  { ok:false,message:"retry-paid-orders.mjs belongs to the retired WebFactory one-time order system." },
  { status:410,headers:{ "Cache-Control":"no-store" } },
);
