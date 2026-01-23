/**
 * CHART-HELPERS.JS
 * Helper functions for chart generation
 * Provides ASP-compatible utilities
 */

/**
 * Calculate "last seen" time string
 * Matches ASP logic from lines 604-619
 */
function calculateLastSeen() {
  if (!AppState.map.trayecto || AppState.map.trayecto.length === 0) {
    return '';
  }

  try {
    const now = new Date();
    const trayectoDateStr = AppState.map.trayecto[0][0].replace(/z$/i, '').trim();
    const trayectoDate = new Date(trayectoDateStr + 'Z');

    if (isNaN(trayectoDate.getTime())) {
      console.warn('[Helpers] Invalid trayecto date:', AppState.map.trayecto[0][0]);
      return '';
    }

    // ASP calculation: (now + timezone offset) - trayecto date
    const hoursDiff = (new Date(now.getTime() + now.getTimezoneOffset() * 60000) - trayectoDate) / 1000 / 60 / 60;

    if (hoursDiff > -1 && hoursDiff < 1) {
      return ', just now. ';
    } else if (hoursDiff >= 1 && hoursDiff < 24) {
      return ', ' + Math.floor(hoursDiff) + ' hours ago. ';
    } else if (hoursDiff >= 24) {
      return ', ' + Math.floor(hoursDiff / 24) + ' days ago. ';
    }

    return '';
  } catch (e) {
    console.error('[Helpers] Error calculating last seen:', e);
    return '';
  }
}

/**
 * Build chart title matching ASP format
 * ASP format: "CALLSIGN-SSID Chart Name. LaunchDate UTC, X days ago. Last received on: TIME lastseen"
 */
function buildChartTitle(chartType) {
  // Get callsign and SSID
  const callsign = (AppState.config.other || 'Balloon').toUpperCase();
  const ssid = AppState.config.SSID || '';
  const callsignFull = ssid ? `${callsign}-${ssid}` : callsign;

  // Format launch date
  const launchDate = AppState.config.launchdate;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let launchStr = '';

  if (launchDate) {
    try {
      launchStr = `${monthNames[launchDate.getUTCMonth()]}-${String(launchDate.getUTCDate()).padStart(2, '0')} ` +
        `${String(launchDate.getUTCHours()).padStart(2, '0')}:${String(launchDate.getUTCMinutes()).padStart(2, '0')}z`;
    } catch (e) {
      console.warn('[Helpers] Error formatting launch date:', e);
    }
  }

  // Calculate days since launch
  const diaslaunch = AppState.temporal.diaslaunch || 0;

  // Get last received time
  let lastSeenTime = '';
  if (AppState.map.beacon1 && AppState.map.beacon1[0]) {
    try {
      lastSeenTime = AppState.map.beacon1[0][0].replace(/z$/i, ' ').substring(0, 16) + 'z';
    } catch (e) {
      console.warn('[Helpers] Error formatting last seen time:', e);
    }
  }

  // Get "X hours/days ago" text
  const lastSeenAgo = calculateLastSeen();

  // Chart type names (matching ASP)
  const chartNames = {
    0: 'Pico Height meters Chart',
    1: 'Pico Height feet Chart',
    2: 'Pico Solar volts Chart',
    3: 'Pico Solar elevation ° Chart',
    4: 'Pico Horizontal Speed Km/h Chart',
    5: 'Horizontal Speed Km/h Chart',
    6: 'Pico Asc/Desc m/s Chart',
    7: 'Pico Temp °C Chart',
    8: 'Pico SNR Chart',
    9: 'Pico Multiple Chart',
    10: 'Spotters Frequency Hz',
    11: 'Pico Temp °F Chart',
    12: 'Horizontal Speed Knots Chart',
    15: 'Pico Distance Km. Chart'
  };

  const chartName = chartNames[chartType] || 'Chart';

  // Special handling for SNR chart (includes "click DX" in ASP)
  const specialSuffix = chartType === 8 ? ' (click DX)' : '';

  // Build final title
  // Format: "CALLSIGN-SSID Chart Name. LaunchDate UTC, X days ago. Last received on: TIMEz lastseen"
  return `${callsignFull} ${chartName}. ${launchStr} UTC, ${diaslaunch} days ago. Last received on: ${lastSeenTime}${lastSeenAgo}${specialSuffix}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0+? \u2a39 [+]`;
}

/**
 * Get query string parameter (ASP compatibility)
 * ASP uses gqs() function extensively
 */
function gqs(param) {
  if (AppState.config[param]) {
    return AppState.config[param];
  }

  // Fallback to URL search params
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param) || '';
}

/**
 * Parse date string (ASP redate() equivalent)
 * Handles various date formats used in ASP
 */
