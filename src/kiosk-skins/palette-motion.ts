import {kioskPalettes,type KioskPalette} from './kiosk-recipes'
import {posBrandPair} from '../pos-domain'
import type {KioskAppearance} from '../../netlify/lib/kiosk-skins.mjs'
import {readableGlassMaterial} from '../../shared/glass-material.mjs'

// The persisted appearance schema stays unchanged. Infer a selected palette from its
// four canonical colors; customized surfaces continue to win over palette defaults.
export function selectedKioskPalette(appearance:KioskAppearance):KioskPalette|undefined{
 const same=(a:string,b:string)=>a.toLowerCase()===b.toLowerCase()
 return kioskPalettes.find(p=>same(appearance.primary,p.primary)&&same(appearance.secondary,p.secondary)&&same(appearance.gradientFrom,p.from)&&same(appearance.gradientTo,p.to))
}

const foreground=(color:string)=>posBrandPair(color).foreground

// Each of the six swatches has a distinct visual function:
// 1 backdrop, 2 card tint, 3 large panels, 4 actions, 5 highlights, 6 rim/glow.
// Accessible text is independently derived from the surface instead of assuming
// that the sixth color is always readable on the third.
export function kioskPaletteVariables(palette:KioskPalette,alpha=.76):Record<string,string>{
 const [background,card,panel,action,highlight,edge]=palette.swatches
 const glass=readableGlassMaterial(panel,alpha)
 return {
  '--wf-palette-1':background,
  '--wf-palette-2':card,
  '--wf-palette-3':panel,
  '--wf-palette-4':action,
  '--wf-palette-5':highlight,
  '--wf-palette-6':edge,
  '--wf-palette-panel-ink':foreground(panel),
  '--wf-palette-card-ink':foreground(card),
  '--wf-palette-action-ink':foreground(action),
  '--wf-palette-glass-fill':glass.fill,'--wf-palette-glass-ink':glass.ink,'--wf-palette-glass-color':glass.color,
 }
}

export const kioskPaletteVariableNames=[
 '--wf-palette-1','--wf-palette-2','--wf-palette-3',
 '--wf-palette-4','--wf-palette-5','--wf-palette-6',
 '--wf-palette-panel-ink','--wf-palette-card-ink','--wf-palette-action-ink',
 '--wf-palette-glass-fill','--wf-palette-glass-ink','--wf-palette-glass-color',
] as const
