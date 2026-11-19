import {clientCommerceStore,getClientSite} from '../lib/client-store.mjs';
import {requireSiteAccess,assertSameOrigin,errorResponse} from '../lib/client-auth.mjs';
import {authJson,readAuthPayload} from '../lib/auth-gateway.mjs';
import {publicPromotion,validatePromotion} from '../lib/organic-promotions.mjs';
const prefix = 'marketplace/organic/';
export default async req => {
  try {
    assertSameOrigin(req);
    const db = clientCommerceStore();
    if (req.method === 'GET') {
      const rows = [];
      const now = Date.now();
      for await (const page of db.list({prefix,paginate:true})) {
        for (let i=0; i<page.blobs.length; i+=12) {
          const batch = await Promise.all(page.blobs.slice(i,i+12).map(async ({key}) => {
            const offer = await db.get(key,{type:'json'});
            if (!offer || offer.withdrawn || offer.start>now || offer.end<=now) return null;
            return publicPromotion(await getClientSite(offer.siteId),offer,now);
          }));
          rows.push(...batch.filter(Boolean));
        }
      }
      return authJson({ok:true,offers:rows.sort((a,b)=>a.end-b.end)});
    }
    if (req.method !== 'POST') return new Response(null,{status:405});
    const input = await readAuthPayload(req);
    const {site} = await requireSiteAccess(input.siteId,['owner']);
    if (typeof input.itemId !== 'string' || !input.itemId || input.itemId.length>160) return authJson({ok:false},400);
    const key = prefix+encodeURIComponent(site.siteId)+'/'+encodeURIComponent(input.itemId);
    const previous = await db.getWithMetadata(key,{type:'json'});
    if (input.action === 'read') return authJson({ok:true,offer:previous?.data || null});
    if (input.revision !== (previous?.data?.revision || 0)) return authJson({ok:false,message:'Reload the offer.'},409);
    const value = input.action === 'withdraw' && previous ? {...previous.data,withdrawn:true} :
      input.action === 'publish' ? validatePromotion(site,input,Date.now()) : null;
    if (!value) return authJson({ok:false,message:'Check the item, terms and dates.'},400);
    if (previous && !previous.etag) return authJson({ok:false},503);
    const offer = {...value,revision:input.revision+1};
    const saved = await db.setJSON(key,offer,previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
    return saved.modified ? authJson({ok:true,offer}) : authJson({ok:false,message:'Reload the offer.'},409);
  } catch (error) {return errorResponse(error)}
};
export const config={rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip']}};
