import type {GlassOptics} from './glass-optics.mjs'
export type DashboardAppearance={glassOptics:GlassOptics;paletteId:string;background:string;backgroundNatural:boolean;glassStyle:'classic'|'liquid';glassDistortion:number;cardDepth:'flat'|'soft'|'raised';buttonDepth:'flat'|'soft'|'raised';blur:number;alpha:number;dim:number;motion:number;accent:string}
export const DEFAULT_APPEARANCE: Readonly<DashboardAppearance>
export const DASHBOARD_WALLPAPERS:ReadonlyArray<{id:string;nameEs:string;nameEn:string;src:string;download:string}>
export function normalizeAppearance(input?:unknown):DashboardAppearance
export type DashboardPreset={id:string;name:string;appearance:DashboardAppearance};
export function validateDashboardPresets(input:unknown):DashboardPreset[];
