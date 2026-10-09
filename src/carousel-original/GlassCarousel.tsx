import { useState, useEffect, useRef } from 'react'
import { motion, type PanInfo } from 'framer-motion'
import {usePrefersReducedMotion as useReducedMotion} from '../usePrefersReducedMotion'
import { GlassCard, type Highlight } from './GlassCard'

export function GlassCarousel({
  movies,
  activeIndex,
  onChangeIndex,
  onExpandMovie,
  onOpenMenu,
  onPlaySound,
}: {movies:Highlight[]; activeIndex:number; onChangeIndex:(index:number)=>void; onExpandMovie:(item:Highlight)=>void; onOpenMenu:(item:Highlight)=>void; onPlaySound?:()=>void}) {
  const rail=useRef<HTMLDivElement>(null)
  const reduced=useReducedMotion()
  const [xOffset, setXOffset] = useState(310)

  // Dynamically adapt 3D spacing to screen size
  useEffect(() => {
    const view=rail.current?.ownerDocument.defaultView??window
    const handleResize = () => {
      const w = view.innerWidth
      if (w < 600) {
        setXOffset(180)
      } else if (w < 900) {
        setXOffset(230)
      } else if (w < 1200) {
        setXOffset(270)
      } else {
        setXOffset(310)
      }
    }

    handleResize()
    view.addEventListener('resize', handleResize)
    return () => view.removeEventListener('resize', handleResize)
  }, [])

  const total = movies.length

  const getDiff = (index:number) => {
    let diff = (index - activeIndex) % total
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total
    return diff
  }

  // Swipe handling
  const handleDragEnd = (_:MouseEvent|TouchEvent|PointerEvent, info:PanInfo) => {
    const swipeThreshold = 45
    if (info.offset.x > swipeThreshold) {
      onChangeIndex((activeIndex - 1 + total) % total)
      if (onPlaySound) onPlaySound()
    } else if (info.offset.x < -swipeThreshold) {
      onChangeIndex((activeIndex + 1) % total)
      if (onPlaySound) onPlaySound()
    }
  }

  return (
    <div className="spatial-carousel-viewport template-spatial-stage" ref={rail} tabIndex={0} role="region" aria-roledescription="carousel" aria-label={movies[0]?.es?'Productos y servicios destacados':'Featured products and services'} onKeyDown={event=>{if(event.target!==event.currentTarget)return;const keys:Record<string,number>={ArrowLeft:(activeIndex-1+total)%total,ArrowRight:(activeIndex+1)%total,Home:0,End:total-1};if(event.key in keys){event.preventDefault();onChangeIndex(keys[event.key])}}}>
      <motion.div
        className="spatial-carousel-stage"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={reduced?0:0.2}
        onDragEnd={handleDragEnd}
      >
        {movies.map((movie, index) => {
          const diff = getDiff(index)
          const isActive = diff === 0

          return (
            <GlassCard
              key={movie.id}
              movie={movie}
              index={index}
              total={total}
              diff={diff}
              isActive={isActive}
              xOffset={xOffset}
              onSelect={(idx) => {
                onChangeIndex(idx)
                if (onPlaySound) onPlaySound()
              }}
              onExpand={onExpandMovie}
              onOpenMenu={onOpenMenu}
              onKeyboardSelect={()=>rail.current?.focus({preventScroll:true})}
            />
          )
        })}
      </motion.div>
    </div>
  )
}
