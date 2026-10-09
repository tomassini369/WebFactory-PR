import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Calendar, Clock, Film, Sparkles, Volume2, Share2, Heart } from 'lucide-react'

export function MovieModal({
  movie,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
}) {
  if (!isOpen || !movie) return null

  return (
    <AnimatePresence>
      <div className="glass-modal-backdrop" onClick={onClose}>
        <motion.div
          className="glass-modal-window"
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Edge Reflection */}
          <div className="glass-reflection-rim" />

          {/* Close Button */}
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          <div className="modal-content-grid">
            {/* Left Poster Image Column */}
            <div className="modal-poster-col">
              <div className="modal-poster-frame">
                <img
                  src={movie.image}
                  alt={movie.title}
                  className="modal-poster-img"
                />
                <span className="modal-badge">{movie.badge}</span>
              </div>
            </div>

            {/* Right Details Column */}
            <div className="modal-info-col">
              <div className="modal-header-meta">
                <span className="modal-category">{movie.category}</span>
                <div className="modal-rating">
                  <Star size={16} fill="#fbbf24" color="#fbbf24" />
                  <span>{movie.rating} / 10 IMDb</span>
                </div>
              </div>

              <h2 className="modal-title">{movie.title}</h2>
              <p className="modal-tagline">“{movie.tagline}”</p>

              <div className="modal-quick-stats">
                <div className="stat-pill">
                  <Calendar size={14} />
                  <span>{movie.year}</span>
                </div>
                <div className="stat-pill">
                  <Clock size={14} />
                  <span>{movie.duration}</span>
                </div>
                <div className="stat-pill">
                  <Film size={14} />
                  <span>{movie.director}</span>
                </div>
              </div>

              <p className="modal-description">{movie.description}</p>

              <div className="modal-extra-details">
                <div className="detail-row">
                  <span className="label">Director:</span>
                  <span className="val">{movie.director}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Musical Score:</span>
                  <span className="val">{movie.composer}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Starring Cast:</span>
                  <span className="val">{movie.cast}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Spatial Coordinates:</span>
                  <span className="val">{movie.coordinates}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="modal-action-primary"
                  onClick={() => alert(`Enjoy watching ${movie.title} in Spatial Audio!`)}
                >
                  <Sparkles size={16} />
                  <span>Watch in Vision Cinema</span>
                </button>

                <button
                  type="button"
                  className={`modal-action-secondary ${isFavorite ? 'active' : ''}`}
                  onClick={onToggleFavorite}
                  aria-label="Add to favorites"
                >
                  <Heart
                    size={16}
                    fill={isFavorite ? '#ff4b6e' : 'none'}
                    color={isFavorite ? '#ff4b6e' : 'currentColor'}
                  />
                  <span>{isFavorite ? 'Saved' : 'Bookmark'}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
