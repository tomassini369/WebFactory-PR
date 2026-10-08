import type {StorefrontSite} from './ClientStorefront'
export function editablePreview(site:any):StorefrontSite{
 const image=(key:string)=>key?`/.netlify/functions/client-asset?siteId=${encodeURIComponent(site.siteId)}&key=${encodeURIComponent(key)}`:''
 return {...site,business:{...site.business,logoUrl:image(site.business.logoAssetKey)||site.business.logoUrl,heroUrl:image(site.business.heroAssetKey)||site.business.heroUrl,galleryUrls:Array.isArray(site.business.galleryAssetKeys)?site.business.galleryAssetKeys.map(image):(site.business.galleryUrls||[])},catalog:site.catalog.map((item:any)=>({...item,imageUrl:image(item.imageAssetKey)||item.imageUrl||''}))}
}
