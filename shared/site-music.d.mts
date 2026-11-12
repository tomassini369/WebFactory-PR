type Track={id:string;title:string;audioKey:string;coverKey:string};
export const musicCategories:string[];
export const musicFileLimit:number;
export const musicTrackLimit:number;
export function supportsSiteMusic(category:string):boolean;
export function normalizeSiteMusic(input:unknown,siteId:string):{tracks:Track[];autoplay:boolean;welcomeId:string};
export function siteAssetUrl(siteId:string,key:string):string;
export function publicSiteMusic(site:any):{tracks:Array<{id:string;title:string;audioUrl:string;coverUrl:string}>;autoplay:boolean;welcomeId:string};
export function siteCanPublishMusic(site:{design?:{templateSlug?:string};business?:{category?:string}}):boolean;
