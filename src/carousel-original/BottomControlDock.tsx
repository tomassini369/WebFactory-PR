import {usePrefersReducedMotion} from '../usePrefersReducedMotion'
import type { Highlight } from './GlassCard'
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
  onSelectCurrent, total, activeIndex,
}: {currentMovie:Highlight; onPrev:()=>void; onNext:()=>void; isFavorite:boolean; onToggleFavorite:()=>void; isPlaying:boolean; onTogglePlay:()=>void; onSelectCurrent:()=>void; total:number; activeIndex:number}) {
  const reduced=usePrefersReducedMotion()
  return (
    <div className="glass-dock-bottom template-spatial-dock" aria-label="Carousel Controls">
      <motion.div
        className="bottom-pill"
        initial={reduced?false:{opacity: 0, y: 30, scale: 0.95}}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduced?0:0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Previous Button */}
        <button
          type="button"
          className="dock-ctrl-circle-btn"
          onClick={onPrev}
          disabled={total<2} aria-label={currentMovie.es?'Destacado anterior':'Previous highlight'}
          title="Previous (Left Arrow)"
        >
          <ChevronLeft size={19} className="ctrl-chevron" />
        </button>

        {/* Play/Pause Button */}
        <button
          type="button"
          className={`dock-ctrl-circle-btn ${isPlaying ? 'autoplay-active' : ''}`}
          onClick={onTogglePlay}
          disabled={total<2} aria-label={currentMovie.es?(isPlaying?'Pausar presentación':'Reproducir presentación'):(isPlaying?'Pause slideshow':'Play slideshow')}
          title={isPlaying ? 'Pause auto-rotation' : 'Play auto-rotation'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        {/* Center Thumbnail + Metadata */}
        <button
          type="button"
          className="dock-center-info-btn"
          onClick={onSelectCurrent}
          aria-label={currentMovie.es?'Ampliar detalles':'Expand details'}
        >
          <div className="dock-avatar-frame">
            <motion.img
              key={currentMovie.id}
              src={currentMovie.image}
              alt={currentMovie.title}
              className="dock-avatar-img"
              initial={reduced?false:{scale: 0.7, opacity: 0}}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduced?0:0.3 }}
            />
          </div>

          <div className="dock-meta-text">
            <div className="dock-title-row">
              <span className="dock-main-title">{currentMovie.title}</span>
              <span className="dock-badge-tag">{activeIndex+1} / {total}</span>
            </div>
            <span className="dock-sub-tagline">
              {currentMovie.subtitle}
            </span>
          </div>
        </button>

        {/* Favorite Heart Button */}
        <button
          type="button"
          className={`dock-ctrl-circle-btn ${isFavorite ? 'favorite-active' : ''}`}
          onClick={onToggleFavorite}
          aria-pressed={isFavorite} aria-label={currentMovie.es?(isFavorite?'Quitar de favoritos':'Añadir a favoritos'):(isFavorite?'Remove from favorites':'Add to favorites')}
          title="Favorite"
        >
          <Heart
            size={17}
            className={`heart-icon ${isFavorite ? 'heart-filled' : ''}`}
            fill={isFavorite?'currentColor':'none'}
            color="currentColor"
          />
        </button>

        {/* Next Button */}
        <button
          type="button"
          className="dock-ctrl-circle-btn"
          onClick={onNext}
          disabled={total<2} aria-label={currentMovie.es?'Siguiente destacado':'Next highlight'}
          title="Next (Right Arrow)"
        >
          <ChevronRight size={19} className="ctrl-chevron" />
        </button>
      </motion.div>
    </div>
  )
}
