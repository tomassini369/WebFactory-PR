import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {usePrefersReducedMotion as useReducedMotion} from '../usePrefersReducedMotion'
import { Maximize2, MoreHorizontal, Tag, BadgeCheck } from 'lucide-react'

export type Highlight = {id:string; title:string; image:string; description:string; location:string; coordinates:string; shortLocation:string; subtitle:string; es:boolean}

export function GlassCard({
  movie,
  index,
  total,
  diff,
  isActive,
  onSelect,
  onExpand,
  onOpenMenu,
  xOffset = 305,
  onKeyboardSelect,
}: {movie:Highlight; index:number; total:number; diff:number; isActive:boolean; onSelect:(index:number)=>void; onExpand:(item:Highlight)=>void; onOpenMenu:(item:Highlight)=>void; xOffset?:number; onKeyboardSelect:()=>void}) {
  const cardRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  // Calculate 3D Arc layout parameters
  const getTransform = () => {
    switch (diff) {
      case 0:
        return {
          x: 0,
          z: 0,
          rotateY: 0,
          scale: 1,
          opacity: 1,
          zIndex: 10,
          pointerEvents: 'auto',
        }
      case -1:
        return {
          x: -xOffset,
          z: -100,
          rotateY: 22,
          scale: 0.88,
          opacity: 0.88,
          zIndex: 8,
          pointerEvents: 'auto',
        }
      case 1:
        return {
          x: xOffset,
          z: -100,
          rotateY: -22,
          scale: 0.88,
          opacity: 0.88,
          zIndex: 8,
          pointerEvents: 'auto',
        }
      case -2:
        return {
          x: -xOffset * 1.8,
          z: -200,
          rotateY: 36,
          scale: 0.74,
          opacity: 0.62,
          zIndex: 6,
          pointerEvents: 'auto',
        }
      case 2:
        return {
          x: xOffset * 1.8,
          z: -200,
          rotateY: -36,
          scale: 0.74,
          opacity: 0.62,
          zIndex: 6,
          pointerEvents: 'auto',
        }
      case -3:
        return {
          x: -xOffset * 2.5,
          z: -300,
          rotateY: 46,
          scale: 0.60,
          opacity: 0.32,
          zIndex: 4,
          pointerEvents: 'auto',
        }
      case 3:
        return {
          x: xOffset * 2.5,
          z: -300,
          rotateY: -46,
          scale: 0.60,
          opacity: 0.32,
          zIndex: 4,
          pointerEvents: 'auto',
        }
      default:
        return {
          x: diff < 0 ? -xOffset * 3 : xOffset * 3,
          z: -400,
          rotateY: diff < 0 ? 55 : -55,
          scale: 0.45,
          opacity: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }
    }
  }

  const { x, z, rotateY, scale, opacity, zIndex, pointerEvents } = getTransform()

  return (
    <motion.article
      ref={cardRef}
      data-active={isActive} data-index={index}
      role={isActive ? 'group' : 'button'} tabIndex={isActive ? undefined : 0}
      aria-label={`${index+1} / ${total}: ${movie.title}`}
      onKeyDown={event=>{if(!isActive && (event.key==='Enter'||event.key===' ')){event.preventDefault();onSelect(index);onKeyboardSelect()}}}
      className={`template-spatial-card glass-card-wrapper ${isActive ? 'is-active' : 'is-side'}`}
      style={{
        zIndex,
        pointerEvents: pointerEvents as 'auto' | 'none',
      }}
      animate={{
        x,
        z,
        rotateY,
        scale,
        opacity,
      }}
      transition={reduced ? {duration:0} : {
        type: 'spring',
        stiffness: 220,
        damping: 30,
        mass: 0.85,
      }}
      onClick={() => {
        if (!isActive) onSelect(index)
      }}
    >
      <div className="glass-card-inner">
        {/* Specular glass reflection rim and shine */}
        <div className="glass-reflection-rim" />
        <div className="glass-top-shine" />

        {/* Media Layer: Image with top-to-bottom cinematic fade */}
        <div className={`card-media-layer ${isActive ? 'is-active-media' : 'is-side-media'}`}>
          <img
            src={movie.image}
            alt="" draggable={false}
            className="card-media-img"
            loading="eager"
          />
          <div className="card-media-scrim" />
        </div>

        {/* Top Floating Glass Controls on active card */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="card-top-controls"
              initial={reduced?false:{opacity: 0, y: -8}}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: reduced?0:0.25 }}
            >
              <button
                type="button"
                className="card-expand-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onExpand(movie)
                }}
                aria-label={movie.es?'Ampliar detalles':'Expand details'}
              >
                <Maximize2 size={13} className="expand-icon" />
                <span>{movie.es?'Ampliar':'Expand'}</span>
              </button>

              <button
                type="button"
                className="card-more-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenMenu(movie)
                }}
                aria-label={movie.es?'Más opciones':'More options'}
              >
                <MoreHorizontal size={17} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Layer: Smooth transition between active details and side preview */}
        <div className={`card-text-layer ${isActive ? 'active-text-layer' : 'side-text-layer'}`}>
          {isActive ? (
            <motion.div
              key={`active-${movie.id}`}
              className="active-details-wrapper"
              initial={reduced?false:{opacity: 0, y: 10}}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: reduced?0:0.3, ease: 'easeOut' }}
            >
              <div className="card-title-header">
                <h3 className="card-movie-title">{movie.title}</h3>
                <span className="card-counter">
                  {index + 1} / {total}
                </span>
              </div>

              <p tabIndex={isActive?0:undefined} className="card-description-text">{movie.description}</p>

              <div className="card-location-meta">
                <div className="meta-row primary-loc">
                  <Tag size={13} className="meta-icon" />
                  <span className="meta-text">{movie.location}</span>
                </div>
                <div className="meta-row coords-row">
                  <BadgeCheck size={12} className="meta-icon dim" />
                  <span className="meta-coords">{movie.coordinates}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="side-details-wrapper">
              <h3 className="side-card-title">{movie.title}</h3>
              <p className="side-card-subtitle">
                {movie.shortLocation || movie.subtitle}
              </p>
            </div>
          )}
        </div>

        {/* Side card hover glow */}
        {!isActive && <div className="side-card-hover-curtain" />}
      </div>
    </motion.article>
  )
}
