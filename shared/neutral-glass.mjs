export const NEUTRAL_GLASS_MIN_OPACITY=.82;
export function neutralGlassOpacity(value){return Math.min(1,Math.max(NEUTRAL_GLASS_MIN_OPACITY,typeof value==='number'&&Number.isFinite(value)?value:NEUTRAL_GLASS_MIN_OPACITY))}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const luminance=values=>values.map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
export function neutralContrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
// Preserve an explicit business color and its existing ink, protecting both backdrop extremes.
export function protectedZoneFill(color,ink,opacity){
 if(!/^#[a-f\d]{6}$/i.test(color)||!/^#[a-f\d]{6}$/i.test(ink))return '';
 const base=rgb(color),text=rgb(ink);let alpha=neutralGlassOpacity(opacity);
 while(alpha<1&&[0,255].some(bg=>neutralContrast(text,base.map(v=>v*alpha+bg*(1-alpha)))<4.5))alpha=Math.min(1,Math.round((alpha+.01)*100)/100);
 return `rgba(${base.join(',')},${alpha})`;
}
