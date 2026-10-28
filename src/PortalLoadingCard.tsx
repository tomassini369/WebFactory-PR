import PortalSceneCopy from './PortalSceneCopy'
import PortalReturnHome from './PortalReturnHome'
import {AdaptiveLogo,ThemeToggle} from './theme'
import {portalAccessCopy} from './portal-access-copy'
export default function PortalLoadingCard({lang='en'}:{lang?:'en'|'es'}) {
 const es=lang==='es',admin=/^\/webfactory-admin\/?$/.test(location.pathname),copy=portalAccessCopy[admin?'admin':'business'][lang]
 return <main translate="no" className={`${admin?'wfa-login-page':'ca-page'} portal-loading-page`} aria-busy="true"><PortalSceneCopy lang={lang}/><section className={`${admin?'wfa-login':'ca-login'} portal-loading-card`}>
  <div className="portal-language"><PortalReturnHome lang={lang}/><button disabled className={lang==='en'?'active':''}>EN</button><button disabled className={lang==='es'?'active':''}>ES</button><ThemeToggle/></div><AdaptiveLogo alt="WebFactory PR"/>
  <small>{copy.private}</small><h1>{copy.title}</h1><p>{copy.text}</p>
  <div className="portal-loading-fields" aria-hidden="true"><label>Email<span className="portal-loading-field"/></label><label>{es?'Contraseña':'Password'}<span className="portal-loading-field"/></label><div className="portal-loading-remember"><span/>{es?'Recordarme':'Remember me'}</div><span className="portal-loading-submit">{es?'Preparando WebFactory…':'Preparing WebFactory…'}</span><span className="portal-loading-recovery">{es?'¿Olvidaste tu contraseña?':'Forgot password?'}</span></div>
  <span className="portal-loading-status" role="status" aria-live="polite">{es?'Preparando WebFactory…':'Preparing WebFactory…'}</span>
 </section></main>
}
