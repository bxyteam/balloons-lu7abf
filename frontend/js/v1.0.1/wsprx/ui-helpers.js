/**
 * Helper: Update URL parameter without page reload
 */
function updateUrlParam(key, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState({}, '', url.toString());
}

/**
 * Mobile Layout Manager
 * Reorganizes page elements for better mobile UX
 * Order: Map -> Chart Buttons -> Form -> Tables
 */
function initializeMobileLayout() {
  if (window.innerWidth > 1024) return; // Desktop - no changes needed

  // Add collapsible form functionality on mobile
  if (window.innerWidth <= 768) {
    setupCollapsibleForm();
  }
 
  // Get all elements
  const mapContainer = document.getElementById('map-container');
  const formContainer = document.querySelector('#form-container');
  const tablesContainer = document.getElementById('tables-container');
  
  // Find or create chart buttons container
  let chartButtons = document.querySelector('#chart-buttons');  
  if (!mapContainer) return;
  
  // Set explicit order using CSS
  if (mapContainer) {
    mapContainer.style.order = '1';
  }
  
  if (chartButtons) {
    chartButtons.style.order = '2';
    chartButtons.id = chartButtons.id || 'chart-buttons';
    chartButtons.classList.add('mobile-chart-buttons');
    chartButtons.style.display = 'none';
    styleChartButtonsForMobile(chartButtons);
    
    // Move chart buttons after map if needed
    if (mapContainer.nextElementSibling !== chartButtons) {
      mapContainer.parentNode.insertBefore(chartButtons, mapContainer.nextElementSibling);
      chartButtons.style.display = 'none';
    }
  }
  
  if (formContainer) {
    formContainer.style.order = '3';
  }
  
  if (tablesContainer) {
    tablesContainer.style.order = '4';
  }

  // Ensure APRS.fi section is visible
  const aprsfi = document.getElementById('aprsfi');
  if (aprsfi) {
    aprsfi.style.display = 'flex';
    aprsfi.style.visibility = 'visible';
    aprsfi.style.opacity = '1';
  }
  document.getElementById("overlay-button").style.display = 'none';
  document
    .getElementById("chart-buttons").classList.remove("chart-buttons-outer");
  if (window.innerWidth > 1024){
    document
    .getElementById("chart-buttons").style.display = "flex";
  } else {
     document
      .getElementById("chart-buttons").style.display = "grid";
  }
}

/**
 * Setup collapsible form for mobile to save screen space
 */
function setupCollapsibleForm() {
  const formContainer = document.querySelector('#form-container');
  if (!formContainer) return;

  // Check if already setup
  if (formContainer.dataset.collapsibleSetup === 'true') return;
  formContainer.dataset.collapsibleSetup = 'true';

  // Start collapsed on mobile to save space
  formContainer.classList.add('collapsed');

  // Toggle on tap of the ::before pseudo-element area
  // Since we can't directly attach event to ::before, we attach to container top area
  let tappedRecently = false;
  
  formContainer.addEventListener('click', (e) => {
    // Only toggle if clicking near the top (where ::before pseudo-element is)
    const rect = formContainer.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    
    if (clickY < 44 && !tappedRecently) { // Top 44px area
      formContainer.classList.toggle('collapsed');
      tappedRecently = true;
      setTimeout(() => tappedRecently = false, 300); // Debounce
    }
  });
}

/**
 * Find chart buttons container by searching for buttons with chart-related onclick
 */
function findChartButtonsContainer() {
  const buttons = document.querySelectorAll('button[onclick*="chart"], button[onclick*="Chart"]');
  if (buttons.length > 0) {
    // Find common parent container
    const parent = buttons[0].parentElement;
    if (parent && parent.children.length > 3) {
      return parent;
    }
  }
  return null;
}

/**
 * Apply mobile-optimized styling to chart buttons
 */
function styleChartButtonsForMobile(container) {
  if (!container) return;
  
  container.style.display = 'none';
  container.style.gridTemplateColumns = 'repeat(5, 1fr)';
  container.style.gap = '4px';
  container.style.padding = '8px';
  container.style.background = 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)';
  container.style.borderTop = '2px solid #312e81';
  container.style.borderBottom = '2px solid #312e81';
  container.style.order = '2';
  
  // Style individual buttons with fixed height
  const buttons = container.querySelectorAll('button');
  const isMobile = window.innerWidth <= 768;
  const isExtraSmall = window.innerWidth <= 400;
  
  buttons.forEach(button => {
    if (isExtraSmall) {
      // 3 columns on very small screens
      button.style.flex = '1 1 calc(33.333% - 4px)';
      button.style.minWidth = '0';
      button.style.height = '50px';
      button.style.fontSize = '7px';
      button.style.padding = '3px 2px';
      
    } else if (isMobile) {
      // 4 columns on mobile
      button.style.flex = '1 1 calc(25% - 4px)';
      button.style.minWidth = '65px';
      button.style.height = '55px';
      button.style.fontSize = '8px';
      button.style.padding = '4px 2px';
    } else {
      // Tablet - 4 columns
      button.style.flex = '1 1 calc(25% - 6px)';
      button.style.minWidth = '70px';
      button.style.height = '60px';
      button.style.fontSize = '9px';
      button.style.padding = '4px 2px';
    }
    
    button.style.margin = '0';
    button.style.whiteSpace = 'normal';
    button.style.overflow = 'hidden';
    button.style.textOverflow = 'ellipsis';
    button.style.lineHeight = '1.1';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.textAlign = 'center';
    button.style.wordWrap = 'break-word';
    button.style.border = "1px solid var(--accent) !important";
  });
}

/**
 * Handle window resize
 */
function handleMobileResize() {
  const isMobile = window.innerWidth <= 1024;
  
  if (isMobile) {
    initializeMobileLayout();
  }
}


function addScrollIndicator(container) {
  if (!container) return;
  
  const checkScroll = () => {
    const hasScroll = container.scrollWidth > container.clientWidth;
    if (hasScroll) {
      container.classList.add('has-scroll');
    } else {
      container.classList.remove('has-scroll');
    }
  };
  
  checkScroll();
  window.addEventListener('resize', checkScroll);
  
  // Remove indicator when scrolled to end
  container.addEventListener('scroll', () => {
    const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
    if (isAtEnd) {
      container.classList.remove('has-scroll');
    } else {
      container.classList.add('has-scroll');
    }
  });
}

/**
 * Keyboard navigation for pagination
 */
document.addEventListener('keydown', function(e) {
  // Only if no input is focused
  if (document.activeElement.tagName === 'INPUT') return;
  
  // Arrow keys for pagination
  if (e.key === 'ArrowLeft' && document.getElementById('prevPageBtn1')) {
    if (!document.getElementById('prevPageBtn1').disabled) {
      document.getElementById('prevPageBtn1').click();
    }
  } else if (e.key === 'ArrowRight' && document.getElementById('nextPageBtn1')) {
    if (!document.getElementById('nextPageBtn1').disabled) {
      document.getElementById('nextPageBtn1').click();
    }
  }
});

// Re-initialize on resize (debounced)
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleMobileResize, 250);
});

// Export mobile layout functions
if (typeof window !== 'undefined') {
  window.initializeMobileLayout = initializeMobileLayout;
  window.handleMobileResize = handleMobileResize;
  window.addScrollIndicator = addScrollIndicator;
}
