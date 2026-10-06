import {createRoot} from 'react-dom/client'
import StitchHomeV2 from './StitchHomeV2'

window.fetch=async()=>{throw new Error('No network operations are allowed in this visual preview.')}

createRoot(document.getElementById('root')!).render(<StitchHomeV2/>)
