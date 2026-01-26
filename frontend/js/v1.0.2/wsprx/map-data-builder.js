// ============================================================================
// MAP-DATA-BUILDER.JS - Build Google Maps Data Arrays (FIXED)
// Combines Telemetry 1 and Telemetry 2 data for map visualization
// ASP equivalents: locations, flechas, beacon1, trayecto arrays
// ============================================================================

/**
 * Calculate distance between two points (Great Circle)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bearing between two points
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Build reporter info HTML for locations[i][1] where i > 0
 * Matches ASP format for reporter stations
 */
function buildReporterInfoHTML(callsign, locator, distance, snr, timestamp) {
  // Parse timestamp
  const date = new Date(timestamp);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${monthNames[date.getMonth()]}-${String(date.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}z`;

  // Format SNR
  const snrStr = snr ? `${snr > 0 ? '+' : ''}${snr}` : '?';

  // Build HTML
  return `${callsign}<br>${dateStr} ${timeStr}<br>${distance.toFixed(0)} Km<br>R:${snrStr}`;
}

/**
 * Build distance distribution histogram
 * ASP builds this at lines ~2780-2810
 */
function buildDistanceHistogram(altitudes) {
  const binSize = 250;
  const maxBins = 85;
  const distances = [];
  const counts = new Array(maxBins).fill(0);

  for (let i = 0; i < maxBins; i++) {
    distances.push(i * binSize);
  }

  // Count altitudes in each bin
  for (let i = 0; i < altitudes.length; i++) {
    const alt = parseInt(altitudes[i]) || 0;
    const binIndex = Math.floor(alt / binSize);

    if (binIndex >= 0 && binIndex < maxBins) {
      counts[binIndex]++;
    }
  }

  return [distances, counts];
}

/**
 * Format map data for JavaScript output
 * Generates JavaScript code that can be embedded in HTML
 */
function formatMapDataForJS() {
  let js = '';

  // locations array
  js += 'var locations = [\n';
  for (let i = 0; i < AppState.map.locations.length; i++) {
    const [loc, info] = AppState.map.locations[i];
    const infoEscaped = info.replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
    js += `["${loc}","${infoEscaped}"]`;
    if (i < AppState.map.locations.length - 1) js += ',\n';
  }
  js += '];\n\n';

  // flechas array
  js += 'var flechas = [';
  for (let i = 0; i < AppState.map.flechas.length; i++) {
    js += `"${AppState.map.flechas[i]}"`;
    if (i < AppState.map.flechas.length - 1) js += ',';
  }
  js += '];\n\n';

  // beacon1 array
  js += 'var beacon1 = [\n';
  for (let i = 0; i < AppState.map.beacon1.length; i++) {
    const [time, loc, temp, alt, volt, speed, reporter, freq] = AppState.map.beacon1[i];
    js += `["${time}","${loc}","${temp}","${alt}","${volt}","${speed}","${reporter}","${freq}"]`;
    if (i < AppState.map.beacon1.length - 1) js += ',\n';
  }
  js += '];\n\n';

  // trayecto array
  js += 'var trayecto = [\n';
  for (let i = 0; i < AppState.map.trayecto.length; i++) {
    const [time, loc, temp, alt] = AppState.map.trayecto[i];
    js += `["${time}","${loc}","${temp}","${alt}"]`;
    if (i < AppState.map.trayecto.length - 1) js += ',\n';
  }
  js += '];\n\n';

  // dista array
  js += `var dista = [${JSON.stringify(AppState.statistics.dista[0])},${JSON.stringify(AppState.statistics.dista[1])}];\n\n`;

  // Add frequency offset info
  const avgFreq = AppState.results.avgfreq || 0;
  const fcentral = AppState.config.fcentral || 0;
  const offset = avgFreq - fcentral;
  const offsetSign = offset >= 0 ? '+' : '';
  js += `var addplusm=' \\u25B3${offsetSign}${offset}Hz. ';\n`;

  return js;
}

/**
 * Helper: Convert locator to lat/lon
 */
function loctolatlon(loc) {
  loc = loc.toUpperCase().trim().replace(/"/g, "");
  if (loc.length == 4) {
    loc = loc + "LL";
  }

  const c0 = loc.charAt(0);
  const c1 = loc.charAt(1);
  const c2 = loc.charAt(2);
  const c3 = loc.charAt(3);
  const c4 = loc.charAt(4);
  const c5 = loc.charAt(5);

  const lat = (
    (parseInt(c1, 28) - 19) * 10 +
    parseInt(c3, 10) +
    (parseInt(c5, 34) - 9.5) / 24
  );

  const lon = (
    (parseInt(c0, 28) - 19) * 20 +
    parseInt(c2, 10) * 2 +
    (parseInt(c4, 34) - 9.5) / 12
  );

  return { lat: lat, lon: lon };
}

function loc2latlon(loc, locname) {
  // enter gridlocator 4 or 6 characters & location name
  if (!locname) {
    locname = "MyPlace";
  }
  if (!loc) {
    loc = "GF05";
  }
  loc = loc.toUpperCase();
  if (loc.length == 4) {
    loc = loc + "LL";
    loc = loc;
  }
  if (loc.length > 0) {
    err = 0;
    if (loc.length != 6) err = 1;
    else {
      c0 = loc.charAt(0);
      c1 = loc.charAt(1);
      c2 = loc.charAt(2);
      c3 = loc.charAt(3);
      c4 = loc.charAt(4);
      c5 = loc.charAt(5);
      if (
        c0 < "A" ||
        c0 > "R" ||
        c1 < "A" ||
        c1 > "R" ||
        (c2 < "0") | (c2 > "9") ||
        c3 < "0" ||
        c3 > "9" ||
        c4 < "A" ||
        c4 > "X" ||
        c5 < "A" ||
        c5 > "X"
      )
        err = 1;
    }
    if (err) {
      return { loclat: "", loclon: "", locname: "" };
    } //return {loclat: "", loclon: "", locname: ""}
    else {
      loclat =
        (parseInt(c1, 28) - 19) * 10 +
        parseInt(c3, 10) +
        (parseInt(c5, 34) - 9.5) / 24;
      loclon =
        (parseInt(c0, 28) - 19) * 20 +
        parseInt(c2, 10) * 2 +
        (parseInt(c4, 34) - 9.5) / 12;
      return { loclat: loclat, loclon: loclon, locname: locname };
    }
  }
}

function crsdist(lat1, lon1, lat2, lon2) {
  var EARTH_RADIUS = 3440.07;
  var PI = 3.1415926535897932384626433832795;
  var DEG2RAD = 0.01745329252;
  var RAD2DEG = 57.29577951308;
  var x1 = lon1 * DEG2RAD;
  var y1 = lat1 * DEG2RAD;
  var x2 = lon2 * DEG2RAD;
  var y2 = lat2 * DEG2RAD;

  osphFrom = defSphereCoo(EARTH_RADIUS, y1, x1);
  osphTo = defSphereCoo(EARTH_RADIUS, y2, x2);

  qchordkm = Math.sqrt(
    (osphTo.xp - osphFrom.xp) * (osphTo.xp - osphFrom.xp) +
    (osphTo.yp - osphFrom.yp) * (osphTo.yp - osphFrom.yp) +
    (osphTo.zp - osphFrom.zp) * (osphTo.zp - osphFrom.zp),
  );
  distance = 2 * EARTH_RADIUS * Math.asin(qchordkm / 2 / EARTH_RADIUS);
  // Now get bearing
  a = Math.cos(y2) * Math.sin(x2 - x1);
  b =
    Math.cos(y1) * Math.sin(y2) -
    Math.sin(y1) * Math.cos(y2) * Math.cos(x2 - x1);
  adjust = 0;
  if (a == 0 && b == 0) {
    bearing = 0;
  } else if (b == 0) {
    if (a < 0) bearing = (3 * PI) / 2;
    else bearing = PI / 2;
  } else if (b < 0) adjust = PI;
  else {
    if (a < 0) adjust = 2 * PI;
    else adjust = 0;
  }
  bearing = (Math.atan(a / b) + adjust) * RAD2DEG;
  out = new MakeArray(0);
  out.distance = distance;
  out.bearing = bearing;
  return out;
}

function MakeArray(n) {
  this.length = n;
  for (var i = 1; i <= n; i++) {
    this[i] = 0;
  }
  return this;
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
    buildBalloonInfoHTML,
    buildReporterInfoHTML,
    buildDistanceHistogram,
    formatMapDataForJS,
    calculateDistance,
    calculateBearing
  };
}
