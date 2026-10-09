import React, { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, MoreHorizontal, MapPin, Compass } from 'lucide-react'

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
}) {
  const cardRef = useRef(null)

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
    <motion.div
      ref={cardRef}
      className={`glass-card-wrapper ${isActive ? 'is-active' : 'is-side'}`}
      style={{
        zIndex,
        pointerEvents,
      }}
      animate={{
        x,
        z,
        rotateY,
        scale,
        opacity,
      }}
      transition={{
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
            alt={movie.title}
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
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <button
                type="button"
                className="card-expand-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onExpand(movie)
                }}
                aria-label="Expand Movie Details"
              >
                <Maximize2 size={13} className="expand-icon" />
                <span>Expand</span>
              </button>

              <button
                type="button"
                className="card-more-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenMenu(movie)
                }}
                aria-label="More options"
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="card-title-header">
                <h2 className="card-movie-title">{movie.title}</h2>
                <span className="card-counter">
                  {index + 1} / {total}
                </span>
              </div>

              <p className="card-description-text">{movie.description}</p>

              <div className="card-location-meta">
                <div className="meta-row primary-loc">
                  <MapPin size={13} className="meta-icon" />
                  <span className="meta-text">{movie.location}</span>
                </div>
                <div className="meta-row coords-row">
                  <Compass size={12} className="meta-icon dim" />
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
    </motion.div>
  )
}
