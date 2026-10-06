import {useEffect,useRef,useState} from 'react'
import {feedback} from './feedback/feedback'
import {FeedbackPreferences} from './feedback/FeedbackPreferences'
import {useWebFactoryTheme} from './theme'

type Preferences={paletteMode?:'original'|'custom';accent:string;theme:'light'|'dark';soundEnabled:boolean;hapticsEnabled:boolean}
const endpoint='/.netlify/functions/portal-preferences'
export function usePortalAppearance(userId?:string) {
  const {theme,setTheme}=useWebFactoryTheme()
  const [accent,setAccentValue]=useState('#3C86F6')
  const [paletteMode,setPaletteMode]=useState<'original'|'custom'>('original')
  const setAccent=(color:string)=>{setAccentValue(color);setPaletteMode('custom')}
  const [sound,setSound]=useState(feedback.getPreferences())
  const [loaded,setLoaded]=useState<string>()
  const [status,setStatus]=useState<'loading'|'saved'|'saving'|'error'>('loading')
  const lastSaved=useRef('')
  const [retry,setRetry]=useState(0)
  const [saveRetry,setSaveRetry]=useState(0)
  useEffect(()=>feedback.subscribe(setSound),[])
  useEffect(()=>{
    if(!userId)return
    let active=true
    setLoaded(undefined);setStatus('loading');feedback.useAccount(userId)
    const key=`webfactory:appearance:${userId}`
    let cached:Preferences|null=null
    try{cached=JSON.parse(localStorage.getItem(key)||'null')}catch{}
    if(cached&&/^#[0-9a-f]{6}$/i.test(cached.accent)&&['dark','light'].includes(cached.theme)){setAccentValue(cached.accent);setPaletteMode(cached.paletteMode||'custom');setTheme(cached.theme)}else {setAccentValue('#3C86F6');setPaletteMode('original')}
    void fetch(endpoint,{credentials:'same-origin',cache:'no-store'}).then(async r=>{
      if(!r.ok)throw new Error('Preferences unavailable')
      const {preferences}=await r.json()
      if(!active)return
      if(preferences){setAccentValue(preferences.accent);setPaletteMode(preferences.paletteMode||'custom');setTheme(preferences.theme);feedback.setSoundEnabled(preferences.soundEnabled);feedback.setHapticsEnabled(preferences.hapticsEnabled);lastSaved.current=JSON.stringify(preferences)}else lastSaved.current=''
      setLoaded(userId);setStatus('saved')
    }).catch(()=>{if(active)setStatus('error')})
    return ()=>{active=false;feedback.useAccount()}
  },[userId,retry])
  useEffect(()=>{
    if(!userId||loaded!==userId)return
    const value:Preferences={accent,theme,...sound,paletteMode}
    const serialized=JSON.stringify(value)
    try{localStorage.setItem(`webfactory:appearance:${userId}`,serialized)}catch{}
    if(serialized===lastSaved.current)return
    setStatus('saving')
    const controller=new AbortController()
    const timer=setTimeout(()=>{
      void fetch(endpoint,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:serialized,signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Save failed');if(controller.signal.aborted)return;lastSaved.current=serialized;setStatus('saved')}).catch(()=>{if(!controller.signal.aborted)setStatus('error')})
    },450)
    return ()=>{clearTimeout(timer);controller.abort()}
  },[userId,loaded,accent,theme,sound,paletteMode,saveRetry])
  return {accent,setAccent,paletteMode,restoreOriginal:()=>{setAccentValue('#3C86F6');setPaletteMode('original')},theme,setTheme,status,retry:()=>{if(loaded===userId)setSaveRetry(n=>n+1);else setRetry(n=>n+1)}}
}

export function PortalAppearance({lang,appearance}:{lang:'es'|'en';appearance:ReturnType<typeof usePortalAppearance>}) {
  const es=lang==='es'
  return <section className="ca-panel portal-appearance"><h2>{es?'Apariencia y preferencias':'Appearance and preferences'}</h2>
    <p>{es?'Elige el color de fondo, menú, tarjetas y controles del dashboard. Tus preferencias se guardan en tu cuenta y no cambian la página de tu negocio.':'Choose the color of your dashboard background, menu, cards and controls. Preferences are saved to your account and do not change your business website.'}</p>
    <label>{es?'Color del layout completo':'Full layout color'}<input type="color" value={appearance.accent} onChange={e=>appearance.setAccent(e.target.value.toUpperCase())}/></label>
    <div className="portal-color-options">{['#3C86F6','#7C3AED','#0D9488','#D97706','#DB2777'].map(color=><button key={color} type="button" aria-label={color} aria-pressed={color===appearance.accent} style={{background:color}} onClick={()=>appearance.setAccent(color)}>{color===appearance.accent?'✓':''}</button>)}</div>
    <button type="button" onClick={appearance.restoreOriginal}>{es?'Restaurar colores originales de WebFactory':'Restore original WebFactory colors'}</button>
    <p>{appearance.paletteMode==='original'?(es?'Paleta original de WebFactory activa.':'Original WebFactory palette active.'):(es?'Paleta personalizada activa.':'Custom palette active.')}</p>
    <fieldset><legend>{es?'Modo de pantalla':'Display mode'}</legend>{(['light','dark'] as const).map(mode=><label key={mode} className="check"><input type="radio" name="portal-theme" checked={appearance.theme===mode} onChange={()=>appearance.setTheme(mode)}/>{mode==='light'?(es?'Claro':'Light'):(es?'Oscuro':'Dark')}</label>)}</fieldset>
    <FeedbackPreferences lang={lang}/>
    <button type="button" onClick={()=>{feedback.unlockAudio('success');feedback.vibrate('success')}}>{es?'Probar sonido y feedback':'Test sound and feedback'}</button>
    <p>{es?'El sonido se activa al interactuar. La vibración depende del soporte de tu navegador y dispositivo.':'Sound starts after interaction. Vibration depends on browser and device support.'}</p>
    <p role="status">{appearance.status==='saved'?(es?'Preferencias guardadas':'Preferences saved'):appearance.status==='saving'?(es?'Guardando…':'Saving…'):appearance.status==='loading'?(es?'Cargando preferencias…':'Loading preferences…'):(es?'No se pudieron sincronizar las preferencias.':'Preferences could not be synchronized.')}</p>
    {appearance.status==='error'&&<button onClick={appearance.retry}>{es?'Reintentar sincronización':'Retry synchronization'}</button>}
  </section>
}
