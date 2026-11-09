// Declarative whitelist shared by the browser and API; no executable tenant styles.
export const GLASS_OPTIC_CONTROLS = Object.freeze([{"key": "depth", "min": 0, "max": 1, "step": 0.01, "defaultValue": 0.5, "es": "Profundidad óptica", "en": "Optical depth"}, {"key": "curvature", "min": 0, "max": 1, "step": 0.01, "defaultValue": 0.3, "es": "Curvatura", "en": "Curvature"}, {"key": "bend", "min": 0, "max": 1, "step": 0.01, "defaultValue": 0.45, "es": "Deformación del borde", "en": "Edge bending"}, {"key": "bendWidth", "min": 0.001, "max": 0.5, "step": 0.001, "defaultValue": 0.16, "es": "Anchura del borde óptico", "en": "Optical edge width"}, {"key": "sheen", "min": 0, "max": 2, "step": 0.01, "defaultValue": 0.32, "es": "Intensidad del reflejo", "en": "Sheen intensity"}, {"key": "sheenWidth", "min": 0, "max": 10, "step": 0.1, "defaultValue": 3, "es": "Anchura del reflejo", "en": "Sheen width"}, {"key": "sheenFalloff", "min": 0.1, "max": 5, "step": 0.1, "defaultValue": 1.5, "es": "Caída del reflejo", "en": "Sheen falloff"}, {"key": "sheenAngle", "min": -360, "max": 360, "step": 1, "defaultValue": 45, "es": "Ángulo de iluminación", "en": "Lighting angle"}, {"key": "specular", "min": 0, "max": 3, "step": 0.01, "defaultValue": 1, "es": "Brillo especular", "en": "Specular highlight"}, {"key": "glow", "min": 0, "max": 1, "step": 0.01, "defaultValue": 0.1, "es": "Resplandor interior", "en": "Inner glow"}, {"key": "glowSpread", "min": 0.01, "max": 2, "step": 0.01, "defaultValue": 1, "es": "Extensión del resplandor", "en": "Glow spread"}, {"key": "glowFalloff", "min": 0.1, "max": 5, "step": 0.1, "defaultValue": 0.5, "es": "Caída del resplandor", "en": "Glow falloff"}, {"key": "brightness", "min": -1, "max": 1, "step": 0.01, "defaultValue": 0, "es": "Velo de iluminación", "en": "Lighting veil"}, {"key": "frost", "min": 0, "max": 1, "step": 0.01, "defaultValue": 0.08, "es": "Esmerilado", "en": "Frost"}, {"key": "saturation", "min": 0, "max": 200, "step": 1, "defaultValue": 115, "es": "Saturación del cristal", "en": "Glass saturation"}, {"key": "dispersion", "min": 0, "max": 100, "step": 1, "defaultValue": 50, "es": "Dispersión cromática", "en": "Chromatic dispersion"}, {"key": "aberrationIntensity", "min": 0, "max": 2, "step": 0.01, "defaultValue": 0.12, "es": "Intensidad cromática", "en": "Chromatic intensity"}, {"key": "tintAlpha", "min": 0, "max": 1, "step": 0.01, "defaultValue": 0.08, "es": "Intensidad del tinte", "en": "Tint intensity"}, {"key": "liquidSpeed", "min": 0, "max": 3, "step": 0.05, "defaultValue": 1, "es": "Velocidad de ondulación", "en": "Ripple speed"}, {"key": "liquidScale", "min": 0, "max": 3, "step": 0.05, "defaultValue": 1, "es": "Amplitud de ondulación", "en": "Ripple amplitude"}].map(Object.freeze));
export const GLASS_OPTIC_CHOICES=Object.freeze({material:['clear','frosted','smoked','subtle'],liquid:['off','ripple','flow','wobble'],quality:['auto','low','standard','high','extreme']});
export function normalizeGlassOptics(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return {};
 const result={};
 for(const c of GLASS_OPTIC_CONTROLS){const v=input[c.key];if(typeof v==='number'&&Number.isFinite(v))result[c.key]=Math.round(Math.min(c.max,Math.max(c.min,v))*1000)/1000}
 for(const [key,values] of Object.entries(GLASS_OPTIC_CHOICES))if(values.includes(input[key]))result[key]=input[key];
 if(typeof input.tint==='string'&&/^#[a-f\d]{6}$/i.test(input.tint))result.tint=input.tint;
 return result;
}
export function validGlassOptics(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 return Object.entries(input).every(([key,value])=>{
  const c=GLASS_OPTIC_CONTROLS.find(c=>c.key===key);
  if(c)return typeof value==='number'&&Number.isFinite(value)&&value>=c.min&&value<=c.max;
  if(key==='tint')return typeof value==='string'&&/^#[a-f\d]{6}$/i.test(value);
  return Object.hasOwn(GLASS_OPTIC_CHOICES,key)&&GLASS_OPTIC_CHOICES[key].includes(value);
 });
}

const materialDefaults={clear:{frost:0,saturation:115,aberrationIntensity:.12,tintAlpha:.08},frosted:{frost:.25,saturation:110,aberrationIntensity:.03,tintAlpha:.3},smoked:{frost:.1,saturation:90,aberrationIntensity:.04,tintAlpha:.35},subtle:{frost:.04,saturation:105,aberrationIntensity:0,tintAlpha:.06}};
export function glassOpticValue(input,key){return input[key]??(input.material?materialDefaults[input.material]?.[key]:undefined)??GLASS_OPTIC_CONTROLS.find(c=>c.key===key)?.defaultValue??0}
export function glassRendererOptions(input,distortion,motion=true){
 const optics=normalizeGlassOptics(input),lensKeys=['depth','curvature','bend','bendWidth','sheen','sheenWidth','sheenFalloff','sheenAngle','specular','glow','glowSpread','glowFalloff','brightness'];
 const hex=optics.tint||(optics.material==='smoked'?'#141820':'#ffffff');
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 return {material:optics.material||'clear',lensProfile:'material',lensOptions:{...Object.fromEntries(lensKeys.filter(k=>Object.hasOwn(optics,k)).map(k=>[k,optics[k]])),strength:distortion/100},
  frost:optics.frost??(optics.material?undefined:.08),
  glassColor:optics.tint||optics.tintAlpha!==undefined?`rgba(${rgb.join(',')},${glassOpticValue(optics,'tintAlpha')})`:(optics.material?undefined:'rgba(255,255,255,0.08)'),
  saturation:optics.saturation,dispersion:optics.dispersion,aberrationIntensity:optics.aberrationIntensity,
  liquid:motion&&optics.liquid&&optics.liquid!=='off'?optics.liquid:false,liquidSpeed:optics.liquidSpeed??1,liquidScale:optics.liquidScale??1,
  autodetectquality:optics.quality==='auto',quality:optics.quality&&optics.quality!=='auto'?optics.quality:undefined};
}

// Offscreen lenses report paused: retain a successfully observed capability.
export function svgMotionCapability(previous,strategies){if(strategies.includes('svg'))return true;if(strategies.includes('webgl'))return false;return previous}
