import {useLayoutEffect,useRef,type CSSProperties,type HTMLAttributes} from 'react'
import {animate} from 'animejs'
import {selectedKioskPalette,kioskPaletteVariables,kioskPaletteVariableNames} from './palette-motion'
import {kioskAppearance,kioskSkins} from '../../netlify/lib/kiosk-skins.mjs'
import {posBrandPair} from '../pos-domain'
import {DASHBOARD_WALLPAPERS} from '../../shared/dashboard-appearance.mjs'
import '../kiosk.css'
import './skins.css'
import '../glassy-dashboard/sales-material.css'
import {useKioskAsset} from './KioskAssets'
const fonts={native:'ui-sans-serif,system-ui,sans-serif',humanist:'Calibri,Candara,Segoe UI,system-ui,sans-serif',rounded:'ui-rounded,system-ui,sans-serif'}
// The registry selects only bundled layouts; tenant data never selects modules or CSS.
export function KioskSkinSurface({appearance,primary,secondary,siteId='',preview=false,children,...events}:Omit<HTMLAttributes<HTMLElement>,'style'|'className'> & {appearance?:unknown;primary?:string;secondary?:string;siteId?:string;preview?:boolean}){
 const config=kioskAppearance(appearance,siteId||undefined),skin=kioskSkins.find(s=>s.id===config.skinId)!,brand=posBrandPair(config.secondary||secondary||''),asset=useKioskAsset()
 const palette=selectedKioskPalette(config),rootRef=useRef<HTMLElement|null>(null)
 const animationRef=useRef<ReturnType<typeof animate>|null>(null),previousPalette=useRef<string|null>(null),readyRef=useRef(false)
 const savedColors=useRef({background:'#0b1529',surface:'#172334',accent:'#285fa6'})
 useLayoutEffect(()=>{
  const root=rootRef.current
  if(!root)return
  animationRef.current?.cancel()
  animationRef.current=null
  if(!palette){
   kioskPaletteVariableNames.forEach(name=>root.style.removeProperty(name))
   previousPalette.current=null
   readyRef.current=true
   const css=getComputedStyle(root)
   const panel=root.querySelector('.kiosk-cart,.kiosk-catalog')
   const button=root.querySelector('.kiosk-primary,.kiosk-add')
   savedColors.current={background:css.backgroundColor||'#0b1529',surface:panel?getComputedStyle(panel).backgroundColor:'#172334',accent:button?getComputedStyle(button).backgroundColor:'#285fa6'}
   return
  }
  const tokens=kioskPaletteVariables(palette)
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches||config.motion==='none'
  if(!readyRef.current||reduce){
   Object.entries(tokens).forEach(([name,value])=>root.style.setProperty(name,value))
  }else{
   // The first selection also animates: seed palette variables with the colors
   // of the existing live kiosk, then interpolate to the selected six swatches.
   if(!previousPalette.current){
    const {background,surface,accent}=savedColors.current
    const seed=[background,surface,surface,accent,surface,accent]
    for(let i=1;i<=6;i++)root.style.setProperty(`--wf-palette-${i}`,seed[i-1])
    const text=getComputedStyle(root).color||'#ffffff'
    for(const key of ['--wf-palette-panel-ink','--wf-palette-card-ink','--wf-palette-action-ink'])root.style.setProperty(key,text)
   }
   animationRef.current=animate(root,{...tokens,duration:420,ease:'inOutQuad'})
  }
  previousPalette.current=palette.id
  readyRef.current=true
  return()=>{animationRef.current?.cancel();animationRef.current=null}
 },[palette?.id,config.motion])
 const safePrimary=config.primary||(/^#[a-f0-9]{6}$/i.test(primary||'')?primary:'#0b1529')
 const style={'--glass-opacity':`${config.glassOpacity}%`,'--glass-blur':`${config.glassBlur}px`,...(palette?{}:{'--kiosk-primary':safePrimary,'--kiosk-brand':brand.background,'--kiosk-brand-ink':brand.foreground}),'--skin-font':fonts[config.font],...Object.fromEntries((['header','card','cart'] as const).flatMap(zone=>{const color=config[`${zone}Color`];return color?[[`--zone-${zone}`,color],[`--zone-${zone}-ink`,posBrandPair(color).foreground]]:[]}))} as CSSProperties
 let backgroundImage=''
 if(config.colorMode==='gradient')backgroundImage=palette?`linear-gradient(${config.gradientAngle}deg,var(--wf-palette-1),var(--wf-palette-2) 46%,var(--wf-palette-3))`:`linear-gradient(${config.gradientAngle}deg,${config.gradientFrom},${config.gradientTo})`
 if(config.colorMode==='pattern')backgroundImage=config.pattern==='dots'?`radial-gradient(${config.gradientTo} 1px,${config.gradientFrom} 1px)`:config.pattern==='diagonal'?`repeating-linear-gradient(135deg,${config.gradientFrom} 0px,${config.gradientFrom} 12px,${config.gradientTo} 12px,${config.gradientTo} 14px)`:`repeating-radial-gradient(ellipse at 0 0,${config.gradientFrom} 0px,${config.gradientFrom} 36px,${config.gradientTo} 37px,${config.gradientFrom} 39px)`
 if(config.colorMode==='image'&&config.backgroundAssetKey&&siteId)backgroundImage=`url("${asset(siteId,config.backgroundAssetKey)}")`
 if(!backgroundImage&&config.wallpaper!=='none')backgroundImage=`url("${DASHBOARD_WALLPAPERS.find(w=>w.id===config.wallpaper)?.src||DASHBOARD_WALLPAPERS[0].src}")`;
 const Tag=preview?'div':'main'
 return <Tag {...events} ref={node=>{rootRef.current=node}} data-palette-active={Boolean(palette)} data-card-depth={config.cardDepth} data-button-depth={config.buttonDepth} className={`wf-kiosk gd-sales${preview?' kiosk-appearance-preview':''}`} data-skin={skin.id} data-skin-version={skin.version} data-layout={skin.layout} data-layout-override={config.layout} data-finish={config.finish} data-glass={true} data-color-mode={config.colorMode} data-density={config.density} data-header-custom={Boolean(config.headerColor)} data-card-custom={Boolean(config.cardColor)} data-cart-custom={Boolean(config.cartColor)} data-font={config.font} data-buttons={config.buttons} data-cards={config.cards} data-background={config.background} data-motion={config.motion} style={style}>{backgroundImage&&<div className="kiosk-backdrop" aria-hidden="true"><div className="kiosk-backdrop-art" style={{backgroundImage,inset:config.colorMode==='image'&&config.imageBlur>0?'-24px':undefined,backgroundSize:config.colorMode==='pattern'&&config.pattern==='dots'?'24px 24px':config.colorMode==='image'?config.imageFit:config.colorMode==='solid'?'cover':undefined,backgroundPosition:`${config.imageX}% ${config.imageY}%`,backgroundRepeat:config.colorMode==='image'?'no-repeat':undefined,filter:config.colorMode==='image'?`blur(${config.imageBlur}px)`:undefined}}/>{(config.colorMode==='image'||config.colorMode==='solid')&&<div className="kiosk-backdrop-shade" style={{backgroundColor:config.overlayColor,opacity:config.overlayOpacity/100}}/>}</div>}{children}</Tag>
}
export function KioskWelcome({appearance,lang}:{appearance?:unknown;lang:'es'|'en'}){const c=kioskAppearance(appearance);return c.welcome==='none'?null:<section className="kiosk-welcome" data-welcome={c.welcome}><h2>{c.welcomeText||(lang==='es'?'Bienvenido. Escoge a tu gusto.':'Welcome. Make yourself at home.')}</h2></section>}
