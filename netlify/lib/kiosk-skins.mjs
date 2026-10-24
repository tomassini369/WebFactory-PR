// Data only: no URLs, CSS strings, scripts, provider settings or executable skins.
export const kioskSkins = Object.freeze([
  {id:'classic',version:1,name:'Classic',layout:'classic',es:'Diseño original de WebFactory.',en:'Original WebFactory design.'},
  {id:'glass-premium',version:1,name:'Glass Premium',layout:'glass',es:'Cristal en la cabecera y la orden; catálogo despejado.',en:'Glass header and order panel; clear catalog.'},
  {id:'restaurant-touch',version:1,name:'Restaurant Touch',layout:'menu',es:'Fotos amplias y categorías siempre a mano.',en:'Large photos and readily accessible categories.'},
  {id:'barber-luxury',version:1,name:'Barber Luxury',layout:'services',es:'Servicios en lista y acceso destacado a citas habilitadas.',en:'Service list and prominent access to enabled appointments.'},
  {id:'retail-minimal',version:1,name:'Retail Minimal',layout:'compact',es:'Catálogo compacto para escoger productos rápidamente.',en:'Compact catalog for quick product selection.'},
].map(s=>Object.freeze({...s,coreVersion:1,capabilities:Object.freeze(['catalog','cart','checkout','bookings','receipt','session'])})));
const defaults=()=>({skinId:'classic',version:1,primary:'',secondary:'',font:'native',buttons:'original',cards:'original',background:'brand',motion:'subtle'});
const choices={font:['native','humanist','rounded'],buttons:['original','square','rounded'],cards:['original','square','soft'],background:['brand','neutral'],motion:['subtle','none']};
export function validateKioskAppearance(input){
  const fail=()=>{throw Object.assign(new Error('Invalid kiosk appearance / Apariencia del kiosco inválida.'),{status:400})};
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!Object.hasOwn(defaults(),key)))return fail();
  const next={...defaults(),...input};
  if(!kioskSkins.some(s=>s.id===next.skinId&&s.version===next.version))return fail();
  for(const key of ['primary','secondary'])if(typeof next[key]!=='string'||next[key]!==''&&!/^#[\da-f]{6}$/i.test(next[key]))return fail();
  for(const [key,values] of Object.entries(choices))if(!values.includes(next[key]))return fail();
  return next;
}
export function kioskAppearance(input){try{return validateKioskAppearance(input)}catch{return defaults()}}
