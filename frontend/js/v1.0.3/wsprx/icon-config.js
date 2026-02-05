// ============================================================================
// ICON-CONFIG.JS - Icon URLs Configuration
// Centralized icon management with GitHub CDN fallback
// ============================================================================

/**
 * Icon URLs - can be local or remote (GitHub CDN)
 */
const IconConfig = {
  // Balloon and markers
  balloon: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/balloon.png",
  yellowDot: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/yellow-dot.png",
  redDot: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/red-dot.png",
  greenArrow: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/green_arrow.png",
  S29: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/S29.png",
  // UI icons
  aprs: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/aprs.png",
  habhub: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/habhub.png",
  map: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/map.png",
  mark: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/mark.gif",
  wind: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/wind.gif",
  wind1: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/wind1.gif",
  
  // Sun and environment
  sun: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/sun.png",
  
  // Special trackers
  buoy: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/buoy.png",
  buoy2: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/buoy2.png",
  autod: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/autod.png",
  
  // Null/transparent
  none: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/none.png",
  null: "https://raw.githubusercontent.com/bxyteam/balloons-lu7abf/refs/heads/main/frontend/images/null.png",
  "ppt": "https://i.postimg.cc/KYPcKgg5/ppt.gif",
  
  /**
   * Get icon URL with fallback
   * @param {string} name - Icon name
   * @param {string} fallback - Fallback icon name
   * @returns {string} Icon URL
   */
  get: function(name, fallback = 'balloon') {
    return this[name] || this[fallback] || this.balloon;
  },
  
  /**
   * Preload all icons
   */
  preload: function() {
    let loaded = 0;
    const total = Object.keys(this).filter(k => typeof this[k] === 'string').length;
    
    for (const key in this) {
      if (typeof this[key] === 'string') {
        const img = new Image();
        img.onload = () => {
          loaded++;
          if (loaded === total) {
            console.log(`[IconConfig] All ${total} icons preloaded`);
          }
        };
        img.onerror = () => {
          console.warn(`[IconConfig] Failed to load icon: ${key}`);
        };
        img.src = this[key];
      }
    }
  }
};

// Auto-preload icons when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => IconConfig.preload());
} else {
  IconConfig.preload();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IconConfig;
}
