import {createRoot} from 'react-dom/client'
import {ThemeProvider} from '../src/theme'
import App from '../src/App'
import '../src/styles.css'
import '../src/theme.css'
import '../src/liquid-glass.css'
import './stitch-design-preview.css'
window.fetch=async()=>{throw new Error('No network operations are allowed in this visual preview.')}
// Fragment navigation stays inside the device viewport in the design review.
document.addEventListener('click',event=>{
  const anchor=(event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
  if(!anchor)return
  const target=document.getElementById(anchor.getAttribute('href')!.slice(1))
  if(target){event.preventDefault();target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
})
const style=document.createElement('style');style.textContent='.wf-theme-toggle.floating{display:none}';document.head.append(style)
createRoot(document.getElementById('root')!).render(<ThemeProvider><App/></ThemeProvider>)
