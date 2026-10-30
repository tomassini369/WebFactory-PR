import {useRef,type InputHTMLAttributes,type PointerEvent} from 'react'

type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'onChange'|'value'> & {value:number;onValueChange:(value:number)=>void}

// Keep vertical gestures native. Commit a touch value only after horizontal
// intent (or a completed tap), so scrolling over a track cannot edit a draft.
export function TouchRange({value,onValueChange,...props}:Props){
 const gesture=useRef<{id:number;x:number;y:number;horizontal:boolean;vertical:boolean}|null>(null)
 const update=(event:PointerEvent<HTMLInputElement>)=>{
  const input=event.currentTarget,box=input.getBoundingClientRect(),min=Number(input.min),max=Number(input.max),step=Number(input.step)||1
  const ratio=Math.max(0,Math.min(1,(event.clientX-box.left-12)/Math.max(1,box.width-24)))
  const raw=min+Math.round(ratio*(max-min)/step)*step
  onValueChange(Number(Math.max(min,Math.min(max,raw)).toFixed(6)))
 }
 return <input {...props} type="range" value={value} className={['gd-touch-range',props.className].filter(Boolean).join(' ')} onChange={e=>{if(gesture.current){e.target.value=String(value);return}onValueChange(Number(e.target.value))}}
  onPointerDown={event=>{
   if(event.pointerType!=='touch'||!event.isPrimary||event.currentTarget.disabled)return
   event.preventDefault();event.currentTarget.focus({preventScroll:true})
   gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,horizontal:false,vertical:false}
   event.currentTarget.setPointerCapture(event.pointerId)
  }}
  onPointerMove={event=>{
   const start=gesture.current;if(!start||start.id!==event.pointerId||start.vertical)return
   const dx=Math.abs(event.clientX-start.x),dy=Math.abs(event.clientY-start.y)
   if(!start.horizontal){if(dy>8&&dy>=dx){start.vertical=true;return}if(dx<=8||dx<=dy)return;start.horizontal=true}
   update(event)
  }}
  onPointerUp={event=>{const start=gesture.current;if(start?.id!==event.pointerId)return;if(!start.vertical)update(event);gesture.current=null}}
  onPointerCancel={event=>{event.currentTarget.value=String(value);gesture.current=null}}
  onLostPointerCapture={()=>{gesture.current=null}}
 />
}
