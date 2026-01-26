/**
 * Helper: Update URL parameter without page reload
 */
function updateUrlParam(key, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState({}, '', url.toString());
}

function isMobile() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function onDeviceChange(callback) {
  const media = window.matchMedia("(max-width: 900px)");
  media.addEventListener("change", callback);
}


function hamburgerHandler() {
  const btn = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('hamburgerMenu');
  const toggleMapBtn = document.getElementById('menu-map-toggle');
  const mapMenu = document.getElementById('iconos');


  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    menu.classList.remove('active');
  });

  toggleMapBtn.addEventListener('click', () => {
    mapMenu.classList.toggle('open');
  });

  document.querySelectorAll('#iconos a, #iconos svg').forEach(el => {
    el.addEventListener('click', () => {
      if (isMobile()) {
        menu.classList.remove('open');
      }
    });
  });

}

/**
 * Mobile Layout Manager
 * Reorganizes page elements for better mobile UX
 * Order: Map -> Chart Buttons -> Form -> Tables
 */
function initializeMobileLayout() {
  
  if (!isMobile()) return;

  hamburgerHandler();
  setupCollapsibleForm();
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
document.addEventListener('keydown', function (e) {
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



// Export mobile layout functions
if (typeof window !== 'undefined') {
  window.initializeMobileLayout = initializeMobileLayout;
  window.addScrollIndicator = addScrollIndicator;
  window.isMobile = isMobile;
}
