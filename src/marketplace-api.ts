import {requestJson} from '../shared/http-client.mjs'
export type DirectoryBusiness={slug:string;name:string;nameEn:string;nameEs:string;category:string;categoryLabel:string;description:string;descriptionEn:string;descriptionEs:string;municipalities:string[];locations:Array<{name:string;address:string;mapsUrl:string}>;heroUrl:string;logoUrl:string;galleryUrls:string[];services:Array<{id:string;name:string;nameEn:string;nameEs:string;price:number|null;type:string;imageUrl:string;requiresAppointment:boolean}>}
export type ConsumerProfile={name:string;municipality:string;favorites:string[];following:string[];revision:number;needsAcceptance?:boolean;restricted?:boolean}
export async function marketplaceRequest(path:string,payload?:Record<string,unknown>,signal?:AbortSignal){
 const result=await requestJson('/.netlify/functions/marketplace-'+path,{method:payload?'POST':'GET',signal,...(payload?{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{})},{requireOk:true})
 if(path==='directory'&&(!Array.isArray(result.entries)||typeof result.truncated!=='boolean'))throw new Error('Invalid directory response')
 return result
}
export const businessName=(b:DirectoryBusiness,lang:'es'|'en')=>(lang==='es'?b.nameEs:b.nameEn)||b.name

export function catalogItemUrl(slug: string, itemId: string) {
 return '/sites/' + encodeURIComponent(slug) + '?' + new URLSearchParams({item: itemId})
}
