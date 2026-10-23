import {Store} from 'lucide-react'
import './marketplace-return.css'
export default function MarketplaceReturn({lang}:{lang:'es'|'en'}){
 const label=lang==='es'?'Volver al Marketplace':'Return to Marketplace'
 return <a className="wf-marketplace-return" href="/" aria-label={label} title={label}><Store size={22} aria-hidden="true"/><span>Marketplace</span></a>
}
