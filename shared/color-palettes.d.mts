export type ColorPalette={id:string;name:string;primary:string;secondary:string;from:string;to:string;swatches:readonly [string,string,string,string,string,string]}
export const colorPalettes:ReadonlyArray<ColorPalette>
export function findColorPalette(id:unknown):ColorPalette|undefined
