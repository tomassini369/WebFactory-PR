import type {CSSProperties} from 'react'
import {templateVisualStyle, type TemplateConfig} from './templateData'
import {templateButtonInk} from './templateVisual'
import {normalizeTemplateOverrides} from '../shared/template-overrides.mjs'

type Design={style?:string;primary?:string;secondary?:string;templateOverrides?:string[]}
export function templateAppearance(template?:TemplateConfig,design:Design={}) {
  const overrides=normalizeTemplateOverrides(design.templateOverrides)
  const choose=(field:'primary'|'secondary',base:string)=>{
    const custom=design[field]
    return (!template||overrides.includes(field))&&custom&&/^#[a-f\d]{6}$/i.test(custom)?custom:base
  }
  const primary=choose('primary',template?.dark||'#0B1529')
  const accent=choose('secondary',template?.accent||'#3C86F6')
  const cream=template?.cream||'#F3F6FB'
  const accent2=template?.accent2||'#4D96F3'
  const style=(!template||overrides.includes('style'))?design.style?.toLowerCase():undefined
  const visualStyle=style&&['modern','luxury','minimal','bold'].includes(style)?style:template?templateVisualStyle(template.category):'modern'
  const styles={
    '--template-accent':accent,
    '--template-button-ink':templateButtonInk(accent),
    '--template-accent-2':accent2,
    '--template-dark':primary,
    '--template-dark-ink':templateButtonInk(primary),
    '--template-cream-ink':templateButtonInk(cream),
    '--template-cream':cream,
    '--cs-primary':primary,
    '--cs-accent':accent,
  } as CSSProperties
  return {primary,accent,accent2,cream,visualStyle,styles}
}
