export type DashboardAppearance={paletteId:string;background:string;backgroundNatural:boolean;glassStyle:'classic'|'liquid';cardDepth:'flat'|'soft'|'raised';buttonDepth:'flat'|'soft'|'raised';blur:number;alpha:number;dim:number;motion:number;accent:string}
export const DEFAULT_APPEARANCE: Readonly<DashboardAppearance>
export const DASHBOARD_WALLPAPERS:ReadonlyArray<{id:string;nameEs:string;nameEn:string;src:string;download:string}>
export function normalizeAppearance(input?:unknown):DashboardAppearance
