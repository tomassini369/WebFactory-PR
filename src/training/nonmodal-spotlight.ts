import {driver} from 'driver.js'

export type Spotlight={destroy:()=>void}
/** Driver 1.9 installs a Tab trap even when allowKeyboardControl is false.
 * Keep only its visual positioning. Remove its own listener (never another
 * component's listener) and retain ordinary portal keyboard navigation.
 * If that version-specific hook changes, use the scoped CSS focus ring. */
export function highlightControl(element:HTMLElement):Spotlight{
 const attributes=['aria-haspopup','aria-expanded','aria-controls']
 const original=attributes.map(attribute=>element.getAttribute(attribute))
 element.setAttribute('data-training-current','true')
 const instance=driver({animate:false,smoothScroll:false,overlayOpacity:0,stagePadding:5,stageRadius:8,disableActiveInteraction:false,allowScroll:true,allowKeyboardControl:false,allowClose:true,overlayClickBehavior:'none',showButtons:[]})
 instance.highlight({element})
 const listener=instance.getState().__events?.onKeydown
 if(listener)window.removeEventListener('keydown',listener)
 else instance.destroy()
 const restore=()=>attributes.forEach((attribute,i)=>{if(original[i]===null)element.removeAttribute(attribute);else element.setAttribute(attribute,original[i]!)})
 restore()
 return {destroy(){const focused=document.activeElement;instance.destroy();element.removeAttribute('data-training-current');restore();if(focused instanceof HTMLElement&&focused.isConnected)focused.focus({preventScroll:true})}}
}
