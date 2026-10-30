import type {ColorPalette} from '../shared/color-palettes.mjs'

type ColorMode='dark'|'light'
const parse=(hex:string)=>[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16))
const hex=(rgb:number[])=>'#'+rgb.map(v=>Math.min(255,Math.max(0,Math.round(v))).toString(16).padStart(2,'0')).join('')
const blend=(a:string,b:string,ratio:number)=>hex(parse(a).map((v,i)=>v*(1-ratio)+parse(b)[i]*ratio))
const ink=(color:string)=>{
 const linear=parse(color).map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4})
 const L=.2126*linear[0]+.7152*linear[1]+.0722*linear[2]
 return L>.179?'#111827':'#FFFFFF'
}

export {ink as swatchContrastInk}

// Derive accessible light and dark roles from the same six stable palette colors.
export function dashboardPaletteVariables(palette:ColorPalette,mode:ColorMode):Record<string,string>{
 const swatches=palette.swatches
 const colors=mode==='dark'?[...swatches]:[
  blend(swatches[4],'#FFFFFF',.66),
  blend(swatches[1],'#FFFFFF',.86),
  blend(swatches[2],'#FFFFFF',.86),
  swatches[3],swatches[4],swatches[5],
 ]
 const [background,card,panel,action,highlight,edge]=colors
 return {
  '--wf-theme-1':background,'--wf-theme-2':card,'--wf-theme-3':panel,
  '--wf-theme-4':action,'--wf-theme-5':highlight,'--wf-theme-6':edge,
  '--wf-theme-ink':ink(panel),'--wf-theme-card-ink':ink(card),
  '--wf-theme-action-ink':ink(action),
 }
}
export const dashboardPaletteKeys=[
 '--wf-theme-1','--wf-theme-2','--wf-theme-3',
 '--wf-theme-4','--wf-theme-5','--wf-theme-6',
 '--wf-theme-ink','--wf-theme-card-ink','--wf-theme-action-ink',
] as const
