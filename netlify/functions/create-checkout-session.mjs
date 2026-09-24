export default async () => Response.json(
  { ok:false,message:"Legacy one-time WebFactory checkout has been permanently retired. Use the SaaS subscription flow." },
  { status:410,headers:{ "Cache-Control":"no-store" } },
);
