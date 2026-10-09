import { assertSameOrigin } from '../lib/client-auth.mjs';
import { readBuyerReceipt } from '../lib/buyer-receipt-access.mjs';
const headers = { 'Cache-Control': 'no-store', 'Netlify-CDN-Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
export default async req => {
  try {
    if (req.method !== 'POST') return Response.json({ ok: false }, { status: 405, headers });
    assertSameOrigin(req);
    const body = await req.text();
    if (body.length > 512) return Response.json({ok:false}, {status:400,headers});
    const { token, slug } = JSON.parse(body);
    if(typeof slug !== 'string' || !/^[a-z0-9-]{1,64}$/.test(slug)) return Response.json({ok:false}, {status:400,headers});
    return Response.json({ ok: true, ...await readBuyerReceipt(token, {slug}) }, { headers });
  } catch (error) {
    return Response.json({ ok: false, message: error.status === 404 ? 'Receipt link is invalid or expired.' : 'Receipt is temporarily unavailable.' }, { status: error.status || 503, headers });
  }
};
