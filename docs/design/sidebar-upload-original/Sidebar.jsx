import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Sidebar.css';

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState('home');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const toggleSidebar = () => {
    setIsExpanded((prev) => !prev);
  };

  // macOS Dock magnification scale calculation
  const getDockScale = (index) => {
    if (hoveredIndex === null) return 1;
    const dist = Math.abs(hoveredIndex - index);
    if (dist === 0) return 1.25;  // Main hovered item
    if (dist === 1) return 1.12;  // Adjacent neighbor
    if (dist === 2) return 1.04;  // Secondary neighbor
    return 1;
  };

  return (
    <motion.aside 
      className={`sidebar-container ${isExpanded ? 'expanded' : 'collapsed'}`} 
      animate={{ width: isExpanded ? 240 : 74 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
      aria-label="Main Navigation"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {/* Top Window Controls (macOS Traffic Lights) */}
      <div className="sidebar-traffic-lights">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
      </div>

      {/* Brand / Logo & Header Section */}
      <div className="sidebar-brand-wrapper">
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div 
              key="collapsed-brand"
              className="sidebar-brand-collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="sidebar-brand-logo">S</div>
            </motion.div>
          ) : (
            <motion.div 
              key="expanded-brand"
              className="sidebar-brand-expanded"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.2 }}
            >
              <span className="sidebar-expanded-title">SideBar UI</span>
              <div className="sidebar-bell-btn" title="4 notifications">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>
                <span className="sidebar-bell-badge">4</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Expand/Collapse Button on Right Edge */}
        <button 
          type="button" 
          className={`sidebar-expand-btn ${isExpanded ? 'is-expanded' : ''}`}
          onClick={toggleSidebar}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {isExpanded ? (
              <polyline points="15 18 9 12 15 6" />
            ) : (
              <polyline points="9 18 15 12 9 6" />
            )}
          </svg>
          {isExpanded && <span className="sidebar-collapse-pill">Collapse</span>}
        </button>
      </div>

      {/* Divider */}
      <motion.div 
        className="sidebar-divider"
        animate={{ width: isExpanded ? 200 : 46 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      />

      {/* User Profile Card */}
      <div className="sidebar-profile-section">
        <div className="sidebar-profile-card" title="Dorian">
          <div className="sidebar-avatar-wrapper">
            <img 
              src="/avatar.png" 
              alt="Dorian" 
              className="sidebar-avatar-img"
            />
          </div>

          {/* Profile Name & Switch Account (Expanded) */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                className="sidebar-profile-details"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="sidebar-profile-name">Dorian</div>
                <div className="sidebar-profile-switch">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 17h14M15 14l3 3-3 3M20 7H6M9 4L6 7l3 3" />
                  </svg>
                  <span>Switch account</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile Chevron (Expanded) */}
          {isExpanded && (
            <svg className="sidebar-profile-chevron" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </div>
      </div>

      {/* Divider */}
      <motion.div 
        className="sidebar-divider"
        animate={{ width: isExpanded ? 200 : 46 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      />

      {/* MENU Section */}
      <div className="sidebar-section">
        {/* Search Row: Diamond Lozenge + Search Input */}
        <div className="sidebar-search-row">
          <div className="sidebar-menu-lozenge">
            <span className="sidebar-lozenge-dot" />
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                className="sidebar-search-box"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '100%' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                <input 
                  type="text" 
                  placeholder="SEARCH..." 
                  className="sidebar-search-input" 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className="sidebar-section-title">MENU</span>

        <nav className="sidebar-nav-list">
          {/* 0. Home */}
          <button 
            type="button"
            className={`sidebar-nav-item ${activeItem === 'home' ? 'active' : ''}`}
            onClick={() => setActiveItem('home')}
            onMouseEnter={() => setHoveredIndex(0)}
            aria-label="Home"
            data-tooltip={!isExpanded ? "Home" : undefined}
          >
            <div className="sidebar-nav-icon-slot">
              <motion.div 
                className="sidebar-dock-icon-wrapper"
                animate={{ scale: getDockScale(0) }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" className="sidebar-svg-icon" fill="currentColor">
                  <path d="M12 3.2L3.5 11h2.7v9a1 1 0 001 1h9.6a1 1 0 001-1v-9h2.7L12 3.2z M10.8 15.5h2.4c.5 0 .9.4.9.9v4.6h-4.2v-4.6c0-.5.4-.9.9-.9z" />
                </svg>
              </motion.div>
            </div>
            {isExpanded && <span className="sidebar-nav-label">Home</span>}
          </button>

          {/* 1. Continue watching */}
          <button 
            type="button"
            className={`sidebar-nav-item ${activeItem === 'play' ? 'active' : ''}`}
            onClick={() => setActiveItem('play')}
            onMouseEnter={() => setHoveredIndex(1)}
            aria-label="Continue watching"
            data-tooltip={!isExpanded ? "Continue watching" : undefined}
          >
            <div className="sidebar-nav-icon-slot">
              <motion.div 
                className="sidebar-dock-icon-wrapper"
                animate={{ scale: getDockScale(1) }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <div className="sidebar-badge-circle">
                  <svg viewBox="0 0 24 24" width="9" height="9" fill="#ffffff">
                    <polygon points="7,4 20,12 7,20" />
                  </svg>
                </div>
              </motion.div>
            </div>
            {isExpanded && <span className="sidebar-nav-label">Continue watching</span>}
          </button>

          {/* 2. My List */}
          <button 
            type="button"
            className={`sidebar-nav-item ${activeItem === 'plus' ? 'active' : ''}`}
            onClick={() => setActiveItem('plus')}
            onMouseEnter={() => setHoveredIndex(2)}
            aria-label="My List"
            data-tooltip={!isExpanded ? "My List" : undefined}
          >
            <div className="sidebar-nav-icon-slot">
              <motion.div 
                className="sidebar-dock-icon-wrapper"
                animate={{ scale: getDockScale(2) }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <div className="sidebar-badge-circle">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              </motion.div>
            </div>
            {isExpanded && <span className="sidebar-nav-label">My List</span>}
            {isExpanded && <span className="sidebar-item-badge">7</span>}
          </button>

          {/* 3. Series */}
          <button 
            type="button"
            className={`sidebar-nav-item ${activeItem === 'tv' ? 'active' : ''}`}
            onClick={() => setActiveItem('tv')}
            onMouseEnter={() => setHoveredIndex(3)}
            aria-label="Series"
            data-tooltip={!isExpanded ? "Series" : undefined}
          >
            <div className="sidebar-nav-icon-slot">
              <motion.div 
                className="sidebar-dock-icon-wrapper"
                animate={{ scale: getDockScale(3) }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <svg viewBox="0 0 24 24" width="19" height="19" className="sidebar-svg-icon" fill="currentColor">
                  <path d="M7.8 2.2a.9.9 0 011.2-.4l2.5 1.7 2.5-1.7a.9.9 0 011.2.4.9.9 0 01-.4 1.2L12.5 5h4.7A3.8 3.8 0 0121 8.8v8.4A3.8 3.8 0 0117.2 21H6.8A3.8 3.8 0 013 17.2V8.8A3.8 3.8 0 016.8 5h4.7L9 3.4a.9.9 0 01-.4-1.2zM6.8 6.8c-1.1 0-2 .9-2 2v8.4c0 1.1.9 2 2 2h10.4c1.1 0 2-.9 2-2V8.8c0-1.1-.9-2-2-2H6.8z" />
                  <rect x="5.5" y="8" width="9.5" height="9" rx="1.5" fill="#ffffff" />
                  <circle cx="17.5" cy="10" r="1.1" fill="#ffffff" />
                  <circle cx="17.5" cy="13" r="1.1" fill="#ffffff" />
                  <rect x="16.5" y="15.2" width="2" height="1.2" rx="0.5" fill="#ffffff" />
                </svg>
              </motion.div>
            </div>
            {isExpanded && <span className="sidebar-nav-label">Series</span>}
          </button>

          {/* 4. Movies */}
          <button 
            type="button"
            className={`sidebar-nav-item ${activeItem === 'movies' ? 'active' : ''}`}
            onClick={() => setActiveItem('movies')}
            onMouseEnter={() => setHoveredIndex(4)}
            aria-label="Movies"
            data-tooltip={!isExpanded ? "Movies" : undefined}
          >
            <div className="sidebar-nav-icon-slot">
              <motion.div 
                className="sidebar-dock-icon-wrapper"
                animate={{ scale: getDockScale(4) }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <svg viewBox="0 0 24 24" width="19" height="19" className="sidebar-svg-icon" fill="currentColor">
                  <path d="M19.5 5.5l-2.4 2.4h-3.6l2.4-2.4h-3.4l-2.4 2.4H6.5l2.4-2.4H5.2c-1.2 0-2.2 1-2.2 2.2v10.6c0 1.2 1 2.2 2.2 2.2h13.6c1.2 0 2.2-1 2.2-2.2V7.7c0-1.2-1-2.2-2.2-2.2h-.7z M19 17.5c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-6.5c0-.6.4-1 1-1h12c.6 0 1 .4 1 1v6.5z" />
                </svg>
              </motion.div>
            </div>
            {isExpanded && <span className="sidebar-nav-label">Movies</span>}
          </button>

          {/* 5. Games */}
          <button 
            type="button"
            className={`sidebar-nav-item ${activeItem === 'games' ? 'active' : ''}`}
            onClick={() => setActiveItem('games')}
            onMouseEnter={() => setHoveredIndex(5)}
            aria-label="Games"
            data-tooltip={!isExpanded ? "Games" : undefined}
          >
            <div className="sidebar-nav-icon-slot">
              <motion.div 
                className="sidebar-dock-icon-wrapper"
                animate={{ scale: getDockScale(5) }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <svg viewBox="0 0 24 16" width="21" height="14" className="sidebar-svg-icon" fill="currentColor">
                  <path d="M18.5 1h-13C2.5 1 .5 3.5.5 6.8c0 3.8 2.3 8.2 5.5 8.2 2 0 3-1.8 3.8-3h4.4c.8 1.2 1.8 3 3.8 3 3.2 0 5.5-4.4 5.5-8.2C23.5 3.5 21.5 1 18.5 1zm-12 7.2H5.2V9.5H4v-1.3H2.8V7h1.2V5.7h1.2V7h1.3v1.2zm11.2.6a1 1 0 110-2 1 1 0 010 2zm2-2.2a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </motion.div>
            </div>
            {isExpanded && <span className="sidebar-nav-label">Games</span>}
          </button>
        </nav>
      </div>

      {/* Divider */}
      <motion.div 
        className="sidebar-divider"
        animate={{ width: isExpanded ? 200 : 46 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      />

      {/* DISCOVERY Section */}
      <div className="sidebar-section">
        <span className="sidebar-section-title">DISCOVERY</span>

        <nav className="sidebar-nav-list">
          {/* 6. Releases */}
          <button 
            type="button"
            className={`sidebar-nav-item ${activeItem === 'discovery' ? 'active' : ''}`}
            onClick={() => setActiveItem('discovery')}
            onMouseEnter={() => setHoveredIndex(6)}
            aria-label="Releases"
            data-tooltip={!isExpanded ? "Releases" : undefined}
          >
            <div className="sidebar-nav-icon-slot">
              <motion.div 
                className="sidebar-dock-icon-wrapper"
                animate={{ scale: getDockScale(6) }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" className="sidebar-svg-icon" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="3" width="13" height="13" rx="2.5" />
                  <rect x="3" y="8" width="13" height="13" rx="2.5" fill="rgba(255,255,255,0.15)" />
                </svg>
              </motion.div>
            </div>
            {isExpanded && <span className="sidebar-nav-label">Releases</span>}
          </button>

          {/* 7. Popular */}
          <button 
            type="button"
            className={`sidebar-nav-item ${activeItem === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveItem('favorites')}
            onMouseEnter={() => setHoveredIndex(7)}
            aria-label="Popular"
            data-tooltip={!isExpanded ? "Popular" : undefined}
          >
            <div className="sidebar-nav-icon-slot">
              <motion.div 
                className="sidebar-dock-icon-wrapper"
                animate={{ scale: getDockScale(7) }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <div className="sidebar-badge-circle">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="#ffffff">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                </div>
              </motion.div>
            </div>
            {isExpanded && <span className="sidebar-nav-label">Popular</span>}
          </button>
        </nav>
      </div>

      {/* Divider */}
      <motion.div 
        className="sidebar-divider"
        animate={{ width: isExpanded ? 200 : 46 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      />

      {/* GENERAL Section */}
      <div className="sidebar-section">
        <span className="sidebar-section-title">GENERAL</span>

        <nav className="sidebar-nav-list">
          {/* 8. Settings */}
          <button 
            type="button"
            className={`sidebar-nav-item ${activeItem === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveItem('settings')}
            onMouseEnter={() => setHoveredIndex(8)}
            aria-label="Settings"
            data-tooltip={!isExpanded ? "Settings" : undefined}
          >
            <div className="sidebar-nav-icon-slot">
              <motion.div 
                className="sidebar-dock-icon-wrapper"
                animate={{ scale: getDockScale(8) }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" className="sidebar-svg-icon" fill="currentColor">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84c-.24 0-.44.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z" />
                </svg>
              </motion.div>
            </div>
            {isExpanded && <span className="sidebar-nav-label">Settings</span>}
          </button>

          {/* 9. Log out */}
          <button 
            type="button"
            className={`sidebar-nav-item ${activeItem === 'logout' ? 'active' : ''}`}
            onClick={() => setActiveItem('logout')}
            onMouseEnter={() => setHoveredIndex(9)}
            aria-label="Log out"
            data-tooltip={!isExpanded ? "Log out" : undefined}
          >
            <div className="sidebar-nav-icon-slot">
              <motion.div 
                className="sidebar-dock-icon-wrapper"
                animate={{ scale: getDockScale(9) }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" className="sidebar-svg-icon" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 5 12 10 7" />
                  <line x1="5" y1="12" x2="15" y2="12" />
                </svg>
              </motion.div>
            </div>
            {isExpanded && <span className="sidebar-nav-label">Log out</span>}
          </button>
        </nav>
      </div>
    </motion.aside>
  );
}
