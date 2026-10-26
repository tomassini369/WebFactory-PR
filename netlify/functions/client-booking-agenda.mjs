import {requireSiteCapability,errorResponse} from '../lib/client-auth.mjs';
import {clientCommerceStore} from '../lib/client-store.mjs';
import {canAccessCommerce,employeeCommerceRecord} from '../lib/commercial-access.mjs';

export function createBookingAgendaHandler({authorize=requireSiteCapability,getStore=clientCommerceStore}={}) {
  return async req=>{
    try {
      if(req.method!=='GET') return new Response(null,{status:405});
      const query=new URL(req.url).searchParams;
      const {site,membership}=await authorize(query.get('siteId'),'bookings');
      const start=Date.parse(query.get('start')),end=Date.parse(query.get('end'));
      if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>42*86400000) throw Object.assign(new Error('Choose a date range of up to 42 days.'),{status:400});
      const store=getStore(),rows=[];
      const pages=store.list({prefix:`${site.siteId}/bookings/`,paginate:true});
      for await(const page of pages[Symbol.asyncIterator]?pages:[await pages]) {
        for(let offset=0;offset<(page.blobs||[]).length;offset+=20) {
          const batch=await Promise.all(page.blobs.slice(offset,offset+20).map(blob=>store.get(blob.key,{type:'json'})));
          for(const record of batch) if(record?.kind==='booking'&&Date.parse(record.start)>=start&&Date.parse(record.start)<end&&canAccessCommerce(site,membership,record)) rows.push(employeeCommerceRecord(record,membership));
          if(rows.length>2000) throw Object.assign(new Error('Choose a shorter date range. / Elige un período más corto.'),{status:422});
        }
      }
      rows.sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
      return Response.json({ok:true,bookings:rows},{headers:{'Cache-Control':'private, no-store'}});
    }catch(error){return errorResponse(error);}
  };
}
export default createBookingAgendaHandler();
