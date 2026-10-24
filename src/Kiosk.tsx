import {useKioskCore} from './useKioskCore'
import KioskRenderer from './KioskRenderer'
export default function Kiosk(props:{lang:'es'|'en';setLang:(lang:'es'|'en')=>void;pairing:string}){
 const model=useKioskCore(props)
 return <KioskRenderer model={model} lang={props.lang}/>
}
