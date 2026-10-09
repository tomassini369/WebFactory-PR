import {useCallback,useEffect,useRef} from 'react'
import {createRoot, type Root} from 'react-dom/client'
import {createElement} from 'react'
import {animate} from 'framer-motion'
import OriginalCartFlight from './OriginalCartFlight'

/** Original 700ms flight and cart spring, with synchronous authoritative cart mutations in callers. */
export function useFlyToCart() {
  const active=useRef<(()=>void)|null>(null)
  useEffect(()=>()=>active.current?.(),[])
  return useCallback((source?:HTMLElement)=>{
    if(!source||active.current)return
    const doc=source.ownerDocument,view=doc.defaultView
    if(!view||view.matchMedia('(prefers-reduced-motion: reduce)').matches)return
    const image=source.closest('.template-catalog-card,.template-detail-modal')?.querySelector<HTMLImageElement>('img')
    const scope=source.closest('.template-site')
    if(!image||!scope||!image.currentSrc||!image.complete||!image.naturalWidth)return
    const imageRect=image.getBoundingClientRect()
    if(!imageRect.width||!imageRect.height)return
    let node:HTMLElement|null=null,root:Root|null=null,frame=0,timer=0
    let wiggle:ReturnType<typeof animate>|null=null
    let destination:HTMLElement|null=null,originalTransform=''
    const previousOpacity=image.style.opacity
    const dispose=()=>{
      view.cancelAnimationFrame(frame);view.clearTimeout(timer);wiggle?.stop()
      image.style.opacity=previousOpacity
      if(destination)destination.style.transform=originalTransform
      if(root){const mountedRoot=root;view.setTimeout(()=>mountedRoot.unmount(),0);root=null}
      node?.remove();active.current=null
    }
    active.current=dispose
    // Wait for the existing checkout destination to mount; do not delay adding the actual item.
    frame=view.requestAnimationFrame(()=>{frame=view.requestAnimationFrame(()=>{
      destination=scope.querySelector<HTMLElement>('[data-cart-flight-target]')
      if(!destination){dispose();return}
      originalTransform=destination.style.transform
      const cartRect=destination.getBoundingClientRect()
      if(!cartRect.width){dispose();return}
      node=doc.createElement('div');node.setAttribute('aria-hidden','true')
      Object.assign(node.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'2147483000'})
      doc.body.append(node);root=createRoot(node);image.style.opacity='0.3'
      root.render(createElement(OriginalCartFlight,{src:image.currentSrc,item:{startX:imageRect.left,startY:imageRect.top,width:imageRect.width,height:imageRect.height,
        endX:cartRect.left+cartRect.width/2-20,endY:cartRect.top+cartRect.height/2-20}}))
      timer=view.setTimeout(()=>{
        if(root){const mountedRoot=root;mountedRoot.unmount();root=null}node?.remove();image.style.opacity=previousOpacity
        wiggle=animate(destination!,{scale:1.15,rotate:-15},{type:'spring',stiffness:400,damping:10})
        timer=view.setTimeout(()=>{
          wiggle?.stop()
          wiggle=animate(destination!,{scale:1,rotate:0},{type:'spring',stiffness:400,damping:10})
          void wiggle.finished.then(dispose,dispose)
        },200)
      },700)
    })})
  },[])
}
