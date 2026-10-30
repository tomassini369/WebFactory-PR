// Data only: no URLs, CSS strings, scripts, provider settings or executable skins.
export const kioskSkins = Object.freeze([
  {id:'classic',version:1,name:'Classic',layout:'classic',es:'Diseño original de WebFactory.',en:'Original WebFactory design.'},
  {id:'glass-premium',version:1,name:'Glass Premium',layout:'glass',es:'Paneles de cristal para ver el fondo del kiosco.',en:'Glass panels reveal the kiosk background.'},
  {id:'restaurant-touch',version:1,name:'Restaurant Touch',layout:'menu',es:'Fotos amplias y categorías siempre a mano.',en:'Large photos and readily accessible categories.'},
  {id:'barber-luxury',version:1,name:'Barber Luxury',layout:'services',es:'Servicios en lista y acceso destacado a citas habilitadas.',en:'Service list and prominent access to enabled appointments.'},
  {id:'retail-minimal',version:1,name:'Retail Minimal',layout:'compact',es:'Catálogo compacto para escoger productos rápidamente.',en:'Compact catalog for quick product selection.'},
].map(s=>Object.freeze({...s,coreVersion:1,capabilities:Object.freeze(['catalog','cart','checkout','bookings','receipt','session'])})));
const defaults=()=>({skinId:'classic',version:1,primary:'',secondary:'',font:'native',buttons:'original',cards:'original',background:'brand',motion:'subtle',layout:'skin',finish:'original',glassStyle:'classic',glassPalette:true,backgroundNatural:false,glassOpacity:76,glassBlur:8,colorMode:'solid',gradientFrom:'#14243d',gradientTo:'#526b91',gradientAngle:135,pattern:'waves',backgroundAssetKey:'',imageFit:'cover',imageX:50,imageY:50,imageBlur:0,overlayColor:'#0b1529',overlayOpacity:60,headerColor:'',cardColor:'',cartColor:'',welcome:'none',welcomeText:'',density:'comfortable',wallpaper:'room',cardDepth:'soft',buttonDepth:'soft'});
const choices={wallpaper:['room','landscape','waves','none'],cardDepth:['flat','soft','raised'],buttonDepth:['flat','soft','raised'],font:['native','humanist','rounded'],buttons:['original','square','rounded'],cards:['original','square','soft'],background:['brand','neutral'],motion:['subtle','none'],layout:['skin','split','gallery','list','compact'],finish:['original','matte','gloss','glass','metallic'],glassStyle:['classic','liquid'],colorMode:['solid','gradient','pattern','image'],pattern:['waves','dots','diagonal'],imageFit:['cover','contain'],welcome:['none','banner','hero'],density:['comfortable','spacious']};
export const kioskBackgroundLimit=8;
export function kioskBackgroundKey(key,siteId){return typeof key==='string'&&/^sites\/[a-zA-Z0-9_-]+\/kiosk-backgrounds\/[a-f\d-]{36}\.webp$/.test(key)&&(!siteId||key.startsWith(`sites/${siteId}/kiosk-backgrounds/`));}
export function validateKioskAppearance(input,siteId){
  const fail=()=>{throw Object.assign(new Error('Invalid kiosk appearance / Apariencia del kiosco inválida.'),{status:400})};
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!Object.hasOwn(defaults(),key)))return fail();
  const next={...defaults(),...input};
  if(!kioskSkins.some(s=>s.id===next.skinId&&s.version===next.version))return fail();
  for(const key of ['primary','secondary','headerColor','cardColor','cartColor','gradientFrom','gradientTo','overlayColor'])if(typeof next[key]!=='string'||next[key]!==''&&!/^#[\da-f]{6}$/i.test(next[key]))return fail();
  for(const key of ['gradientFrom','gradientTo','overlayColor'])if(!next[key])return fail();
  for(const [key,max] of Object.entries({gradientAngle:360,imageX:100,imageY:100,imageBlur:20,overlayOpacity:100}))if(!Number.isInteger(next[key])||next[key]<0||next[key]>max)return fail();
  if(typeof next.glassPalette!=='boolean'||typeof next.backgroundNatural!=='boolean'||!Number.isInteger(next.glassOpacity)||next.glassOpacity<25||next.glassOpacity>95||!Number.isInteger(next.glassBlur)||next.glassBlur<0||next.glassBlur>24)return fail();
  if(typeof next.welcomeText!=='string'||next.welcomeText.length>160||/[\u0000-\u001f<>]/.test(next.welcomeText))return fail();
  if(next.backgroundAssetKey!==''&&!kioskBackgroundKey(next.backgroundAssetKey,siteId))return fail();
  for(const [key,values] of Object.entries(choices))if(!values.includes(next[key]))return fail();
  return next;
}
export function kioskAppearance(input,siteId){try{return validateKioskAppearance(input,siteId)}catch{return defaults()}}
export function validateKioskPresets(input,siteId){
  if(!Array.isArray(input)||input.length>8)throw Object.assign(new Error('Maximum 8 saved designs / Máximo 8 diseños guardados.'),{status:400});
  const ids=new Set();return input.map(p=>{if(!p||Object.keys(p).some(k=>!['id','name','appearance'].includes(k))||typeof p.id!=='string'||!/^[a-z\d-]{1,60}$/i.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>50||/[\u0000-\u001f<>]/.test(p.name))throw Object.assign(new Error('Invalid saved design / Diseño guardado inválido.'),{status:400});ids.add(p.id);return {id:p.id,name:p.name.trim(),appearance:validateKioskAppearance(p.appearance,siteId)}});
}
export function kioskPresets(input,siteId){try{return validateKioskPresets(input||[],siteId)}catch{return []}}
