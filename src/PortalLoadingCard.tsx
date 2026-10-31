import PortalSceneCopy from './PortalSceneCopy'
import PortalReturnHome from './PortalReturnHome'
import {AdaptiveLogo,ThemeToggle} from './theme'
import {portalAccessCopy} from './portal-access-copy'
export default function PortalLoadingCard({lang='en'}:{lang?:'en'|'es'}) {
 const es=lang==='es',admin=/^\/webfactory-admin\/?$/.test(location.pathname),copy=portalAccessCopy[admin?'admin':'business'][lang]
 return <main translate="no" className={`${admin?'wfa-login-page':'ca-page'} portal-loading-page`} aria-busy="true"><PortalSceneCopy lang={lang}/><section className={`${admin?'wfa-login':'ca-login'} portal-loading-card`}>
  <div className="portal-language"><PortalReturnHome lang={lang}/><button disabled className={lang==='en'?'active':''}>EN</button><button disabled className={lang==='es'?'active':''}>ES</button><ThemeToggle/></div><AdaptiveLogo alt="WebFactory PR"/>
  <small>{copy.private}</small><h1>{copy.title}</h1><p>{copy.text}</p>
  <form className="portal-loading-fields wf-login-form" inert aria-hidden="true" onSubmit={event=>event.preventDefault()}><label>Email<input data-loading-email type="text" autoComplete="off" readOnly tabIndex={-1}/></label><label>{es?'Contraseña':'Password'}<span className="portal-password-field"><input type="text" autoComplete="off" readOnly tabIndex={-1}/><button type="button" disabled>{es?'Ver':'View'}</button></span></label><label className="portal-remember"><input type="checkbox" readOnly tabIndex={-1}/><span>{es?'Recordarme':'Remember me'}</span></label><button className="portal-loading-submit" type="button" disabled aria-busy="true">{copy.enter}</button></form><span className="portal-loading-recovery" aria-hidden="true">{es?'¿Olvidaste tu contraseña?':'Forgot password?'}</span>
  <span className="portal-loading-status" role="status" aria-live="polite">{es?'Preparando WebFactory…':'Preparing WebFactory…'}</span>
 </section></main>
}
