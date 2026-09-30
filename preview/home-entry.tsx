import {createRoot} from 'react-dom/client'
import {ThemeProvider} from '../src/theme'
import App from '../src/App'
import '../src/styles.css'
import '../src/theme.css'
window.fetch=async()=>{throw new Error('No network operations are allowed in this visual preview.')}
const style=document.createElement('style');style.textContent='.wf-theme-toggle.floating{display:none}';document.head.append(style)
createRoot(document.getElementById('root')!).render(<ThemeProvider><App/></ThemeProvider>)