function redate(dateStr) {
  if (!dateStr) return new Date();

  try {
    // Remove 'z' suffix and trim
    let cleanStr = dateStr.replace(/z$/i, '').trim();

    // Try direct parse first
    let date = new Date(cleanStr + 'Z');

    // If invalid, might be "MMM-DD HH:MM" format
    if (isNaN(date.getTime())) {
      // Check if it starts with month name
      const monthMatch = cleanStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d+)\s+(\d+):(\d+)/);

      if (monthMatch) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames.indexOf(monthMatch[1]);
        const day = parseInt(monthMatch[2]);
        const hour = parseInt(monthMatch[3]);
        const minute = parseInt(monthMatch[4]);

        // Use current year or launch year
        const year = AppState.config.launchdate ?
          AppState.config.launchdate.getUTCFullYear() :
          new Date().getUTCFullYear();

        date = new Date(Date.UTC(year, month, day, hour, minute));
      } else {
        // Try adding year prefix
        const year = AppState.config.launchdate ?
          AppState.config.launchdate.getUTCFullYear() :
          new Date().getUTCFullYear();
        date = new Date(`${year} ${cleanStr}Z`);
      }
    }

    return date;
  } catch (e) {
    console.error('[Helpers] Error parsing date:', dateStr, e);
    return new Date();
  }
}

/**
 * Format altitude text
 * Converts meters to feet if needed
 */
function formatAltitude(meters, useFeet = false) {
  if (useFeet) {
    const feet = meters * 3.28084;
    return Math.round(feet).toLocaleString() + ' ft';
  } else {
    return Math.round(meters).toLocaleString() + ' m';
  }
}

/**
 * Format speed text
 * Converts km/h to knots if needed
 */
function formatSpeed(kmh, useKnots = false) {
  if (useKnots) {
    const knots = kmh * 0.539957;
    return knots.toFixed(1) + ' kts';
  } else {
    return kmh.toFixed(1) + ' km/h';
  }
}

/**
 * Format temperature text
 * Converts °C to °F if needed
 */
function formatTemperature(celsius, useFahrenheit = false) {
  if (useFahrenheit) {
    const fahrenheit = (celsius * 9 / 5) + 32;
    return fahrenheit.toFixed(1) + ' °F';
  } else {
    return celsius.toFixed(1) + ' °C';
  }
}

/**
 * Check if beacon1 data has changed significantly
 * Used to determine if charts need updating
 */
function hasDataChanged(oldBeacon1, newBeacon1) {
  if (!oldBeacon1 || !newBeacon1) return true;
  if (oldBeacon1.length !== newBeacon1.length) return true;

  // Compare first and last entries
  if (oldBeacon1.length > 0 && newBeacon1.length > 0) {
    if (oldBeacon1[0][0] !== newBeacon1[0][0]) return true;
    if (oldBeacon1[oldBeacon1.length - 1][0] !== newBeacon1[newBeacon1.length - 1][0]) return true;
  }

  return false;
}

/**
 * Validate beacon1 data point
 * Returns true if point has all required fields
 */
function isValidBeaconPoint(point) {
  if (!point || !Array.isArray(point)) return false;
  if (point.length < 8) return false;

  // Check required fields exist
  if (!point[0]) return false; // time
  if (!point[1]) return false; // locator

  return true;
}

/**
 * Get chart background button highlight color
 * ASP uses orange for selected chart
 */
function setChartButtonHighlight(chartNumber) {
  // Reset all buttons
  for (let i = 0; i < 16; i++) {
    const btn = document.getElementById(i.toString());
    if (btn) {
      btn.style.backgroundColor = 'transparent';
    }
  }

  // Highlight selected
  const selectedBtn = document.getElementById(chartNumber.toString());
  if (selectedBtn) {
    selectedBtn.style.backgroundColor = 'orange';
  }
}

/**
 * Parse SNR value from reporter string
 * ASP format: "CALLSIGN<br>-15" or variations
 */
function parseSnrFromReporter(reporter) {
  if (!reporter || typeof reporter !== 'string') return 0;

  // Try to find SNR value (can be negative)
  const snrMatch = reporter.match(/-?\d+/);
  if (snrMatch) {
    return parseInt(snrMatch[0]);
  }

  return 0;
}

/**
 * Build tooltip text for chart points
 * ASP format: "CALLSIGN HH:MM"
 */
function buildTooltip(reporter, datetime) {
  const reporterClean = reporter ? reporter.replace(/<br>/g, ' ').trim() : '';
  const timeStr = datetime instanceof Date ?
    datetime.toISOString().substring(11, 16) :
    '';

  return `${reporterClean} ${timeStr}`;
}

/**
 * Calculate solar elevation for a position and time
 * Uses SunCalc library
 */
function calculateSolarElevation(lat, lon, datetime, altitudeMeters = 0) {
  if (typeof SunCalc === 'undefined') {
    console.warn('[Helpers] SunCalc not available');
    return 0;
  }

  try {
    const sunPos = SunCalc.getPosition(datetime, lat, lon, altitudeMeters);
    return sunPos.altitude * (180 / Math.PI);
  } catch (e) {
    console.warn('[Helpers] Error calculating solar elevation:', e);
    return 0;
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateLastSeen,
    buildChartTitle,
    gqs,
    redate,
    formatAltitude,
    formatSpeed,
    formatTemperature,
    hasDataChanged,
    isValidBeaconPoint,
    setChartButtonHighlight,
    parseSnrFromReporter,
    buildTooltip,
    calculateSolarElevation
  };
}
