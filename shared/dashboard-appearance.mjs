import {findColorPalette} from './color-palettes.mjs';
export const DASHBOARD_WALLPAPERS = Object.freeze([
 {id:'room',nameEs:'Sala panorámica',nameEn:'Panoramic room',src:'/dashboard/room.webp',download:'/dashboard/room-original.jpg'},
 {id:'landscape',nameEs:'Paisaje violeta',nameEn:'Violet landscape',src:'/portal-violet-landscape.webp',download:'/portal-violet-landscape.webp'},
 {id:'waves',nameEs:'Ondas doradas',nameEn:'Golden waves',src:'/portal-gold-waves.webp',download:'/portal-gold-waves.webp'},
]);
export const DEFAULT_APPEARANCE = Object.freeze({paletteId:'',background:'room',blur:34,alpha:0.66,dim:0.36,motion:1,accent:'#6aa8ff',cardDepth:'soft',buttonDepth:'soft'});
export function normalizeAppearance(input={}) {
 const clamp=(key,min,max)=>Math.min(max,Math.max(min,typeof input[key]==='number'&&Number.isFinite(input[key])?input[key]:DEFAULT_APPEARANCE[key]));
 const depth=key=>['flat','soft','raised'].includes(input[key])?input[key]:DEFAULT_APPEARANCE[key];
 return {paletteId:typeof input.paletteId==='string'&&findColorPalette(input.paletteId)?input.paletteId:'',cardDepth:depth('cardDepth'),buttonDepth:depth('buttonDepth'),background:[...DASHBOARD_WALLPAPERS.map(x=>x.id),'custom'].includes(input.background)?input.background:'room',blur:clamp('blur',0,40),alpha:clamp('alpha',0.66,0.96),dim:clamp('dim',0.25,0.85),motion:clamp('motion',0,1),accent:/^#[0-9a-f]{6}$/i.test(input.accent||'')?input.accent:DEFAULT_APPEARANCE.accent};
}
