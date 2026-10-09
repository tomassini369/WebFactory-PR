import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from './GlassCard'

export function GlassCarousel({
  movies,
  activeIndex,
  onChangeIndex,
  onExpandMovie,
  onOpenMenu,
  onPlaySound,
}) {
  const [xOffset, setXOffset] = useState(310)

  // Dynamically adapt 3D spacing to screen size
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
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
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const total = movies.length

  const getDiff = (index) => {
    let diff = (index - activeIndex) % total
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total
    return diff
  }

  // Swipe handling
  const handleDragEnd = (_, info) => {
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
    <div className="spatial-carousel-viewport">
      <motion.div
        className="spatial-carousel-stage"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
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
            />
          )
        })}
      </motion.div>
    </div>
  )
}
