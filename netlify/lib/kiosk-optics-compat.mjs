import {fluidGlassDistortion} from '../../shared/fluid-glass.mjs';
// Older shipped clients reject unknown appearance keys. Keep their wire shape.
const legacyAppearance=value=>{if(!value||typeof value!=='object')return value;const {glassDistortion,...legacy}=value;return legacy};
export function kioskOpticsResponse(data,supported){
 if(supported)return data;
 return {...data,...(data.appearance?{appearance:legacyAppearance(data.appearance)}:{}),...(Array.isArray(data.presets)?{presets:data.presets.map(p=>({...p,appearance:legacyAppearance(p.appearance)}))}:{}),...(data.presentation?.appearance?{presentation:{...data.presentation,appearance:legacyAppearance(data.presentation.appearance)}}:{})};
}
// Run against the current CAS snapshot, not the earlier admin GET snapshot.
export function preserveKioskDistortion(input,previous){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.hasOwn(input,'glassDistortion'))return input;
 return {...input,glassDistortion:fluidGlassDistortion(previous?.glassDistortion)};
}
export function preservePresetDistortions(input,previous){
 if(!Array.isArray(input))return input;
 return input.map(p=>!p||typeof p!=='object'||Array.isArray(p)?p:{...p,appearance:preserveKioskDistortion(p.appearance,Array.isArray(previous)?previous.find(old=>old.id===p.id)?.appearance:undefined)});
}
