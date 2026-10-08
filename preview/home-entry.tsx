import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {ThemeProvider} from '../src/theme'
import HomePage from '../src/HomePage'
import '../src/styles.css'
import '../src/home-premium.css'
import '../src/theme.css'
import '../src/liquid-glass.css'
import './stitch-home-v3.css'

window.fetch=async()=>{throw new Error('No network operations are allowed in this visual preview.')}

function PreviewHome(){
  const [lang,setLang]=useState<'en'|'es'>('es')
  return <HomePage lang={lang} setLang={setLang}/>
}

createRoot(document.getElementById('root')!).render(<ThemeProvider><PreviewHome/></ThemeProvider>)
