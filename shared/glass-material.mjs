const channels=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);

// Preserve the actual palette RGB. Raise opacity only as far as needed to keep
// its foreground readable over either extreme of an arbitrary photograph.
export function readableGlassMaterial(color,requestedAlpha){
 const rgb=channels(color),foreground=luminance(rgb)>.179?[0,0,0]:[255,255,255];
 let alpha=Math.max(.2,Math.min(1,Number.isFinite(requestedAlpha)?requestedAlpha:.66));
 const target=Math.min(4.6,contrast(foreground,rgb));
 const readable=()=>[0,255].every(background=>contrast(foreground,rgb.map(v=>v*alpha+background*(1-alpha)))>=target);
 while(alpha<1&&!readable())alpha=Math.min(1,alpha+.005);
 // Round upward, so serialization cannot weaken a boundary contrast result.
 alpha=Math.ceil(alpha*1000)/1000;
 return {color,ink:foreground[0]===0?'#000000':'#FFFFFF',alpha,fill:`rgba(${rgb.join(',')},${alpha})`};
}
