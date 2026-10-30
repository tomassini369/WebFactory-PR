export type KioskAppearance={skinId:string;wallpaper:'room'|'landscape'|'waves'|'none';cardDepth:'flat'|'soft'|'raised';buttonDepth:'flat'|'soft'|'raised';version:number;primary:string;secondary:string;font:'native'|'humanist'|'rounded';buttons:'original'|'square'|'rounded';cards:'original'|'square'|'soft';background:'brand'|'neutral';motion:'subtle'|'none';layout:'skin'|'split'|'gallery'|'list'|'compact';finish:'original'|'matte'|'gloss'|'glass'|'metallic';glassStyle:'classic'|'liquid';glassPalette:boolean;backgroundNatural:boolean;glassOpacity:number;glassBlur:number;colorMode:'solid'|'gradient'|'pattern'|'image';gradientFrom:string;gradientTo:string;gradientAngle:number;pattern:'waves'|'dots'|'diagonal';backgroundAssetKey:string;imageFit:'cover'|'contain';imageX:number;imageY:number;imageBlur: number;overlayColor:string;overlayOpacity:number;headerColor:string;cardColor:string;cartColor:string;welcome:'none'|'banner'|'hero';welcomeText:string;density:'comfortable'|'spacious'};
export type KioskPreset={id:string;name:string;appearance:KioskAppearance};
export const kioskSkins:ReadonlyArray<{id:string;version:number;name:string;layout:string;es:string;en:string;coreVersion:number;capabilities:ReadonlyArray<string>}>;
export function validateKioskAppearance(input:unknown,siteId?:string):KioskAppearance;
export function kioskAppearance(input?:unknown,siteId?:string):KioskAppearance;
export function validateKioskPresets(input:unknown,siteId?:string):KioskPreset[];
export function kioskPresets(input?:unknown,siteId?:string):KioskPreset[];
export function kioskBackgroundKey(key:unknown,siteId?:string):boolean;
export const kioskBackgroundLimit:number;
