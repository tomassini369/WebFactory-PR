import React from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Heart, Play, Pause } from 'lucide-react'

export function BottomControlDock({
  currentMovie,
  onPrev,
  onNext,
  isFavorite,
  onToggleFavorite,
  isPlaying,
  onTogglePlay,
  onSelectCurrent,
}) {
  return (
    <div className="glass-dock-bottom" aria-label="Carousel Controls">
      <motion.div
        className="bottom-pill"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Previous Button */}
        <button
          type="button"
          className="dock-ctrl-circle-btn"
          onClick={onPrev}
          aria-label="Previous Slide"
          title="Previous (Left Arrow)"
        >
          <ChevronLeft size={19} className="ctrl-chevron" />
        </button>

        {/* Play/Pause Button */}
        <button
          type="button"
          className={`dock-ctrl-circle-btn ${isPlaying ? 'autoplay-active' : ''}`}
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
          title={isPlaying ? 'Pause auto-rotation' : 'Play auto-rotation'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        {/* Center Thumbnail + Metadata */}
        <button
          type="button"
          className="dock-center-info-btn"
          onClick={onSelectCurrent}
          title="View active movie details"
        >
          <div className="dock-avatar-frame">
            <motion.img
              key={currentMovie.id}
              src={currentMovie.image}
              alt={currentMovie.title}
              className="dock-avatar-img"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="dock-meta-text">
            <div className="dock-title-row">
              <span className="dock-main-title">{currentMovie.title}</span>
              <span className="dock-badge-tag">{currentMovie.rating} ★</span>
            </div>
            <span className="dock-sub-tagline">
              {currentMovie.tagline || currentMovie.subtitle}
            </span>
          </div>
        </button>

        {/* Favorite Heart Button */}
        <button
          type="button"
          className={`dock-ctrl-circle-btn ${isFavorite ? 'favorite-active' : ''}`}
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          title="Favorite"
        >
          <Heart
            size={17}
            className={`heart-icon ${isFavorite ? 'heart-filled' : ''}`}
            fill={isFavorite ? '#ff4b6e' : 'none'}
            color={isFavorite ? '#ff4b6e' : 'currentColor'}
          />
        </button>

        {/* Next Button */}
        <button
          type="button"
          className="dock-ctrl-circle-btn"
          onClick={onNext}
          aria-label="Next Slide"
          title="Next (Right Arrow)"
        >
          <ChevronRight size={19} className="ctrl-chevron" />
        </button>
      </motion.div>
    </div>
  )
}
