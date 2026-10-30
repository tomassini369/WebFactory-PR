import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react'
import {DEFAULT_APPEARANCE,DASHBOARD_WALLPAPERS,normalizeAppearance,type DashboardAppearance} from '../../shared/dashboard-appearance.mjs'
import {colorPalettes,findColorPalette} from '../../shared/color-palettes.mjs'
import {dashboardPaletteVariables,dashboardPaletteKeys} from '../color-theme-motion'
import {useWebFactoryTheme} from '../theme'
import {animate} from 'animejs'
import {useUnsavedChanges} from '../interaction-state'
import {usePractice} from '../training/practice-context'
import {PortalProfileProvider} from './ProfileContext'
import './profile.css'
import './material.css'
import './dashboard.css'
import './sales-material.css'

type State={prefs:DashboardAppearance;setPrefs:(p:DashboardAppearance)=>void;hasCustom:boolean;busy:boolean;ready:boolean;error:string;notice:string;save:()=>Promise<void>;upload:(file:File)=>Promise<void>;reset:()=>Promise<void>;reload:()=>Promise<void>;asset:string;etag: string;savedEpoch:number}
const AppearanceContext=createContext<State|null>(null)
export function useOptionalDashboardAppearance(){return useContext(AppearanceContext)}
export function useDashboardAppearance(){const context=useContext(AppearanceContext);if(!context)throw new Error('Missing dashboard context');return context}
export function DashboardProvider({siteId,userId,children,lang='en',name=''}:{siteId?:string;userId:string;children:ReactNode;lang?:'es'|'en';name?:string}){
 const practice=usePractice(),{theme}=useWebFactoryTheme();const endpoint='/.netlify/functions/dashboard-appearance'+(siteId?'?siteId='+encodeURIComponent(siteId):'');
 const [prefs,setPrefs]=useState<DashboardAppearance>({...DEFAULT_APPEARANCE}),[hasCustom,setCustom]=useState(false),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0),[etag,setEtag]=useState(''),[savedEpoch,setSavedEpoch]=useState(0);
 const generation=useRef(0);useUnsavedChanges(prefs,savedEpoch,setPrefs,lang)
 const palette=findColorPalette(prefs.paletteId),rootRef=useRef<HTMLDivElement|null>(null)
 const paletteAnimation=useRef<ReturnType<typeof animate>|null>(null),paletteReady=useRef(false),previousPalette=useRef('')
 useLayoutEffect(()=>{
  const root=rootRef.current
  if(!root)return
  paletteAnimation.current?.cancel();paletteAnimation.current=null
  if(!palette){
   dashboardPaletteKeys.forEach(key=>root.style.removeProperty(key))
   previousPalette.current=''
   paletteReady.current=paletteReady.current||ready
   return
  }
  const tokens=dashboardPaletteVariables(palette,theme)
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches||prefs.motion<=0
  if(!paletteReady.current||!ready||reduce){
   Object.entries(tokens).forEach(([key,value])=>root.style.setProperty(key,value))
  }else{
   if(!previousPalette.current){
    const surface=theme==='dark'?'#29292e':'#f6f5f8'
    for(let i=1;i<=6;i++)root.style.setProperty(`--wf-theme-${i}`,surface)
    const prevInk=theme==='dark'?'#FFFFFF':'#17171c'
    for(const key of ['--wf-theme-ink','--wf-theme-card-ink','--wf-theme-action-ink'])root.style.setProperty(key,prevInk)
   }
   paletteAnimation.current=animate(root,{...tokens,duration:420,ease:'inOutQuad'})
  }
  previousPalette.current=palette.id
  paletteReady.current=paletteReady.current||ready
  return()=>{paletteAnimation.current?.cancel();paletteAnimation.current=null}
 },[palette?.id,theme,prefs.motion,ready])
 const readResponse=async(response:Response)=>{const data=await response.json();if(!response.ok)throw new Error(String(response.status));return {data,etag:typeof data.version==='string'?data.version:(response.headers.get('etag')||'').replace(/^W\//,'').replace(/^"|"$/g,'')}}
 const accept=(data:any,tag:string)=>{setPrefs(normalizeAppearance(data.prefs));setCustom(Boolean(data.hasCustom));setRevision(data.revision||0);setEtag(tag);setSavedEpoch(value=>value+1)}
 // Use the live same-origin transport only outside isolated training.
 const reload=async()=>{if(practice){setReady(true);return}setBusy(true);setError('');const g=++generation.current;try{const {data,etag:tag}=await readResponse(await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}));if(g===generation.current){accept(data,tag);setReady(true)}}catch{if(g===generation.current)setError('load')}finally{if(g===generation.current)setBusy(false)}}
 useEffect(()=>{void reload();return()=>{generation.current++}},[endpoint,userId,Boolean(practice)])
 const mutate=async(method:string,body?:BodyInit,type='application/json')=>{
  if(practice){setNotice('practice');return}if(!ready||busy)return;setBusy(true);setError('');setNotice('');
  try{const {data,etag:tag}=await readResponse(await fetch(endpoint,{method,credentials:'same-origin',headers:{'Content-Type':type,'X-Appearance-Version':etag},body}));accept(data,tag);setNotice('saved')}
  catch(e){setError(e instanceof Error&&e.message==='409'?'conflict':'save')}
  finally{setBusy(false)}
 }
 const asset=endpoint+(siteId?'&':'?')+'asset=1&v='+revision;
 const background=prefs.background==='custom'&&hasCustom?asset:(DASHBOARD_WALLPAPERS.find(x=>x.id===prefs.background)||DASHBOARD_WALLPAPERS[0]).src;
 const style={'--glass-blur':prefs.blur+'px','--glass-alpha':prefs.alpha,'--bg-dim':prefs.dim,'--motion':prefs.motion,...(palette?{}:{'--accent':prefs.accent})} as CSSProperties;
 return <AppearanceContext.Provider value={{prefs,setPrefs:value=>{setPrefs(value);setNotice('')},hasCustom,busy,ready,error,notice,etag,savedEpoch,save:()=>mutate('PUT',JSON.stringify(prefs)),upload:file=>mutate('POST',file,file.type),reset:()=>mutate('DELETE'),reload,asset}}><PortalProfileProvider key={userId} siteId={siteId} userId={userId} name={name}><div className="gd-root" ref={rootRef} data-palette-active={Boolean(palette)} style={style}><div className="gd-wallpaper" aria-hidden="true" style={{backgroundImage:`url(${JSON.stringify(background)})`}}/><div className="gd-shade" aria-hidden="true"/>{children}</div></PortalProfileProvider></AppearanceContext.Provider>
}
export function SalesAppearanceControls({lang,showSave=true}:{lang:'es'|'en';showSave?:boolean}){
 const a=useOptionalDashboardAppearance(),es=lang==='es';if(!a)return null;
 return <fieldset disabled={!a.ready||a.busy} className="gd-sales-editor"><legend>{es?'Diseño y efectos 3D del cajero':'Cashier design and 3D effects'}</legend><p>{es?'Usa el fondo y el cristal de tu dashboard. Estos ajustes se guardan en tu apariencia personal.':'Uses your dashboard wallpaper and glass. These settings are saved in your personal appearance.'}</p><label>{es?'Diseño del POS':'POS design'}<select aria-label={es?'Diseño del POS':'POS design'} value={a.prefs.cardDepth===a.prefs.buttonDepth?a.prefs.cardDepth:'custom'} onChange={e=>{const depth=e.target.value as DashboardAppearance['cardDepth'];a.setPrefs({...a.prefs,cardDepth:depth,buttonDepth:depth})}}><option value="custom" disabled>{es?'Personalizado':'Custom'}</option><option value="flat">{es?'Glassy plano':'Flat Glassy'}</option><option value="soft">{es?'Glassy suave':'Soft Glassy'}</option><option value="raised">Glassy 3D</option></select></label><label>{es?'Fondo del dashboard y cajero':'Dashboard and cashier wallpaper'}<select aria-label={es?'Fondo del dashboard y cajero':'Dashboard and cashier wallpaper'} value={a.prefs.background} onChange={e=>a.setPrefs({...a.prefs,background:e.target.value})}>{DASHBOARD_WALLPAPERS.map(w=><option value={w.id} key={w.id}>{es?w.nameEs:w.nameEn}</option>)}{a.hasCustom&&<option value="custom">{es?'Mi imagen':'My image'}</option>}</select></label>{(['cardDepth','buttonDepth'] as const).map(key=><label key={key}>{key==='cardDepth'?(es?'Relieve de tarjetas':'Card depth'):(es?'Relieve de botones':'Button depth')}<select aria-label={key==='cardDepth'?(es?'Relieve de tarjetas':'Card depth'):(es?'Relieve de botones':'Button depth')} value={a.prefs[key]} onChange={e=>a.setPrefs({...a.prefs,[key]:e.target.value})}>{[['flat',es?'Plano':'Flat'],['soft',es?'Cristal suave':'Soft glass'],['raised',es?'Relieve 3D':'Raised 3D']].map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>)}{showSave&&<button type="button" onClick={()=>void a.save()}>{a.busy?(es?'Guardando…':'Saving…'):(es?'Aplicar y guardar':'Apply and save')}</button>}{showSave&&a.notice==='saved'&&<p role="status">{es?'Apariencia guardada.':'Appearance saved.'}</p>}{showSave&&a.error&&<div role="alert"><p>{a.error==='conflict'?(es?'La configuración cambió en otra pestaña o dispositivo. Recarga la configuración antes de volver a aplicar tus cambios.':'Settings changed in another tab or device. Reload settings before applying your changes again.'):(es?'No se pudo guardar la apariencia. Tus cambios siguen aquí. Inténtalo nuevamente.':'Could not save appearance. Your changes are still here. Please try again.')}</p><button type="button" onClick={()=>void a.reload()}>{es?'Recargar configuración':'Reload settings'}</button></div>}</fieldset>
}
export default function DashboardAppearance({lang}:{lang:'es'|'en'}){
 const a=useDashboardAppearance(),es=lang==='es';const file=useRef<HTMLInputElement>(null);const [localError,setLocalError]=useState('');
 const set=(patch:Partial<DashboardAppearance>)=>a.setPrefs({...a.prefs,...patch});
 const pickFile=async(f?:File)=>{if(!f)return;setLocalError('');if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>4*1024*1024){setLocalError(es?'Usa JPEG, PNG o WebP de hasta 4 MB.':'Use JPEG, PNG or WebP up to 4 MB.');return}await a.upload(f);if(file.current)file.current.value=''};
 return <section className="gd-appearance" aria-labelledby="gd-appearance-title"><header><small>WEBFACTORY PR</small><h2 id="gd-appearance-title">{es?'Personalizar dashboard':'Customize dashboard'}</h2><p>{es?'Tu apariencia se guarda para tu usuario en este portal y se recupera en tus dispositivos.':'Your appearance is saved for your user in this portal and restored across your devices.'}</p></header>
 {(localError||a.error)&&<div className="gd-feedback" role="alert">{localError||(a.error==='conflict'?(es?'La configuración cambió en otro dispositivo. Recárgala antes de guardar.':'Settings changed on another device. Reload before saving.'):es?'No se pudo cargar o guardar la apariencia. Inténtalo nuevamente.':'Could not load or save appearance. Please try again.')}<button type="button" disabled={a.busy} onClick={()=>void a.reload()}>{es?'Recargar configuración':'Reload settings'}</button></div>}
 {a.notice&&<p role="status">{a.notice==='practice'?(es?'La personalización no se guarda durante la práctica.':'Appearance is not saved during practice.'):(es?'Apariencia guardada.':'Appearance saved.')}</p>}
 {!a.ready&&!a.error&&<p role="status">{es?'Cargando tu apariencia…':'Loading your appearance…'}</p>}
 <fieldset disabled={!a.ready||a.busy} className="gd-palette-section"><legend>{es?'Paletas de colores':'Color palettes'}</legend><p>{es?'Escoge entre las 23 paletas de seis tonos. Los cambios son una vista previa hasta pulsar Aplicar y guardar.':'Choose from 23 six-tone palettes. Changes are a preview until you select Apply and save.'}</p><div className="gd-palette-grid">{colorPalettes.map(p=><button type="button" key={p.id} className="gd-palette-choice" aria-label={`${es?'Paleta':'Palette'} ${p.name}`} aria-pressed={a.prefs.paletteId===p.id} onClick={()=>set({paletteId:p.id})}><span className="gd-palette-layers" aria-hidden="true">{p.swatches.map((color,i)=><i key={i} style={{top:`${i*17}px`,background:color}}/>)}</span><strong>{p.name}</strong></button>)}</div><button type="button" onClick={()=>set({paletteId:''})}>{es?'Usar mis colores actuales':'Use my current colors'}</button></fieldset>
 <fieldset disabled={!a.ready||a.busy}><legend>{es?'Fondos de pantalla':'Wallpapers'}</legend><div className="gd-wallpaper-grid">{DASHBOARD_WALLPAPERS.map(w=><article key={w.id}><button type="button" className="gd-wallpaper-choice" aria-pressed={a.prefs.background===w.id} onClick={()=>set({background:w.id})}><img src={w.src} alt="" loading="lazy"/><strong>{es?w.nameEs:w.nameEn}</strong><span>{a.prefs.background===w.id?(es?'Seleccionado':'Selected'):(es?'Vista previa':'Preview')}</span></button><a href={w.download} download>{es?'Descargar fondo':'Download wallpaper'}</a></article>)}{a.hasCustom&&<article><button type="button" className="gd-wallpaper-choice" aria-pressed={a.prefs.background==='custom'} onClick={()=>set({background:'custom'})}><img src={a.asset} alt=""/><strong>{es?'Mi imagen':'My image'}</strong><span>{a.prefs.background==='custom'?(es?'Seleccionado':'Selected'):(es?'Vista previa':'Preview')}</span></button><a href={a.asset+'&download=1'} download>{es?'Descargar mi fondo':'Download my wallpaper'}</a></article>}</div>
 <div className="gd-appearance-actions"><label className="gd-upload">{es?'Subir y aplicar mi imagen':'Upload and apply my image'}<input ref={file} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void pickFile(e.target.files?.[0])}/></label><p>{es?'JPEG, PNG o WebP · Hasta 4 MB. La imagen se optimiza y permanece privada.':'JPEG, PNG or WebP · Up to 4 MB. Your image is optimized and remains private.'}</p></div>
 <div className="gd-adjustments">{([{key:'dim',label:es?'Oscurecimiento del fondo':'Wallpaper dim',min:.25,max:.85,step:.01},{key:'alpha',label:es?'Opacidad del cristal':'Glass opacity',min:.66,max:.96,step:.01},{key:'blur',label:es?'Desenfoque':'Blur',min:0,max:40,step:1},{key:'motion',label:es?'Animaciones':'Animations',min:0,max:1,step:.1}] as const).map(control=><label key={control.key}>{control.label}<output>{control.key==='blur'?a.prefs.blur+' px':Math.round(a.prefs[control.key]*100)+'%'}</output><input type="range" min={control.min} max={control.max} step={control.step} value={a.prefs[control.key]} onChange={e=>set({[control.key]:Number(e.target.value)})}/></label>)}<label>{es?'Color de acento':'Accent color'}<input type="color" value={a.prefs.paletteId?(findColorPalette(a.prefs.paletteId)?.secondary||a.prefs.accent):a.prefs.accent} onChange={e=>set({accent:e.target.value,paletteId:''})}/></label></div>
 <p>{es?'La transparencia tiene límites para mantener el texto legible. El modo de movimiento reducido del dispositivo siempre tiene prioridad.':'Transparency is bounded to keep text readable. Your device’s reduced-motion setting always takes priority.'}</p>
 <SalesAppearanceControls lang={lang} showSave={false}/><div className="gd-appearance-actions"><button type="button" onClick={event=>{event.stopPropagation();void a.save()}}>{a.busy?(es?'Guardando…':'Saving…'):(es?'Aplicar y guardar':'Apply and save')}</button><button type="button" onClick={()=>void a.reset()}>{es?'Restaurar predeterminado y borrar mi imagen':'Restore default and delete my image'}</button></div></fieldset></section>
}
