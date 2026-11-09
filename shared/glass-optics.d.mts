export type GlassOpticNumber='depth'|'curvature'|'bend'|'bendWidth'|'sheen'|'sheenWidth'|'sheenFalloff'|'sheenAngle'|'specular'|'glow'|'glowSpread'|'glowFalloff'|'brightness'|'frost'|'saturation'|'dispersion'|'aberrationIntensity'|'tintAlpha'|'liquidSpeed'|'liquidScale';
export type GlassOptics=Partial<Record<GlassOpticNumber,number>>&{material?:'clear'|'frosted'|'smoked'|'subtle';liquid?:'off'|'ripple'|'flow'|'wobble';quality?:'auto'|'low'|'standard'|'high'|'extreme';tint?:string};
export const GLASS_OPTIC_CONTROLS:ReadonlyArray<{key:GlassOpticNumber;min:number;max:number;step:number;defaultValue:number;es:string;en:string}>;
export function normalizeGlassOptics(input:unknown):GlassOptics;
export function validGlassOptics(input:unknown):boolean;
export function glassOpticValue(input:GlassOptics,key:GlassOpticNumber):number;
export function glassRendererOptions(input:GlassOptics,distortion:number,motion?:boolean):import('simple-liquid-glass').LiquidGlassProps;
export function svgMotionCapability(previous:boolean,strategies:string[]):boolean;
