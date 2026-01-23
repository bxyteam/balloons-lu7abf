// ============================================================================
// DISTANCE-CALCULATOR.JS - Maidenhead Locator & Distance Calculations
// Ported from ASP lines 514-600+
// ============================================================================

const PI = 3.141592653;
const DEG2RAD = 0.01745329252;
const RAD2DEG = 57.29577951308232;

function putsun(fecha, locator) {
  let sunelevation = "&nbsp;";
  if (locator.length > 3) {
    sunelevation =
      (
        SunCalc.getPosition(
          new Date(fecha + "Z"),
          loc2latlon(locator).loclat,
          loc2latlon(locator).loclon,
        ).altitude * RAD2DEG
      ).toFixed(1) + "&nbsp;";
  }
  return sunelevation;
}


// ============================================================================
// MAIDENHEAD LOCATOR TO LAT/LON CONVERSION
// ============================================================================

function loc2latlon(loc, locname) {
  if (!locname) locname = "MyPlace";
  if (!loc) loc = "GF05";
  loc = loc.toUpperCase();

  // Handle 4-char grids by computing center, NOT by appending "LL"
  let useLoc = loc;
  if (loc.length === 4) {
    // Keep as 4-char; we'll compute center below
    useLoc = loc;
  } else if (loc.length !== 6) {
    return { loclat: "", loclon: "", locname: "" };
  }

  const c0 = useLoc.charAt(0);
  const c1 = useLoc.charAt(1);
  const c2 = useLoc.charAt(2);
  const c3 = useLoc.charAt(3);
  const c4 = useLoc.length >= 5 ? useLoc.charAt(4) : 'L';
  const c5 = useLoc.length >= 6 ? useLoc.charAt(5) : 'L';

  // Validate
  if (c0 < 'A' || c0 > 'R' || c1 < 'A' || c1 > 'R' ||
      c2 < '0' || c2 > '9' || c3 < '0' || c3 > '9' ||
      c4 < 'A' || c4 > 'X' || c5 < 'A' || c5 > 'X') {
    return { loclat: "", loclon: "", locname: "" };
  }

  // Use ASP formula, but for 4-char, c4='L', c5='L' → which is what you want
  const lat = (parseInt(c1, 28) - 19) * 10 + parseInt(c3, 10) + (parseInt(c5, 34) - 9.5) / 24;
  const lon = (parseInt(c0, 28) - 19) * 20 + parseInt(c2, 10) * 2 + (parseInt(c4, 34) - 9.5) / 12;

  return { loclat: lat, loclon: lon, locname: locname };
}


// ============================================================================
// DISTANCE CALCULATION (Great Circle Distance)
// ASP lines 521-531
// ============================================================================
function distancia(lat1, lon1, lat2, lon2) {
  const theta = lon1 - lon2;
  let dist = Math.sin(lat1 * DEG2RAD) * Math.sin(lat2 * DEG2RAD) + 
             Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * 
             Math.cos(theta * DEG2RAD);
  
  dist = acos(dist);
  dist = dist * RAD2DEG;
  
  return dist * 60; // Result in nautical miles
}

// ============================================================================
// BEARING CALCULATION
// ASP lines 533-570
// ============================================================================
function bearing1(lat1, lat2, lon1, lon2) {
  const lata1 = lat1 * DEG2RAD;
  const lona1 = lon1 * DEG2RAD;
  const lata2 = lat2 * DEG2RAD;
  const lona2 = lon2 * DEG2RAD;
  
  let adjust = 0;
  const a = Math.cos(lata2) * Math.sin(lona2 - lona1);
  const b = Math.cos(lata1) * Math.sin(lata2) - 
            Math.sin(lata1) * Math.cos(lata2) * Math.cos(lona2 - lona1);
  
  if (a === 0 && b === 0) {
    return 0;
  } else {
    if (b === 0) {
      if (a < 0) {
        return (3 * PI / 2) * RAD2DEG;
      } else {
        return (PI / 2) * RAD2DEG;
      }
    } else {
      if (b < 0) {
        adjust = PI;
      } else {
        if (a < 0) {
          adjust = 2 * PI;
        } else {
          adjust = 0;
        }
      }
    }
  }
  
  let bearing = (Math.atan(a / b) + adjust) * RAD2DEG;
  const multip = Math.floor(bearing / 360);
  bearing = bearing - (multip * 360);
  
  return bearing;
}

