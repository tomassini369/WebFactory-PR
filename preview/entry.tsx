import {createRoot} from 'react-dom/client'
import StitchControlCenterV2 from './StitchControlCenterV2'

window.fetch=async()=>{throw new Error('No network operations are allowed in this visual preview.')}

createRoot(document.getElementById('root')!).render(<StitchControlCenterV2/>)
