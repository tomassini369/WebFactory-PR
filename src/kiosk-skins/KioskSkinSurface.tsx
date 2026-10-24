import {type CSSProperties,type HTMLAttributes} from 'react'
import {kioskAppearance,kioskSkins} from '../../netlify/lib/kiosk-skins.mjs'
import {posBrandPair} from '../pos-domain'
import '../kiosk.css'
import './skins.css'
import {useKioskAsset} from './KioskAssets'
const fonts={native:'ui-sans-serif,system-ui,sans-serif',humanist:'Calibri,Candara,Segoe UI,system-ui,sans-serif',rounded:'ui-rounded,system-ui,sans-serif'}
// The registry selects only bundled layouts; tenant data never selects modules or CSS.
export function KioskSkinSurface({appearance,primary,secondary,siteId='',preview=false,children,...events}:Omit<HTMLAttributes<HTMLElement>,'style'|'className'> & {appearance?:unknown;primary?:string;secondary?:string;siteId?:string;preview?:boolean}){
 const config=kioskAppearance(appearance,siteId||undefined),skin=kioskSkins.find(s=>s.id===config.skinId)!,brand=posBrandPair(config.secondary||secondary||''),asset=useKioskAsset()
 const safePrimary=config.primary||(/^#[a-f0-9]{6}$/i.test(primary||'')?primary:'#0b1529')
 const style={'--kiosk-primary':safePrimary,'--kiosk-brand':brand.background,'--kiosk-brand-ink':brand.foreground,'--skin-font':fonts[config.font],...Object.fromEntries((['header','card','cart'] as const).flatMap(zone=>{const color=config[`${zone}Color`];return color?[[`--zone-${zone}`,color],[`--zone-${zone}-ink`,posBrandPair(color).foreground]]:[]}))} as CSSProperties
 let backgroundImage=''
 if(config.colorMode==='gradient')backgroundImage=`linear-gradient(${config.gradientAngle}deg,${config.gradientFrom},${config.gradientTo})`
 if(config.colorMode==='pattern')backgroundImage=config.pattern==='dots'?`radial-gradient(${config.gradientTo} 1px,${config.gradientFrom} 1px)`:config.pattern==='diagonal'?`repeating-linear-gradient(135deg,${config.gradientFrom} 0px,${config.gradientFrom} 12px,${config.gradientTo} 12px,${config.gradientTo} 14px)`:`repeating-radial-gradient(ellipse at 0 0,${config.gradientFrom} 0px,${config.gradientFrom} 36px,${config.gradientTo} 37px,${config.gradientFrom} 39px)`
 if(config.colorMode==='image'&&config.backgroundAssetKey&&siteId)backgroundImage=`url("${asset(siteId,config.backgroundAssetKey)}")`
 const Tag=preview?'div':'main'
 return <Tag {...events} className={`wf-kiosk${preview?' kiosk-appearance-preview':''}`} data-skin={skin.id} data-skin-version={skin.version} data-layout={skin.layout} data-layout-override={config.layout} data-finish={config.finish} data-color-mode={config.colorMode} data-density={config.density} data-header-custom={Boolean(config.headerColor)} data-card-custom={Boolean(config.cardColor)} data-cart-custom={Boolean(config.cartColor)} data-font={config.font} data-buttons={config.buttons} data-cards={config.cards} data-background={config.background} data-motion={config.motion} style={style}>{backgroundImage&&<div className="kiosk-backdrop" aria-hidden="true"><div className="kiosk-backdrop-art" style={{backgroundImage,inset:config.colorMode==='image'&&config.imageBlur>0?'-24px':undefined,backgroundSize:config.colorMode==='pattern'&&config.pattern==='dots'?'24px 24px':config.colorMode==='image'?config.imageFit:undefined,backgroundPosition:`${config.imageX}% ${config.imageY}%`,backgroundRepeat:config.colorMode==='image'?'no-repeat':undefined,filter:config.colorMode==='image'?`blur(${config.imageBlur}px)`:undefined}}/>{config.colorMode==='image'&&<div className="kiosk-backdrop-shade" style={{backgroundColor:config.overlayColor,opacity:config.overlayOpacity/100}}/>}</div>}{children}</Tag>
}
export function KioskWelcome({appearance,lang}:{appearance?:unknown;lang:'es'|'en'}){const c=kioskAppearance(appearance);return c.welcome==='none'?null:<section className="kiosk-welcome" data-welcome={c.welcome}><h2>{c.welcomeText||(lang==='es'?'Bienvenido. Escoge a tu gusto.':'Welcome. Make yourself at home.')}</h2></section>}
