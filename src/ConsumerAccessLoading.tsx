import MarketplaceHeader from './MarketplaceHeader'
import './marketplace.css'
import './consumer-auth.css'

export default function ConsumerAccessLoading({lang,setLang}:{lang:'es'|'en';setLang:(lang:'es'|'en')=>void}) {
 const es=lang==='es',signup=new URLSearchParams(location.search).get('modo')==='crear'
 return <div className="mk-root mk-consumer-access" aria-busy="true"><MarketplaceHeader lang={lang} setLang={setLang}/><main className="mk-shell mk-account-wrap"><section className="mk-auth-card consumer-access-loading">
  <h1>{signup?(es?'Crea tu perfil':'Create your profile'):(es?'Bienvenido de nuevo':'Welcome back')}</h1><p>{es?'Tu cuenta de consumidor del Marketplace. Guarda negocios y explora Puerto Rico.':'Your Marketplace consumer account. Save businesses and explore Puerto Rico.'}</p>
  <form className="mk-auth-form wf-login-form" inert aria-hidden="true" onSubmit={event=>event.preventDefault()}>{signup&&<label>{es?'Nombre':'Name'}<input className="consumer-loading-field" type="text" readOnly autoComplete="off" tabIndex={-1}/></label>}<label>{es?'Correo electrónico':'Email'}<input className="consumer-loading-field" type="text" readOnly autoComplete="off" tabIndex={-1}/></label><label>{es?'Contraseña':'Password'}<input className="consumer-loading-field" type="text" readOnly autoComplete="off" tabIndex={-1}/>{signup&&<small>{es?'Al menos 15 caracteres.':'At least 15 characters.'}</small>}</label>
  {signup&&<><label className="mk-terms"><input type="checkbox" disabled tabIndex={-1}/><span>{es?'Tengo 18 años o más. Puedes explorar sin cuenta si eres menor.':'I am 18 or older. Younger visitors may browse without an account.'}</span></label><label className="mk-terms"><input type="checkbox" disabled tabIndex={-1}/><span>{es?'Acepto los ':'I accept the '}<a>{es?'Términos':'Terms'}</a>{es?' y la ':' and the '}<a>{es?'Privacidad':'Privacy Policy'}</a>.</span></label></>}
  <button className="consumer-loading-submit" type="button" disabled aria-busy="true">{signup?(es?'Crear cuenta':'Create account'):(es?'Iniciar sesión':'Sign in')}</button></form>
  <div className="mk-auth-links consumer-loading-links" aria-hidden="true"><span>{signup?(es?'Ya tengo cuenta. Iniciar sesión':'I have an account. Sign in'):(es?'Crear un perfil de consumidor':'Create a consumer profile')}</span>{!signup&&<span>{es?'¿Olvidaste tu contraseña?':'Forgot your password?'}</span>}<span>{es?'Acceso para dueños y empleados':'Owner and employee access'}</span><span>{es?'Continuar explorando sin cuenta':'Continue exploring without an account'}</span></div>
 </section><p className="mk-sr-only" role="status">{es?'Preparando WebFactory…':'Preparing WebFactory…'}</p></main></div>
}
