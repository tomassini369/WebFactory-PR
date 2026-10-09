import {useId} from 'react'
/** Reflective console details from glassydashbord.jsx, not the demo's fake operational widgets. */
export default function GlassyOriginalDetails() {
  const id=useId().replaceAll(':','')
  return <div className="wf-original-console-details" aria-hidden="true">
    {['tl','tr','bl','br'].map(corner=><div key={corner} className={`gd-corner-chip gd-chip-${corner}`}/>)}
    <svg className="gd-dock-curve-svg" viewBox="0 0 74 640" preserveAspectRatio="none">
      <defs><linearGradient id={id+'dock'} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--pg-accent)" stopOpacity=".95"/><stop offset="50%" stopColor="var(--pg-accent)" stopOpacity=".98"/><stop offset="100%" stopColor="var(--pg-accent)" stopOpacity=".95"/>
      </linearGradient></defs>
      <path d="M 0,0 L 0,20 C 0,65 74,65 74,115 L 74,525 C 74,575 0,575 0,620 L 0,640 Z" fill={`url(#${id}dock)`} stroke="var(--pg-line)" strokeWidth="1.2"/>
    </svg>
  </div>
}
