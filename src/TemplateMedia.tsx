import {useEffect, useRef, useState} from 'react'
import {ChevronDown, Music2, Pause, Play, SkipBack, SkipForward} from 'lucide-react'
import {socialPlatforms} from '../shared/social-links.mjs'
import paths from './social-brand-paths.json'
import './template-media.css'

type Language = 'es' | 'en'
export type SocialLink = {id:string;url:string}
export type PublicTrack = {id:string;title:string;audioUrl:string;coverUrl:string}
export type PublicMusic = {tracks:PublicTrack[];autoplay:boolean;welcomeId:string}

export function TemplateSocialLinks({links,lang}:{links:SocialLink[];lang:Language}) {
  if (!links.length) return null
  return <details className="template-social">
    <summary>{lang==='es'?'Enlaces y redes':'Links and socials'} <ChevronDown size={16} aria-hidden="true"/></summary>
    <ul>{links.map(({id,url})=>{
      const label=socialPlatforms.find(platform=>platform.id===id)?.label
      const path=paths[id as keyof typeof paths]
      if (!label || !path) return null
      return <li key={id}><a href={url} aria-label={label} title={label} target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={path} fill="currentColor"/></svg>
      </a></li>
    })}</ul>
  </details>
}

export function MusicCover({src}:{src?:string}) {
  const [failed,setFailed]=useState(false)
  return <span className="template-music-cover" aria-hidden="true">{src&&!failed
    ? <img src={src} alt="" loading="lazy" onError={()=>setFailed(true)}/>
    : <Music2 size={24}/>}</span>
}

const timeLabel=(seconds:number)=>{
  const value=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0
  return Math.floor(value/60)+':'+String(value%60).padStart(2,'0')
}

export function TemplateMusic({music,artist,lang,allowAutoplay}:{music:PublicMusic;artist:string;lang:Language;allowAutoplay:boolean}) {
  const es=lang==='es'
  const audio=useRef<HTMLAudioElement>(null)
  const playOnSelect=useRef(false)
  const attempted=useRef(false)
  const [selected,setSelected]=useState(music.welcomeId)
  const [playing,setPlaying]=useState(false)
  const [blocked,setBlocked]=useState(false)
  const [error,setError]=useState(false)
  const [duration,setDuration]=useState(0)
  const [elapsed,setElapsed]=useState(0)
  const found=music.tracks.findIndex(track=>track.id===selected)
  const index=Math.max(0,found)
  const track=music.tracks[index]
  const initialSource=useRef(track?.audioUrl)

  const play=(element:HTMLAudioElement,automatic=false)=>{
    setError(false)
    void element.play().then(()=>setBlocked(false)).catch((reason:unknown)=>{
      if (reason instanceof DOMException && reason.name==='AbortError') return
      if (automatic && reason instanceof DOMException && reason.name==='NotAllowedError') setBlocked(true)
      else setError(true)
    })
  }
  useEffect(()=>{
    const element=audio.current
    if (!element) return
    if (!attempted.current && allowAutoplay && music.autoplay) {
      attempted.current=true
      play(element,true)
    }
    return ()=>{element.pause();attempted.current=false}
  },[allowAutoplay,music.autoplay])

  if (!track) return null
  const change=(next:number)=>{
    const nextTrack=music.tracks[next]
    const element=audio.current
    if (!nextTrack || nextTrack.id===track.id || !element) return
    const resume=!element.paused
    setBlocked(false);setError(false);setElapsed(0);setDuration(0);setSelected(nextTrack.id)
    // Set the source and play in the same user gesture so Safari can authorize it.
    element.src=nextTrack.audioUrl
    if (resume || playOnSelect.current) play(element)
  }
  const toggle=()=>{
    const element=audio.current
    if (!element) return
    if (element.paused) play(element)
    else element.pause()
  }
  const choose=(next:number)=>{
    playOnSelect.current=true
    if (next===index && audio.current) play(audio.current)
    else change(next)
    playOnSelect.current=false
  }
  const playLabel=playing?(es?'Pausar':'Pause'):blocked?(es?'Escuchar ahora':'Listen now'):(es?'Reproducir':'Play')
  return <section className="template-music" aria-label={es?'Reproductor de música':'Music player'}>
    <audio ref={audio} src={initialSource.current} preload="none" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)}
      onLoadedMetadata={event=>setDuration(Number.isFinite(event.currentTarget.duration)?event.currentTarget.duration:0)}
      onTimeUpdate={event=>setElapsed(event.currentTarget.currentTime)}
      onError={()=>{setPlaying(false);setError(true)}}/>
    <div className="template-music-top">
      <MusicCover key={track.coverUrl} src={track.coverUrl}/>
      <div className="template-music-title"><strong>{track.title}</strong><span>{artist}</span></div>
      <div className="template-music-controls">
        <button type="button" disabled={index===0} onClick={()=>change(index-1)} aria-label={es?'Canción anterior':'Previous track'}><SkipBack size={18}/></button>
        <button type="button" className="template-music-play" onClick={toggle} aria-label={playLabel}>{playing?<Pause size={20}/>:<Play size={20}/>}</button>
        <button type="button" disabled={index===music.tracks.length-1} onClick={()=>change(index+1)} aria-label={es?'Canción siguiente':'Next track'}><SkipForward size={18}/></button>
      </div>
    </div>
    {blocked&&<button type="button" className="template-music-listen" onClick={toggle}>{es?'Escuchar ahora':'Listen now'}</button>}
    {error&&<p role="status">{es?'No se pudo reproducir la canción.':'Could not play this track.'}</p>}
    <div className="template-music-progress">
      <span>{timeLabel(elapsed)}</span>
      <input type="range" aria-label={es?'Posición de reproducción':'Playback position'} min={0} max={duration||1} step={0.1} value={Math.min(elapsed,duration)} disabled={!duration}
        onChange={event=>{if(audio.current){audio.current.currentTime=Number(event.target.value);setElapsed(audio.current.currentTime)}}}/>
      <span>{timeLabel(duration)}</span>
    </div>
    <details className="template-music-tracks">
      <summary>{es?'Ver canciones':'View tracks'} <ChevronDown size={16} aria-hidden="true"/></summary>
      <ol>{music.tracks.map((entry,i)=><li key={entry.id}><button type="button" onClick={()=>choose(i)} aria-current={i===index?'true':undefined}>
        <MusicCover key={entry.coverUrl} src={entry.coverUrl}/><span>{entry.title}</span><Play size={16} aria-hidden="true"/>
      </button></li>)}</ol>
    </details>
  </section>
}
