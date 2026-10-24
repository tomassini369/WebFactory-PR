import {type CSSProperties,type HTMLAttributes} from 'react'
import {kioskAppearance,kioskSkins} from '../../netlify/lib/kiosk-skins.mjs'
import {posBrandPair} from '../pos-domain'
import '../kiosk.css'
import './skins.css'
const fonts={native:'ui-sans-serif,system-ui,sans-serif',humanist:'Calibri,Candara,Segoe UI,system-ui,sans-serif',rounded:'ui-rounded,system-ui,sans-serif'}
// The registry selects only bundled layouts; tenant data never selects modules or CSS.
export function KioskSkinSurface({appearance,primary,secondary,preview=false,children,...events}:Omit<HTMLAttributes<HTMLElement>,'style'|'className'> & {appearance?:unknown;primary?:string;secondary?:string;preview?:boolean}){
 const config=kioskAppearance(appearance),skin=kioskSkins.find(s=>s.id===config.skinId)!,brand=posBrandPair(config.secondary||secondary||'')
 const safePrimary=config.primary||(/^#[a-f0-9]{6}$/i.test(primary||'')?primary:'#0b1529')
 const style={'--kiosk-primary':safePrimary,'--kiosk-brand':brand.background,'--kiosk-brand-ink':brand.foreground,'--skin-font':fonts[config.font]} as CSSProperties
 const Tag=preview?'div':'main'
 return <Tag {...events} className={`wf-kiosk${preview?' kiosk-appearance-preview':''}`} data-skin={skin.id} data-skin-version={skin.version} data-layout={skin.layout} data-font={config.font} data-buttons={config.buttons} data-cards={config.cards} data-background={config.background} data-motion={config.motion} style={style}>{children}</Tag>
}
