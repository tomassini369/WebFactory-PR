import PortalReturnHome from './PortalReturnHome'
import {AdaptiveLogo} from './theme'
export default function PortalLoadingCard({lang='en'}:{lang?:'en'|'es'}) {
  return <main className="ca-page portal-loading-page" aria-busy="true"><section className="ca-login portal-loading-card"><div className="portal-language"><PortalReturnHome lang={lang}/></div><AdaptiveLogo alt="WebFactory PR"/><div className="portal-loading-placeholder" aria-hidden="true"><span/><span/><span/><span/></div><p role="status" aria-live="polite">{lang==='es'?'Preparando WebFactory…':'Preparing WebFactory…'}</p></section></main>
}
