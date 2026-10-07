import {navigatePortal} from './portal-navigation'
export default function PortalReturnHome({lang}:{lang:'es'|'en'}) {
  return <button type="button" className="portal-return-home" onClick={()=>navigatePortal('/')}><span aria-hidden="true">←</span>{lang==='es'?'Volver a WebFactory PR':'Return to WebFactory PR'}</button>
}
