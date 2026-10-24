export type KioskAppearance={skinId:string;version:number;primary:string;secondary:string;font:'native'|'humanist'|'rounded';buttons:'original'|'square'|'rounded';cards:'original'|'square'|'soft';background:'brand'|'neutral';motion:'subtle'|'none'};
export const kioskSkins:ReadonlyArray<{id:string;version:number;name:string;layout:string;es:string;en:string;coreVersion:number;capabilities:ReadonlyArray<string>}>;
export function validateKioskAppearance(input:unknown):KioskAppearance;
export function kioskAppearance(input?:unknown):KioskAppearance;
