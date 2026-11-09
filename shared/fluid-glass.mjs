// Percent of lens normalization size; the installed renderer supports strength 0–0.5.
export const FLUID_GLASS_DISTORTION_DEFAULT = 10;
export const FLUID_GLASS_DISTORTION_MAX = 50;
export function validFluidGlassDistortion(value){return Number.isInteger(value)&&value>=0&&value<=FLUID_GLASS_DISTORTION_MAX}
export function fluidGlassDistortion(value){return typeof value==='number'&&Number.isFinite(value)?Math.round(Math.max(0,Math.min(FLUID_GLASS_DISTORTION_MAX,value))):FLUID_GLASS_DISTORTION_DEFAULT}
