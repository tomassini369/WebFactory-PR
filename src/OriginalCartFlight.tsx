import {motion,AnimatePresence} from 'framer-motion'
/** Motion.img timeline copied from FlyToCart.jsx; source/target are the actual product and cart. */
export default function OriginalCartFlight({src,item}:{src:string;item:{startX:number;startY:number;width:number;height:number;endX:number;endY:number}}) {
  return <AnimatePresence><motion.img src={src} alt="" aria-hidden="true" className="wf-cart-flight" initial={{x:item.startX,y:item.startY,width:item.width,height:item.height,opacity:1}}
    animate={{x:item.endX,y:[item.startY,item.startY-80,item.endY],width:30,height:30,opacity:.8}}
    exit={{opacity:0}} transition={{duration:.7,x:{duration:.7,ease:'linear'},y:{duration:.7,ease:'easeInOut',times:[0,.4,1]},width:{duration:.7,ease:'easeInOut'},height:{duration:.7,ease:'easeInOut'},opacity:{duration:.7,ease:'linear'}}}
    style={{top:0,left:0,objectFit:'contain'}}/></AnimatePresence>
}
