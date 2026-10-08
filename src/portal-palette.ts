// A chosen layout color produces readable surfaces in either display mode.
function mix(color:string,base:number,weight:number) {
  const rgb=color.replace('#','').match(/.{2}/g)!.map(n=>parseInt(n,16))
  return `#${rgb.map(n=>Math.round(n*weight+base*(1-weight)).toString(16).padStart(2,'0')).join('')}`
}
export function portalPalette(color:string,theme:'light'|'dark') {
  const safe=/^#[0-9a-f]{6}$/i.test(color)?color:'#3C86F6'
  const dark=theme==='dark'
  return {
    '--portal-page':mix(safe,dark?8:255,dark?.14:.08),
    '--portal-surface':mix(safe,dark?14:255,dark?.22:.035),
    '--portal-soft':mix(safe,dark?20:255,dark?.28:.12),
    '--portal-sidebar':mix(safe,dark?10:255,dark?.32:.19),
    '--portal-line':mix(safe,dark?110:190,.3),
    '--portal-text':mix(safe,dark?255:5,.06),
    '--portal-muted':mix(safe,dark?220:50,.08),
    '--portal-hero':mix(safe,dark?18:255,dark?.4:.2),
  }
}
