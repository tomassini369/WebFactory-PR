import { useEffect, useState } from 'react'
import { AdaptiveLogo, ThemeToggle } from './theme'
import './preview-review.css'

/* Preview-only visual comparison. This page is compiled out of production builds (see vite.config.ts)
   and its assets are removed from production output (scripts/strip-preview-review.mjs). */

type Language = 'en' | 'es'
type View = 'side' | 'current' | 'new' | 'hero' | 'video' | 'concept'
type Theme = 'dark' | 'light'
type Device = 'desktop' | 'mobile'

const base = '/preview-review/'
const frames = (device: Device) => Array.from({ length: 9 }, (_, i) => `${base}new-${device}-${String(i + 1).padStart(2, '0')}.jpg`)

const copy = {
  es: {
    eyebrow: 'WEBFACTORY PR · REVISIÓN VISUAL', title: 'Homepage: estado actual y rediseño',
    lead: 'Compara la homepage publicada con el nuevo rediseño y las referencias visuales. Esta herramienta solo existe en el preview; no forma parte de la homepage pública.',
    badge: 'Solo preview · No se publica en producción',
    views: { side: 'Lado a lado', current: 'Estado actual publicado', new: 'Nuevo rediseño', hero: 'Hero: con / sin video', video: 'Video de referencia', concept: 'Mockup conceptual' },
    desktop: 'Desktop', mobile: 'Móvil', device: 'Dispositivo', viewsLabel: 'Vistas de comparación',
    currentCaption: 'Captura de página completa de webfactorypr.com tomada el 30 de septiembre de 2026 en modo solo lectura. Producción no se modificó.',
    newCaption: 'Fotogramas del recorrido con scroll de este preview: hero, los cinco pasos del Control Center, plataforma, demos y planes. Todo usa datos de ejemplo.',
    openNew: 'Abrir el rediseño interactivo', frame: 'Fotograma',
    withVideo: 'Con video', withoutVideo: 'Sin video', themeLabel: 'Tema', dark: 'Oscuro', light: 'Claro', openWith: 'Abrir con video', openWithout: 'Abrir sin video',
    heroCaption: 'Video original sin recodificar: H.264, 910×512, 30 fps, 50.8 s (SHA-256 del MOV 33bd5899…d488). Se muestra completo (contain) sobre fondo navy, sin recorte, deformación ni blur. En pantallas anchas se amplía hasta 1.58× y se verá más suave que en su tamaño nativo: no es Full HD ni 4K. El modo sin video solo existe en este preview.',
    videoCaption: 'Video aportado como referencia de composición, jerarquía, espacio y movimiento. Su identidad no se reproduce en WebFactory PR.',
    conceptCaption: 'Concepto visual previo: dirección de diseño. El rediseño usa el logo original y funciones reales de WebFactory PR.',
    currentAlt: 'Captura de la homepage publicada de WebFactory PR', conceptAlt: 'Mockup conceptual previo de WebFactory PR',
    footer: 'Preview de diseño · Las cifras del rediseño son datos de ejemplo · Producción permanece sin cambios', back: 'Ir a la homepage del preview',
  },
  en: {
    eyebrow: 'WEBFACTORY PR · VISUAL REVIEW', title: 'Homepage: current state and redesign',
    lead: 'Compare the published homepage with the new redesign and the visual references. This tool exists only in the preview; it is not part of the public homepage.',
    badge: 'Preview only · Not published to production',
    views: { side: 'Side by side', current: 'Current published state', new: 'New redesign', hero: 'Hero: with / without video', video: 'Reference video', concept: 'Concept mockup' },
    desktop: 'Desktop', mobile: 'Mobile', device: 'Device', viewsLabel: 'Comparison views',
    currentCaption: 'Full-page capture of webfactorypr.com taken on September 30, 2026, read-only. Production was not changed.',
    newCaption: 'Scroll-tour frames from this preview: hero, the five Control Center steps, platform, demos and plans. Everything uses sample data.',
    openNew: 'Open the interactive redesign', frame: 'Frame',
    withVideo: 'With video', withoutVideo: 'Without video', themeLabel: 'Theme', dark: 'Dark', light: 'Light', openWith: 'Open with video', openWithout: 'Open without video',
    heroCaption: 'Original video, not re-encoded: H.264, 910×512, 30 fps, 50.8 s (MOV SHA-256 33bd5899…d488). Shown whole (contain) over a navy fill: no cropping, distortion or blur. On wide screens it is enlarged up to 1.58× and looks softer than at native size; it is not Full HD or 4K. The without-video mode exists only in this preview.',
    videoCaption: 'Video provided as a reference for composition, hierarchy, spacing and motion. Its identity is not reproduced in WebFactory PR.',
    conceptCaption: 'Previous visual concept: design direction. The redesign uses the original logo and real WebFactory PR features.',
    currentAlt: 'Capture of the published WebFactory PR homepage', conceptAlt: 'Previous WebFactory PR concept mockup',
    footer: 'Design preview · Redesign figures are sample data · Production remains unchanged', back: 'Go to the preview homepage',
  },
}

