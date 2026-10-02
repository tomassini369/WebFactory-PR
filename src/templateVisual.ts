/** Choose the more readable neutral text for a client's hex accent color. */
export function templateButtonInk(accent:string){
 const raw=accent.replace('#','');const hex=raw.length===3?raw.split('').map(c=>c+c).join(''):raw;
 if(!/^[0-9a-f]{6}$/i.test(hex))return '#fff';
 const channels=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 const luminance=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
 return (luminance+.05)/.05 >= 1.05/(luminance+.05)?'#000':'#fff';
}
