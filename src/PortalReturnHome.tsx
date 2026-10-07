import {navigatePortal} from './portal-navigation'
export default function PortalReturnHome({lang}:{lang:'es'|'en'}) {
  const label=lang==='es'?'Volver a WebFactory PR':'Return to WebFactory PR'
  return <button type="button" className="portal-return-home" aria-label={label} title={label} onClick={()=>navigatePortal('/')}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h5v-6h4v6h5V9"/></svg></button>
}