export default function PreviewReviewPage({ lang, setLang }: { lang: Language, setLang: (value: Language) => void }) {
  const t = copy[lang]
  const [view, setView] = useState<View>('side')
  const [device, setDevice] = useState<Device>('desktop')
  const [shotTheme, setShotTheme] = useState<Theme>('dark')
  const views = Object.keys(t.views) as View[]
  useEffect(() => { document.title = `${t.title} · Preview` }, [t.title])

  const current = <figure className="pr-shot"><img src={`${base}current-${device}.jpg`} alt={t.currentAlt} loading="lazy" /></figure>
  const redesign = <div className="pr-frames">{frames(device).map((src, i) => <figure key={src} className="pr-shot"><img src={src} alt={`${t.views.new} · ${t.frame} ${i + 1}`} loading="lazy" /><figcaption>{t.frame} {i + 1}</figcaption></figure>)}</div>

  return <div className={`pr-page pr-${device}`}>
    <header className="pr-header">
      <a href="/" className="pr-logo" aria-label={t.back}><AdaptiveLogo alt="WebFactory PR" /></a>
      <span className="pr-badge">{t.badge}</span>
      <div className="pr-header-actions"><div className="pr-langs" role="group" aria-label="Language / Idioma"><button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button><button aria-pressed={lang === 'es'} onClick={() => setLang('es')}>ES</button></div><ThemeToggle /></div>
    </header>
    <main className="pr-main">
      <section className="pr-intro"><p className="pr-eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p>{t.lead}</p></section>
      <div className="pr-controls">
        <div className="pr-tabs" role="tablist" aria-label={t.viewsLabel}>{views.map((v, i) => <button key={v} id={`pr-tab-${v}`} role="tab" aria-selected={view === v} aria-controls="pr-panel" tabIndex={view === v ? 0 : -1} onClick={() => setView(v)} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = views[(i + (e.key === 'ArrowRight' ? 1 : views.length - 1)) % views.length]; setView(next); document.getElementById(`pr-tab-${next}`)?.focus() } }}>{t.views[v]}</button>)}</div>
        {view === 'hero' && <div className="pr-devices" role="group" aria-label={t.themeLabel}><button aria-pressed={shotTheme === 'dark'} onClick={() => setShotTheme('dark')}>{t.dark}</button><button aria-pressed={shotTheme === 'light'} onClick={() => setShotTheme('light')}>{t.light}</button></div>}
        {(view === 'side' || view === 'current' || view === 'new' || view === 'hero') && <div className="pr-devices" role="group" aria-label={t.device}><button aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>{t.desktop}</button><button aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>{t.mobile}</button></div>}
      </div>
      <section id="pr-panel" role="tabpanel" aria-labelledby={`pr-tab-${view}`} className="pr-panel">
        {view === 'side' && <div className="pr-side">
          <div><h2>{t.views.current}</h2><p className="pr-caption">{t.currentCaption}</p>{current}</div>
          <div><h2>{t.views.new}</h2><p className="pr-caption">{t.newCaption} <a href="/">{t.openNew} ↗</a></p>{redesign}</div>
        </div>}
        {view === 'current' && <><p className="pr-caption">{t.currentCaption}</p><div className="pr-single">{current}</div></>}
        {view === 'new' && <><p className="pr-caption">{t.newCaption} <a href="/">{t.openNew} ↗</a></p><div className="pr-single">{redesign}</div></>}
        {view === 'hero' && <><p className="pr-caption">{t.heroCaption} <a href="/">{t.openWith} ↗</a> · <a href="/?hero-video=off">{t.openWithout} ↗</a></p><div className="pr-side">{(['with', 'without'] as const).map(mode => <div key={mode}><h2>{mode === 'with' ? t.withVideo : t.withoutVideo}</h2><figure className="pr-shot"><img src={`${base}hero-${mode}-video-${device}-${shotTheme}.jpg`} alt={`${mode === 'with' ? t.withVideo : t.withoutVideo} · ${device === 'desktop' ? t.desktop : t.mobile} · ${shotTheme === 'dark' ? t.dark : t.light}`} /></figure></div>)}</div></>}
        {view === 'video' && <><p className="pr-caption">{t.videoCaption}</p><video className="pr-media" controls playsInline preload="metadata" src={`${base}reference-video.mp4`} /></>}
        {view === 'concept' && <><p className="pr-caption">{t.conceptCaption}</p><img className="pr-media" src={`${base}concept-mockup.webp`} alt={t.conceptAlt} /></>}
      </section>
    </main>
    <footer className="pr-footer">{t.footer}</footer>
  </div>
}
