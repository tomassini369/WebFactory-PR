export default async () => Response.json(
  { ok:false,message:"verify-checkout-session.mjs belongs to the retired WebFactory one-time order system." },
  { status:410,headers:{ "Cache-Control":"no-store" } },
);
