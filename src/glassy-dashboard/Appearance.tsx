import {AppearanceGroup,Advanced,DepthControls,GlassControls,DesignPicker,commonDesigns,useAppearanceHistory} from '../personalization/AppearanceControls'
import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react'
import {DEFAULT_APPEARANCE,DASHBOARD_WALLPAPERS,normalizeAppearance,type DashboardAppearance,type DashboardPreset} from '../../shared/dashboard-appearance.mjs'
import {colorPalettes,findColorPalette} from '../../shared/color-palettes.mjs'
import {dashboardPaletteVariables,dashboardPaletteKeys,swatchContrastInk} from '../color-theme-motion'
import {useWebFactoryTheme} from '../theme'
import {animate} from 'animejs'
import {FluidGlassProvider} from './FluidGlassSurface'
import {useUnsavedChanges} from '../interaction-state'
import {usePractice} from '../training/practice-context'
import {PortalProfileProvider} from './ProfileContext'
import {FLUID_GLASS_DISTORTION_MAX} from '../../shared/fluid-glass.mjs'
import './profile.css'
import './material.css'
import './dashboard.css'
import './sales-material.css'

type State={presets:DashboardPreset[];saveDesign:(name:string)=>Promise<void>;deleteDesign:(id:string)=>Promise<void>;prefs:DashboardAppearance;setPrefs:(p:DashboardAppearance)=>void;hasCustom:boolean;busy:boolean;ready:boolean;error:string;notice:string;save:()=>Promise<void>;upload:(file:File)=>Promise<void>;reset:()=>Promise<void>;reload:()=>Promise<void>;asset:string;etag: string;savedEpoch:number}
const AppearanceContext=createContext<State|null>(null)
export function useOptionalDashboardAppearance(){return useContext(AppearanceContext)}
export function useDashboardAppearance(){const context=useContext(AppearanceContext);if(!context)throw new Error('Missing dashboard context');return context}
export function DashboardProvider({siteId,userId,children,lang='en',name=''}:{siteId?:string;userId:string;children:ReactNode;lang?:'es'|'en';name?:string}){
 const practice=usePractice(),{theme}=useWebFactoryTheme();const endpoint='/.netlify/functions/dashboard-appearance'+(siteId?'?siteId='+encodeURIComponent(siteId):'');
 const [presets,setPresets]=useState<DashboardPreset[]>([]);
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
 const accept=(data:any,tag:string,preserveDraft=false)=>{setPresets(data.presets||[]);if(!preserveDraft)setPrefs(normalizeAppearance(data.prefs));setCustom(Boolean(data.hasCustom));setRevision(data.revision||0);setEtag(tag);if(!preserveDraft)setSavedEpoch(value=>value+1)}
 // Use the live same-origin transport only outside isolated training.
 const reload=async()=>{if(practice){setReady(true);return}setBusy(true);setError('');const g=++generation.current;try{const {data,etag:tag}=await readResponse(await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}));if(g===generation.current){accept(data,tag);setReady(true)}}catch{if(g===generation.current)setError('load')}finally{if(g===generation.current)setBusy(false)}}
 useEffect(()=>{void reload();return()=>{generation.current++}},[endpoint,userId,Boolean(practice)])
 const mutate=async(method:string,body?:BodyInit,type='application/json',preserveDraft=false)=>{
  if(practice){setNotice('practice');return}if(!ready||busy)return;setBusy(true);setError('');setNotice('');
  try{const {data,etag:tag}=await readResponse(await fetch(endpoint,{method,credentials:'same-origin',headers:{'Content-Type':type,'X-Appearance-Version':etag},body}));accept(data,tag,preserveDraft);setNotice(preserveDraft?'designSaved':'saved')}
  catch(e){setError(e instanceof Error&&e.message==='409'?'conflict':'save')}
  finally{setBusy(false)}
 }
 const asset=endpoint+(siteId?'&':'?')+'asset=1&v='+revision;
 const background=prefs.background==='custom'&&hasCustom?asset:(DASHBOARD_WALLPAPERS.find(x=>x.id===prefs.background)||DASHBOARD_WALLPAPERS[0]).src;
 const style={'--glass-blur':prefs.blur+'px','--glass-alpha':prefs.alpha,'--bg-dim':prefs.backgroundNatural?0:prefs.dim,'--motion':prefs.motion,...(palette?{}:{'--accent':prefs.accent})} as CSSProperties;
 return <AppearanceContext.Provider value={{presets,saveDesign:name=>mutate('PUT',JSON.stringify({presets:[...presets,{id:crypto.randomUUID(),name,appearance:prefs}]}),'application/json',true),deleteDesign:id=>mutate('PUT',JSON.stringify({presets:presets.filter(p=>p.id!==id)}),'application/json',true),prefs,setPrefs:value=>{setPrefs(value);setNotice('')},hasCustom,busy,ready,error,notice,etag,savedEpoch,save:()=>mutate('PUT',JSON.stringify(prefs)),upload:file=>mutate('POST',file,file.type),reset:()=>mutate('DELETE'),reload,asset}}><FluidGlassProvider enabled={prefs.glassStyle==='liquid'} distortion={prefs.glassDistortion} optics={prefs.glassOptics} motion={prefs.motion>0}><PortalProfileProvider key={userId} siteId={siteId} userId={userId} name={name}><div className="gd-root" ref={rootRef} data-palette-active={Boolean(palette)} data-background-natural={prefs.backgroundNatural} data-glass-style={prefs.glassStyle} style={style}><div className="gd-wallpaper" aria-hidden="true" style={{backgroundImage:`url(${JSON.stringify(background)})`}}/><div className="gd-shade" aria-hidden="true"/>{children}</div></PortalProfileProvider></FluidGlassProvider></AppearanceContext.Provider>
}
export default function DashboardAppearance({lang}:{lang:'es'|'en'}){
 const a=useDashboardAppearance(),es=lang==='es';const file=useRef<HTMLInputElement>(null);const [localError,setLocalError]=useState('');
 const history=useAppearanceHistory(a.prefs,a.setPrefs,a.savedEpoch);
 const set=(patch:Partial<DashboardAppearance>)=>history.change({...a.prefs,...patch});
 const pickFile=async(f?:File)=>{if(!f)return;setLocalError('');if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>4*1024*1024){setLocalError(es?'Usa JPEG, PNG o WebP de hasta 4 MB.':'Use JPEG, PNG or WebP up to 4 MB.');return}await a.upload(f);if(file.current)file.current.value=''};
 return <section className="gd-appearance" aria-labelledby="gd-appearance-title"><header><small>WEBFACTORY PR</small><h2 id="gd-appearance-title">{es?'Portal y POS/Cajero':'Portal and POS/Cashier'}</h2><p>{es?'Tu apariencia se guarda para tu usuario en este portal y se recupera en tus dispositivos.':'Your appearance is saved for your user in this portal and restored across your devices.'}</p></header>
 {(localError||a.error)&&<div className="gd-feedback" role="alert">{localError||(a.error==='conflict'?(es?'La configuración cambió en otro dispositivo. Recárgala antes de guardar.':'Settings changed on another device. Reload before saving.'):es?'No se pudo cargar o guardar la apariencia. Inténtalo nuevamente.':'Could not load or save appearance. Please try again.')}<button type="button" disabled={a.busy} onClick={()=>void a.reload()}>{es?'Recargar configuración':'Reload settings'}</button></div>}
 {a.notice&&<p role="status">{a.notice==='practice'?(es?'La personalización no se guarda durante la práctica.':'Appearance is not saved during practice.'):a.notice==='designSaved'?(es?'Diseños guardados. La apariencia activa no cambió.':'Designs saved. The active appearance has not changed.'):(es?'Apariencia guardada.':'Appearance saved.')}</p>}
 {!a.ready&&!a.error&&<p role="status">{es?'Cargando tu apariencia…':'Loading your appearance…'}</p>}
 <fieldset disabled={!a.ready||a.busy} className="wf-personalization-controls">
 <DesignPicker lang={lang} designs={commonDesigns.map(d=>({id:d.id,es:d.es,en:d.en,patch:d.id==='original'?{...DEFAULT_APPEARANCE}:d.patch}))} value={a.prefs} onSelect={patch=>set(patch)} presets={a.presets} onSave={name=>void a.saveDesign(name)} onDelete={id=>void a.deleteDesign(id)}/>
 <AppearanceGroup title={es?'Colores':'Colors'}>
 <details className="gd-palette-section"><summary>{es?'Paletas de colores':'Color palettes'}</summary><p>{es?'Escoge entre las 23 paletas de seis tonos. Los cambios son una vista previa hasta pulsar Aplicar y guardar.':'Choose from 23 six-tone palettes. Changes are a preview until you select Apply and save.'}</p><div className="gd-palette-grid">{colorPalettes.map(p=><button type="button" key={p.id} className="gd-palette-choice" aria-label={`${es?'Paleta':'Palette'} ${p.name}`} aria-pressed={a.prefs.paletteId===p.id} onClick={()=>set({paletteId:p.id})}><span className="gd-palette-layers" aria-hidden="true">{p.swatches.map((color,i)=><i key={i} style={{top:`${i*17}px`,background:color,color:swatchContrastInk(color)}}><small>{color.toUpperCase()}</small></i>)}</span><strong>{p.name}</strong></button>)}</div><button type="button" onClick={()=>set({paletteId:''})}>{es?'Usar mis colores actuales':'Use my current colors'}</button></details><label>{es?'Color de acento':'Accent color'}<input type="color" aria-label={es?'Color de acento':'Accent color'} value={a.prefs.paletteId?(findColorPalette(a.prefs.paletteId)?.secondary||a.prefs.accent):a.prefs.accent} onChange={e=>set({accent:e.target.value,paletteId:''})}/></label></AppearanceGroup>
 <AppearanceGroup title={es?'Fondo':'Background'}> <div className="gd-wallpaper-grid">{DASHBOARD_WALLPAPERS.map(w=><article key={w.id}><button type="button" className="gd-wallpaper-choice" aria-pressed={a.prefs.background===w.id} onClick={()=>set({background:w.id})}><img src={w.src} alt="" loading="lazy"/><strong>{es?w.nameEs:w.nameEn}</strong><span>{a.prefs.background===w.id?(es?'Seleccionado':'Selected'):(es?'Vista previa':'Preview')}</span></button><a href={w.download} download>{es?'Descargar fondo':'Download wallpaper'}</a></article>)}{a.hasCustom&&<article><button type="button" className="gd-wallpaper-choice" aria-pressed={a.prefs.background==='custom'} onClick={()=>set({background:'custom'})}><img src={a.asset} alt=""/><strong>{es?'Mi imagen':'My image'}</strong><span>{a.prefs.background==='custom'?(es?'Seleccionado':'Selected'):(es?'Vista previa':'Preview')}</span></button><a href={a.asset+'&download=1'} download>{es?'Descargar mi fondo':'Download my wallpaper'}</a></article>}</div>
 <div className="gd-appearance-actions"><label className="gd-upload">{es?'Subir y aplicar mi imagen':'Upload and apply my image'}<input ref={file} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void pickFile(e.target.files?.[0])}/></label><p>{es?'JPEG, PNG o WebP · Hasta 4 MB. La imagen se optimiza y permanece privada.':'JPEG, PNG or WebP · Up to 4 MB. Your image is optimized and remains private.'}</p></div>

 <Advanced lang={lang}><label className="gd-toggle-row"><input type="checkbox" checked={a.prefs.backgroundNatural} onChange={e=>set({backgroundNatural:e.target.checked})}/><span>{es?'Mantener imagen original, sin oscurecimiento':'Keep original image, without dimming'}</span></label>
 <label>{es?'Oscurecimiento del fondo':'Wallpaper dim'}<output>{a.prefs.backgroundNatural?0:Math.round(a.prefs.dim*100)}%</output><input type="range" aria-label={es?'Oscurecimiento del fondo':'Wallpaper dim'} disabled={a.prefs.backgroundNatural} min="0.25" max="0.85" step="0.01" value={a.prefs.dim} onChange={e=>set({dim:Number(e.target.value)})}/></label>
 </Advanced></AppearanceGroup>
 <AppearanceGroup title={es?'Componentes y cristal':'Components and glass'}>
 <GlassControls lang={lang} style={a.prefs.glassStyle} distortion={a.prefs.glassDistortion} optics={a.prefs.glassOptics} onChange={set}/>
 <div className="ca-grid">{([{key:'alpha',label:es?'Opacidad del cristal':'Glass opacity',min:.20,max:.96,step:.01},{key:'blur',label:es?'Desenfoque del cristal':'Glass blur',min:0,max:40,step:1}] as const).map(c=><label key={c.key}>{c.label}<output>{c.key==='blur'?a.prefs.blur+' px':Math.round(a.prefs.alpha*100)+'%'}</output><input aria-label={c.label} type="range" min={c.min} max={c.max} step={c.step} value={a.prefs[c.key]} onChange={e=>set({[c.key]:Number(e.target.value)})}/></label>)}</div>
 <Advanced lang={lang}><DepthControls lang={lang} cardDepth={a.prefs.cardDepth} buttonDepth={a.prefs.buttonDepth} onChange={set}/>
 <label>{es?'Animaciones':'Animations'}<output>{Math.round(a.prefs.motion*100)}%</output><input aria-label={es?'Animaciones':'Animations'} type="range" min="0" max="1" step="0.1" value={a.prefs.motion} onChange={e=>set({motion:Number(e.target.value)})}/></label></Advanced>
 </AppearanceGroup>
 <div className="gd-appearance-actions wf-appearance-toolbar"><button type="button" disabled={!history.canUndo} onClick={history.undo}>{es?'Deshacer':'Undo'}</button><button type="button" disabled={!history.canRedo} onClick={history.redo}>{es?'Rehacer':'Redo'}</button><button type="button" onClick={()=>history.change({...DEFAULT_APPEARANCE})}>{es?'Restaurar':'Restore'}</button><button type="button" onClick={event=>{event.stopPropagation();void a.save()}}>{a.busy?(es?'Guardando…':'Saving…'):(es?'Aplicar y guardar':'Apply and save')}</button></div>
 {a.hasCustom&&<details><summary>{es?'Eliminar mi imagen privada':'Delete my private image'}</summary><p>{es?'Esta acción elimina tu imagen y restablece tus preferencias guardadas.':'This action deletes your image and resets your saved preferences.'}</p><button type="button" onClick={()=>void a.reset()}>{es?'Restaurar predeterminado y borrar mi imagen':'Restore default and delete my image'}</button></details>}
 </fieldset></section>
}
