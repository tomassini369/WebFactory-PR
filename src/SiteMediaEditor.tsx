import {useUnsavedChanges} from './interaction-state'
import {useState} from 'react'
import {businessSocialLinks, normalizeSocialLinks, socialPlatforms} from '../shared/social-links.mjs'
import {musicFileLimit, musicTrackLimit, normalizeSiteMusic, siteAssetUrl} from '../shared/site-music.mjs'
import {useWorkspaceApi} from './training/workspace-services'
import {MusicCover, type SocialLink} from './TemplateMedia'

type Language='es'|'en'

export function SocialLinksEditor({links,onChange,lang}:{links:SocialLink[];onChange:(links:SocialLink[])=>void;lang:Language}) {
  const es=lang==='es'
  const [platform,setPlatform]=useState('')
  const [url,setUrl]=useState('')
  const [error,setError]=useState(false)
  const platformName=socialPlatforms.find(item=>item.id===platform)?.label
  const add=()=>{
    const [link]=normalizeSocialLinks([{id:platform,url}])
    if (!link) {setError(true);return}
    onChange([...links.filter(entry=>entry.id!==link.id),link])
    setPlatform('');setUrl('');setError(false)
  }
  return <div className="wf-media-editor">
    <label>{es?'Plataforma':'Platform'}<select value={platform} onChange={event=>{
      const id=event.target.value
      setPlatform(id);setUrl(links.find(link=>link.id===id)?.url||'');setError(false)
    }}><option value="">{es?'Seleccionar':'Select'}</option>
      {socialPlatforms.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
    </select></label>
    {platform&&<><label>{es?'Enlace directo':'Direct link'}<input type="url" value={url} placeholder="https://" onChange={event=>{setUrl(event.target.value);setError(false)}}/></label>
      <button type="button" className="btn secondary" onClick={add}>{links.some(link=>link.id===platform)?(es?'Actualizar enlace':'Update link'):(es?'Añadir enlace':'Add link')}</button>
    </>}
    {error&&<p role="alert">{es?`Pega un enlace HTTPS válido de ${platformName}.`:`Enter a valid HTTPS link for ${platformName}.`}</p>}
    {links.length>0&&<ul>{links.map((link,index)=>{
      const name=socialPlatforms.find(item=>item.id===link.id)?.label||link.id
      return <li key={link.id}><strong>{name}</strong> <div className="wf-media-actions">
        <button type="button" className="btn secondary" disabled={!index} aria-label={es?`Subir ${name}`:`Move ${name} up`} onClick={()=>{
          const ordered=[...links];[ordered[index-1],ordered[index]]=[ordered[index],ordered[index-1]];onChange(ordered)
        }}>↑</button>
        <button type="button" className="btn secondary" onClick={()=>onChange(links.filter(item=>item.id!==link.id))}>{es?'Quitar':'Remove'}</button>
      </div></li>
    })}</ul>}
  </div>
}

export function SiteSocialEditor({business,lang,onSave,busy}:{business:Record<string,unknown>;lang:Language;onSave:(links:SocialLink[])=>void;busy:boolean}) {
  const [links,setLinks]=useState<SocialLink[]>(()=>businessSocialLinks(business))
  useUnsavedChanges(links,business,setLinks,lang)
  return <div className="wf-media-editor">
    <SocialLinksEditor links={links} onChange={setLinks} lang={lang}/>
    <button type="button" className="btn primary" disabled={busy} onClick={()=>onSave(links)}>{lang==='es'?'Guardar enlaces':'Save links'}</button>
  </div>
}

type Track={id:string;title:string;audioKey:string;coverKey:string}
type MusicSettings={tracks:Track[];autoplay:boolean;welcomeId:string}

export function SiteMusicEditor({siteId,value,lang,busy,onSave}:{siteId:string;value:unknown;lang:Language;busy:boolean;onSave:(value:MusicSettings)=>void}) {
  const api=useWorkspaceApi()
  const es=lang==='es'
  const [music,setMusic]=useState<MusicSettings>(()=>normalizeSiteMusic(value,siteId))
  useUnsavedChanges(music,value,setMusic,lang)
  const [working,setWorking]=useState(false)
  const [error,setError]=useState('')
  const [covers,setCovers]=useState<Record<string,string>>({})
  const disabled=busy||working
  const upload=async(file:File,purpose:string)=>{
    const form=new FormData()
    form.set('siteId',siteId);form.set('file',file)
    if (purpose) form.set('purpose',purpose)
    return api('/.netlify/functions/client-asset',{method:'POST',body:form})
  }
  const add=async(file:File)=>{
    if (file.size>musicFileLimit) {setError(es?'El MP3 debe pesar como máximo 4 MB.':'The MP3 must be at most 4 MB.');return}
    setWorking(true);setError('')
    try{
      const result=await upload(file,'music')
      const id=crypto.randomUUID()
      setMusic(previous=>({...previous,welcomeId:previous.welcomeId||id,tracks:[...previous.tracks,{id,title:file.name.replace(/\.mp3$/i,'').trim().slice(0,120)||'MP3',audioKey:result.assetKey,coverKey:''}]}))
    }catch(reason){setError(reason instanceof Error?reason.message:String(reason))}
    finally{setWorking(false)}
  }
  const edit=(id:string,patch:Partial<Track>)=>setMusic(previous=>({...previous,tracks:previous.tracks.map(track=>track.id===id?{...track,...patch}:track)}))
  const cover=async(id:string,file:File)=>{
    setWorking(true);setError('')
    try{const result=await upload(file,'');edit(id,{coverKey:result.assetKey});setCovers(previous=>({...previous,[id]:result.imageUrl}))}
    catch(reason){setError(reason instanceof Error?reason.message:String(reason))}
    finally{setWorking(false)}
  }
  return <div className="wf-media-editor">
    <label>{es?'Subir canción · MP3 de hasta 4 MB':'Upload track · MP3 up to 4 MB'}
      <input type="file" accept=".mp3,audio/mpeg" disabled={disabled||music.tracks.length>=musicTrackLimit} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void add(file)}}/>
    </label>
    {working&&<p role="status">{es?'Subiendo archivo…':'Uploading file…'}</p>}
    {error&&<p role="alert">{error}</p>}
    {music.tracks.map((track,index)=><fieldset key={track.id} disabled={disabled}>
      <legend>{index+1}. {track.title}</legend>
      <MusicCover key={track.coverKey} src={track.coverKey&&(covers[track.id]||siteAssetUrl(siteId,track.coverKey))}/>
      <label>{es?'Título':'Title'}<input value={track.title} maxLength={120} onChange={event=>edit(track.id,{title:event.target.value})}/></label>
      <label>{es?'Portada opcional':'Optional cover'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void cover(track.id,file)}}/></label>
      <div className="wf-media-actions">
        {track.coverKey&&<button type="button" className="btn secondary" onClick={()=>edit(track.id,{coverKey:''})}>{es?'Quitar portada':'Remove cover'}</button>}
        <button type="button" className="btn secondary" disabled={!index} onClick={()=>setMusic(previous=>{
          const tracks=[...previous.tracks];[tracks[index-1],tracks[index]]=[tracks[index],tracks[index-1]];return {...previous,tracks}
        })}>{es?'Subir en la lista':'Move up'}</button>
        <button type="button" className="btn secondary" onClick={()=>setMusic(previous=>{
          const tracks=previous.tracks.filter(item=>item.id!==track.id)
          return {...previous,tracks,welcomeId:previous.welcomeId===track.id?tracks[0]?.id||'':previous.welcomeId}
        })}>{es?'Eliminar canción':'Remove track'}</button>
      </div>
    </fieldset>)}
    {music.tracks.length>0&&<>
      <label>{es?'Canción inicial':'First track'}<select value={music.welcomeId} disabled={disabled} onChange={event=>setMusic({...music,welcomeId:event.target.value})}>
        {music.tracks.map(track=><option key={track.id} value={track.id}>{track.title}</option>)}
      </select></label>
      <label>{es?'Inicio de reproducción':'Playback mode'}<select value={music.autoplay?'auto':'manual'} disabled={disabled} onChange={event=>setMusic({...music,autoplay:event.target.value==='auto'})}>
        <option value="manual">{es?'Reproducir al pulsar Play':'Play when pressed'}</option>
        <option value="auto">{es?'Intentar reproducir al entrar':'Try to play on entry'}</option>
      </select></label>
    </>}
    <button type="button" className="btn primary" disabled={disabled||music.tracks.some(track=>!track.title.trim())} onClick={()=>onSave(music)}>{es?'Guardar música':'Save music'}</button>
  </div>
}
