import PortalSceneCopy from './PortalSceneCopy'
import PortalReturnHome from './PortalReturnHome'
import {AdaptiveLogo,ThemeToggle} from './theme'
export default function PortalLoadingCard({lang='en'}:{lang?:'en'|'es'}) {
  return <main className="ca-page portal-loading-page" aria-busy="true"><PortalSceneCopy lang={lang}/><section className="ca-login portal-loading-card"><div className="portal-language"><PortalReturnHome lang={lang}/><button disabled className={lang==='en'?'active':''}>EN</button><button disabled className={lang==='es'?'active':''}>ES</button><ThemeToggle/></div><AdaptiveLogo alt="WebFactory PR"/><div className="portal-loading-placeholder" aria-hidden="true"><span/><span/><span/><span/></div><p role="status" aria-live="polite">{lang==='es'?'Preparando WebFactory…':'Preparing WebFactory…'}</p></section></main>
}