// ============================================================================
// COMBINED DISTANCE AND BEARING
// Returns: { distance: km, bearing: degrees }
// ============================================================================
function crsdist(lat1, lon1, lat2, lon2) {
  const distNM = distancia(lat1, lon1, lat2, lon2);
  const distKM = distNM * 1.852; // Convert nautical miles to kilometers
  const bear = bearing1(lat1, lat2, lon1, lon2);
  
  return {
    distance: distNM,
    distanceKm: distKM,
    bearing: bear
  };
}

// ============================================================================
// CALCULATE DISTANCE BETWEEN TWO LOCATORS
// ============================================================================
function distanceBetweenLocators(loc1, loc2) {
  const pos1 = locatorToLatLon(loc1);
  const pos2 = locatorToLatLon(loc2);
  
  return crsdist(pos1.lat, pos1.lon, pos2.lat, pos2.lon);
}

// ============================================================================
// MATH HELPER FUNCTIONS (ASP lines 572-598)
// ============================================================================
function acos(rad) {
  if (Math.abs(rad) !== 1) {
    return PI / 2 - Math.atan(rad / Math.sqrt(1 - rad * rad));
  } else if (rad === -1) {
    return PI;
  }
  return 0;
}

function atan2Custom(x, y) {
  if (y > 0) return Math.atan(x / y);
  if (x >= 0 && y < 0) return Math.atan(x / y) + PI;
  if (x < 0 && y < 0) return Math.atan(x / y) - PI;
  if (x > 0 && y === 0) return PI / 2;
  if (x < 0 && y === 0) return -1 * (PI / 2);
  if (x === 0 && y === 0) return 0;
  return 0;
}

function asin(x) {
  return Math.atan(x / Math.sqrt(-x * x + 1));
}

function degrees(valor) {
  return valor * 180 / PI;
}

function radians(valor) {
  return valor * PI / 180;
}

// ============================================================================
// LAT/LON TO LOCATOR CONVERSION (reverse)
// ============================================================================
function latLonToLocator(lat, lon) {
  // Adjust coordinates
  const adjLat = lat + 90;
  const adjLon = lon + 180;
  
  // Field
  const fieldLon = String.fromCharCode(65 + Math.floor(adjLon / 20));
  const fieldLat = String.fromCharCode(65 + Math.floor(adjLat / 10));
  
  // Square
  const squareLon = Math.floor((adjLon % 20) / 2);
  const squareLat = Math.floor(adjLat % 10);
  
  // Subsquare
  const subsquareLon = String.fromCharCode(97 + Math.floor((adjLon - Math.floor(adjLon / 2) * 2) * 12));
  const subsquareLat = String.fromCharCode(97 + Math.floor((adjLat - Math.floor(adjLat)) * 24));
  
  return fieldLon + fieldLat + squareLon + squareLat + subsquareLon + subsquareLat;
}

// ============================================================================
// FORMAT COORDINATES AS DMS (Degrees, Minutes, Seconds)
// ============================================================================
function degtodms(deg) {
  const d = Math.floor(Math.abs(deg));
  const m = Math.floor((Math.abs(deg) - d) * 60);
  const s = Math.round(((Math.abs(deg) - d) * 60 - m) * 60);
  
  const sign = deg < 0 ? "-" : "";
  return `${sign}${d}º${m}'${s}"`;
}

// ============================================================================
// LAT/LON FORMATTING
// ============================================================================
function latlontra(latlon) {
  const parts = latlon.split('/');
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    
    const latStr = degtodms(lat);
    const lonStr = degtodms(lon);
    
    return `Latitud: ${latStr}"   Longitud: ${lonStr}"`;
  }
  return latlon;
}

function gradosminutos(deg) {
  if (deg < 0) {
    deg = -deg;
  }
  var d = Math.floor(deg);
  var resto = (deg - d) * 60;
  var resto1 = deg - d - Math.floor(resto / 60);
  return d * 100 + Math.floor(resto) + resto1;
}

function defSphereCoo(rad, nw, nl) {
  var osph;
  osph = new Object();
  rad_ = rad * Math.cos(nw);
  osph.xp = rad_ * Math.cos(nl);
  osph.yp = rad_ * Math.sin(nl);
  osph.zp = rad * Math.sin(nw);
  return osph;
}


// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    putsun,
    loc2latlon,
    distancia,
    bearing1,
    crsdist,
    distanceBetweenLocators,
    latLonToLocator,
    degtodms,
    latlontra,
    acos,
    atan2Custom,
    asin,
    degrees,
    radians,
    PI,
    DEG2RAD,
    RAD2DEG,
    gradosminutos,
    defSphereCoo
  };
}
