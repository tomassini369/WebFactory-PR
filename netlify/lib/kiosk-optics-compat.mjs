import {normalizeGlassOptics} from '../../shared/glass-optics.mjs';
import {fluidGlassDistortion} from '../../shared/fluid-glass.mjs';
// Older shipped clients reject unknown appearance keys. Keep their wire shape.
const legacyAppearance=(value,version)=>{if(!value||typeof value!=='object')return value;const {glassOptics,glassDistortion,...legacy}=value;return version>=1?{...legacy,glassDistortion}:legacy};
export function kioskOpticsResponse(data,supported){
 if(supported>=2)return data;
 return {...data,...(data.appearance?{appearance:legacyAppearance(data.appearance,Number(supported))}:{}),...(Array.isArray(data.presets)?{presets:data.presets.map(p=>({...p,appearance:legacyAppearance(p.appearance,Number(supported))}))}:{}),...(data.presentation?.appearance?{presentation:{...data.presentation,appearance:legacyAppearance(data.presentation.appearance,Number(supported))}}:{})};
}
// Run against the current CAS snapshot, not the earlier admin GET snapshot.
export function preserveKioskDistortion(input,previous){
 if(!input||typeof input!=='object'||Array.isArray(input))return input;
 return {...input,...(!Object.hasOwn(input,'glassDistortion')?{glassDistortion:fluidGlassDistortion(previous?.glassDistortion)}:{}),...(!Object.hasOwn(input,'glassOptics')?{glassOptics:normalizeGlassOptics(previous?.glassOptics)}:{})};
}
export function preservePresetDistortions(input,previous){
 if(!Array.isArray(input))return input;
 return input.map(p=>!p||typeof p!=='object'||Array.isArray(p)?p:{...p,appearance:preserveKioskDistortion(p.appearance,Array.isArray(previous)?previous.find(old=>old.id===p.id)?.appearance:undefined)});
}
