const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export function publicContact(raw){
 let input;try{input=JSON.parse(raw||'')}catch{return null}
 if(input?.status!=='active'||!/^DMCA-\d+$/.test(input.registration||''))return null;
 const fields={name:180,organization:180,address:500,phone:80,email:320,registration:40};const result={status:'active'};
 for(const [key,max]of Object.entries(fields)){if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>max)return null;result[key]=input[key].trim()}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))return null;
 return result;
}
export default req=>{if(req.method!=='GET')return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});const contact=publicContact(globalThis.Netlify?.env?.get('WF_DMCA_PUBLIC_CONTACT_JSON'));return Response.json(contact?{ok:true,contact}:{ok:false},{status:contact?200:503,headers})};
