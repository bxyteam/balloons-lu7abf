/**
 * CHARTS-WSPRX-COMPLETE.JS
 * Complete ASP-exact implementation including ALL filtering logic
 * 
 * CRITICAL FIXES:
 * 1. Loops BACKWARDS through beacon1 (like ASP)
 * 2. Filters altitude jumps > 4%
 * 3. Filters altitude > 16000m
 * 4. Filters duplicate timestamps
 * 5. Speed validation (must be 20%-500% of previous)
 * 6. Uses beacon1[s] and beacon1[s-1] indexing (not i and i-1)
 * 7. SNR splits by single space, takes [1]
 */

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let data3 = [];
let data5 = [];
let chartInterval = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

function initCharts() {
  google.charts.load('current', { packages: ['corechart'] });
  google.charts.setOnLoadCallback(function () {
    console.log('[Charts] ✅ Google Charts loaded successfully');
  });
}

// ============================================================================
// DATA PREPARATION - ASP EXACT LOGIC
// ============================================================================

/**
 * Prepare data3 array from beacon1
 * CRITICAL: This is the ASP Function.prototype.make() equivalent
 * Must match ASP lines 1720-1923 EXACTLY
 */
function prepareChartData() {

  const beacon1 = AppState.map.beacon1 || [];

  if (beacon1.length === 0) {
    console.error('[Charts] ERROR: beacon1 array is empty!');
    return;
  }


  // ========================================================================
  // INITIALIZE VARIABLES (ASP line 1723-1724)
  // ========================================================================

  let p = 0; // data3 write pointer
  data3 = new Array(beacon1.length);
  for (let i = 0; i < beacon1.length; i++) {
    data3[i] = new Array(15).fill(0);
  }

  let saveAlt = 0;        // Last valid altitude
  let saveSpeed = 0;      // Last valid speed
  let saveTemp = 0;       // Last valid temperature
  let saveSolarV = 0;     // Last valid solar voltage
  let sw = false;         // Speed initialized flag
  let swok = false;       // Data OK flag

  const tracker = (AppState.config.tracker || '').toLowerCase().replace('#', '');

  // ========================================================================
  // LOOP BACKWARDS THROUGH beacon1 (ASP line 1738)
  // CRITICAL: s goes from beacon1.length-1 down to 1 (not 0!)
  // ========================================================================

  for (let s = beacon1.length - 1; s > 0; s--) {

    // ====================================================================
    // ALTITUDE VALIDATION (ASP lines 1740-1742)
    // Skip if altitude jumps > 4% when alt > 9800m
    // ====================================================================

    const currentAlt = parseFloat(beacon1[s][3]) || 0;
    const prevAlt = parseFloat(beacon1[s - 1][3]) || 0;

    let saltar = false;
    if (prevAlt > 9800) {
      const altDiff = Math.abs(currentAlt - prevAlt) / prevAlt;
      if (altDiff > 0.04) {
        saltar = true;
      }
    }

    // ====================================================================
    // MAIN FILTER (ASP line 1742)
    // Process only if:
    // 1. Not saltar (altitude valid)
    // 2. Time different from previous
    // 3. Current altitude < 16000m
    // ====================================================================

    if (!saltar &&
      beacon1[s][0] !== beacon1[s - 1][0] &&
      currentAlt < 16000) {
      swok = true;

      // ==================================================================
      // DATE (ASP line 1745)
      // Uses beacon1[s-1] time (previous in backward loop = next in time)
      // ==================================================================

      try {
        data3[p][0] = new Date(redate(beacon1[s - 1][0]));
      } catch (e) {
        console.warn(`[Charts] Invalid date at beacon1[${s - 1}]:`, beacon1[s - 1][0]);
        continue;
      }

      // ==================================================================
      // HEIGHT METERS & FEET (ASP lines 1748-1767)
      // ==================================================================

      if (tracker !== 'zachtek1') {
        data3[p][1] = currentAlt;
        if (data3[p][1] > 0) {
          saveAlt = data3[p][1];
        }
        data3[p][2] = Math.floor(currentAlt * 3.28084 / 50) * 50;

        // If altitude is 0, use saved
        if (data3[p][1] === 0) {
          data3[p][1] = saveAlt;
          data3[p][2] = Math.floor(saveAlt * 3.28084 / 50) * 50;
        }
      } else {
        // zachtek1 tracker
        data3[p][1] = 0;
        data3[p][2] = 0;
        if (currentAlt > 0) {
          data3[p][1] = currentAlt;
          saveAlt = currentAlt;
          data3[p][2] = Math.floor(currentAlt * 3.28084 / 50) * 50;
        }
        // If still 0, use saved
        if (data3[p][1] === 0) {
          data3[p][1] = saveAlt;
          data3[p][2] = Math.floor(saveAlt * 3.28084 / 50) * 50;
        }
      }

      // ==================================================================
      // SOLAR VOLTAGE (ASP lines 1768-1772)
      // ==================================================================

      data3[p][3] = 0; // Default
      const solarStr = beacon1[s][4];
      if (solarStr && solarStr !== "? " && solarStr.trim() !== "" && solarStr !== "?") {
        const solarVal = parseFloat(solarStr);
        if (!isNaN(solarVal) && solarVal > 2) {
          data3[p][3] = solarVal;
          saveSolarV = solarVal;
        }
      }
      // If 0, could use saved (not in ASP for solar though)

      // ==================================================================
      // SOLAR ELEVATION (ASP lines 1773-1775)
      // ==================================================================

      try {
        const loc = beacon1[s - 1][1];
        const locPos = loc2latlon(loc);
        const dateForSun = new Date(beacon1[s - 1][0].replace(/ /, "T").replace(/z/, "Z"));
        const sunPos = SunCalc.getPosition(dateForSun, locPos.loclat, locPos.loclon);
        const sunElev = sunPos.altitude * (180 / Math.PI);
        data3[p][4] = Math.floor(sunElev * 10) / 10;
      } catch (e) {
        data3[p][4] = 0;
      }

      // ==================================================================
      // SPEED (ASP lines 1776-1845)
      // Complex validation logic!
      // ==================================================================

      const speedStr = beacon1[s][5];
      let speedVal = 0;
      if (speedStr && speedStr.trim() !== "") {
        speedVal = parseFloat(speedStr) || 0;
      }

      if (tracker !== 'wb8elk') {
        // Initialize savespeed on first valid speed
        if (speedVal > 0 && sw === false) {
          saveSpeed = speedVal;
          sw = true;
        }

        // Validate: speed must be 20%-500% of previous speed
        if (speedVal > 0 &&
          saveSpeed < 240 &&
          speedVal / saveSpeed > 0.2 &&
          speedVal / saveSpeed < 5) {
          data3[p][5] = speedVal;
          saveSpeed = speedVal;
        } else {
          data3[p][5] = saveSpeed; // Use saved
        }
      } else {
        // wb8elk: calculate from distance
        try {
          const loc1 = beacon1[s][1];
          const loc2 = beacon1[s - 1][1];
          const pos1 = loc2latlon(loc1);
          const pos2 = loc2latlon(loc2);

          const distKm = calculateDistance(pos1.loclat, pos1.loclon, pos2.loclat, pos2.loclon);

          const time1 = new Date(beacon1[s][0].replace(/ /, "T").replace(/z/, "Z"));
          const time2 = new Date(beacon1[s - 1][0].replace(/ /, "T").replace(/z/, "Z"));
          const seconds = (time2 - time1) / 1000;

          const velocidad = (distKm * 3600 / seconds);

          if (velocidad > 1 && sw === false) {
            saveSpeed = velocidad;
            sw = true;
          }

          if (velocidad > 0 && velocidad < 240 &&
            velocidad / saveSpeed > 0.2 && velocidad / saveSpeed < 5) {
            data3[p][5] = Math.floor(velocidad);
            saveSpeed = data3[p][5];
          } else {
            data3[p][5] = saveSpeed;
          }
        } catch (e) {
          data3[p][5] = saveSpeed;
        }
      }

      // Special for traquito/qrplabs (ASP lines 1810-1812)
      if (tracker === 'traquito' || tracker === 'qrplabs') {
        const prevSpeedStr = beacon1[s - 1][5];
        const prevSpeed = (prevSpeedStr && prevSpeedStr.trim() !== "") ?
          parseFloat(prevSpeedStr) || 0 : 0;
        data3[p][5] = (prevSpeed + speedVal) / 2;
      }

      // ==================================================================
      // ASC/DESC (ASP lines 1846-1848)
      // ==================================================================

      try {
        const time1 = new Date(beacon1[s][0].replace(/ /, "T").replace(/z/, "Z"));
        const time2 = new Date(beacon1[s - 1][0].replace(/ /, "T").replace(/z/, "Z"));
        const minutesElapsed = (time2 - time1) / 1000;

        const meters = prevAlt - currentAlt;
        const ascDesc = meters / minutesElapsed;

        if (ascDesc > -5 && ascDesc < 5) {
          data3[p][6] = Math.round(ascDesc * 100) / 100;
        } else {
          data3[p][6] = 0;
        }
      } catch (e) {
        data3[p][6] = 0;
      }

      // ==================================================================
      // TEMPERATURE °C (ASP line 1849)
      // ==================================================================

      const tempStr = beacon1[s][2];
      if (tempStr && !isNaN(parseFloat(tempStr))) {
        data3[p][7] = parseFloat(tempStr);
        saveTemp = data3[p][7];
      } else {
        data3[p][7] = saveTemp;
      }

      // ==================================================================
      // TEMPERATURE °F (ASP line 1850)
      // ==================================================================

      if (tempStr && !isNaN(parseFloat(tempStr))) {
        data3[p][13] = Math.floor(parseFloat(tempStr) * 9 / 5 + 32);
        saveTemp = parseFloat(tempStr);
      } else {
        data3[p][13] = Math.floor(saveTemp * 9 / 5 + 32);
      }

      // ==================================================================
      // SNR (ASP lines 1851-1852)
      // CRITICAL: Split by SPACE, take [1]
      // ==================================================================

      const reporter = beacon1[s][6] || '';
      if (reporter) {
        const snrm = reporter.split(/ /); // Split by SINGLE space
        data3[p][8] = parseFloat(snrm[1]) || 0;
      } else {
        data3[p][8] = 0;
      }

      // ==================================================================
      // TOOLTIP (ASP line 1853)
      // ==================================================================

      data3[p][9] = reporter.replace(/<br>/gi, "") + " " + beacon1[s][0].substring(11, 16);

      // ==================================================================
      // LAT/LON AVERAGED (ASP lines 1854-1855)
      // ==================================================================

      try {
        const loc1 = beacon1[s - 1][1];
        const loc2 = beacon1[s][1];
        const pos1 = loc2latlon(loc1);
        const pos2 = loc2latlon(loc2);

        data3[p][10] = (pos1.loclat + pos2.loclat) / 2;
        data3[p][11] = (pos1.loclon + pos2.loclon) / 2;
      } catch (e) {
        data3[p][10] = 0;
        data3[p][11] = 0;
      }

      // ==================================================================
      // FREQUENCY (ASP line 1856)
      // ==================================================================

      const freqStr = beacon1[s][7];
      if (freqStr && freqStr.trim() !== "") {
        data3[p][12] = parseFloat(freqStr) || 0;
      } else {
        data3[p][12] = 0;
      }

      // ==================================================================
      // SPEED KNOTS (will be recalculated after smoothing)
      // ==================================================================

      data3[p][14] = data3[p][5] * 0.539957;

      // Increment write pointer
      p = p + 1;

    } else if (beacon1[s][0] !== beacon1[s - 1][0] && !swok) {
      // ASP lines 1859-1872: Minimal data for filtered points
      // Just date, sun elev, SNR, tooltip, frequency

      try {
        data3[p][0] = new Date(redate(beacon1[s][0]));

        // Sun elevation
        const loc = beacon1[s][1];
        const locPos = loc2latlon(loc);
        const dateForSun = new Date(beacon1[s][0].replace(/ /, "T").replace(/z/, "Z"));
        const sunPos = SunCalc.getPosition(dateForSun, locPos.loclat, locPos.loclon);
        const sunElev = sunPos.altitude * (180 / Math.PI);
        data3[p][4] = Math.round(sunElev * 10) / 10;

        // SNR
        const reporter = beacon1[s][6] || '';
        const snrm = reporter.split(/ /);
        data3[p][8] = parseFloat(snrm[1]) || 0;

        // Tooltip
        data3[p][9] = reporter.replace(/<br>/gi, "") + " " + beacon1[s][0].substring(11, 16);

        // Frequency
        const freqStr = beacon1[s][7];
        if (freqStr && freqStr.trim() !== "") {
          data3[p][12] = parseFloat(freqStr) || 0;
        }

        p = p + 1;
      } catch (e) {
        // Skip this point
      }
    }
  }

  // Trim data3 to actual size
  data3 = data3.slice(0, p);


  // ========================================================================
  // APPLY SMOOTHING (ASP lines 1876-1920)
  // ========================================================================

  applySmoothing();


}

/**
 * Apply ASP smoothing algorithms
 * Lines 1876-1920
 */
function applySmoothing() {
  const p = data3.length;

  if (p < 2) return;

  // Triple smoothing for speed (column 5)
  if (data3[1] && !isNaN(data3[1][5])) {
    let avg = new Array(p);

    // Pass 1
    for (let x = 1; x < p; x++) {
      avg[x] = (data3[x][5] + data3[x - 1][5]) / 2;
    }
    for (let x = 1; x < p; x++) {
      data3[x][5] = avg[x];
    }

    // Pass 2
    for (let x = 1; x < p; x++) {
      avg[x] = (data3[x][5] + data3[x - 1][5]) / 2;
    }
    for (let x = 1; x < p; x++) {
      data3[x][5] = avg[x];
    }

    // Pass 3 (and floor)
    for (let x = 1; x < p; x++) {
      avg[x] = (data3[x][5] + data3[x - 1][5]) / 2;
    }
    for (let x = 1; x < p; x++) {
      data3[x][5] = Math.floor(avg[x]);
    }

    // Recalculate knots from smoothed km/h
    for (let x = 1; x < p; x++) {
      data3[x][14] = Math.floor(data3[x][5] * 5.39957) / 10;
    }
  }

  // Double smoothing for asc/desc (column 6)
  if (data3[0] && !isNaN(data3[0][6])) {
    let avg = new Array(p);

    // Pass 1
    for (let x = 1; x < p; x++) {
      avg[x] = (data3[x][6] + data3[x - 1][6]) / 2;
    }
    for (let x = 1; x < p; x++) {
      data3[x][6] = avg[x];
    }

    // Pass 2
    for (let x = 1; x < p; x++) {
      avg[x] = (data3[x][6] + data3[x - 1][6]) / 2;
    }
    for (let x = 1; x < p; x++) {
      data3[x][6] = avg[x];
    }
  }

  // Special zachtek1 smoothing (ASP lines 1896-1920)
  const tracker = (AppState.config.tracker || '').toLowerCase().replace('#', '');

  if (tracker === 'zachtek1') {
    // Double smooth sun elevation
    if (data3[0] && !isNaN(data3[0][4])) {
      let avg = new Array(p);
      for (let x = 1; x < p; x++) {
        avg[x] = (data3[x][4] + data3[x - 1][4]) / 2;
      }
      for (let x = 1; x < p; x++) {
        data3[x][4] = avg[x];
      }
      for (let x = 1; x < p; x++) {
        avg[x] = (data3[x][4] + data3[x - 1][4]) / 2;
      }
      for (let x = 1; x < p; x++) {
        data3[x][4] = Math.trunc(avg[x] * 10) / 10;
      }
    }

    // Double smooth height meters
    if (data3[0] && !isNaN(data3[0][1])) {
      let avg = new Array(p);
      for (let x = 1; x < p; x++) {
        avg[x] = (data3[x][1] + data3[x - 1][1]) / 2;
      }
      for (let x = 1; x < p; x++) {
        data3[x][1] = avg[x];
      }
      for (let x = 1; x < p; x++) {
        avg[x] = (data3[x][1] + data3[x - 1][1]) / 2;
      }
      for (let x = 1; x < p; x++) {
        data3[x][1] = avg[x];
      }

      // Double smooth height feet
      avg = new Array(p);
      for (let x = 1; x < p; x++) {
        avg[x] = (data3[x][2] + data3[x - 1][2]) / 2;
      }
      for (let x = 1; x < p; x++) {
        data3[x][2] = avg[x];
      }
      for (let x = 1; x < p; x++) {
        avg[x] = (data3[x][2] + data3[x - 1][2]) / 2;
      }
      for (let x = 1; x < p; x++) {
        data3[x][2] = Math.floor(avg[x] / 50) * 50;
      }
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


/**
 * Prepare data5 array for distance histogram chart
 * Uses AppState.statistics.distakm (85 buckets of 250km each)
 * 
 * Format: [[distance_km, count], [distance_km, count], ...]
 */
function prepareDistanceData() {

  // Reset data array
  data5 = [];

  // Check if distakm data exists
  if (!AppState.statistics || !AppState.statistics.distakm) {
    console.warn('[Charts] No distakm data available in AppState.statistics');
    return;
  }

  const distakm = AppState.statistics.distakm;

  // Each bucket represents 250km range
  const binSize = 250;
  let totalReports = 0;

  for (let i = 0; i < distakm.length; i++) {
    const distance = i * binSize;
    const count = distakm[i] || 0;

    // Only add non-zero counts (like ASP does)
    if (count > 0) {
      data5.push([distance, count]);
      totalReports += count;
    }
  }


  if (data5.length > 0) {
    const maxDist = Math.max(...data5.map(d => d[0]));
    const maxCount = Math.max(...data5.map(d => d[1]));
  }
}

// ============================================================================
// CHART DRAWING
// ============================================================================

/**
 * Draw chart based on chart number (0-15)
 * Matches ASP drawChart() function exactly
 * 
 * CHART MAPPING (based on ASP's view.setColumns):
 * @param {number} meterfeet - Chart type selector (0-15)
 *   0 = Height meters      (columns [0, 1] = datetime, height_m)
 *   1 = Height feet        (columns [0, 2] = datetime, height_ft)
 *   2 = Height + Solar     (columns [0, 1, 3] = datetime, height_m, solar_v)
 *   3 = Solar elevation    (columns [0, 4] = datetime, solar_elev)
 *   4 = Height + Speed     (columns [0, 1, 5] = datetime, height_m, speed_kmh)
 *   5 = Height + Asc/Desc  (columns [0, 1, 6] = datetime, height_m, asc_desc)
 *   6 = Height + Temp °C   (columns [0, 1, 7] = datetime, height_m, temp_c)
 *   7 = SNR                (columns [0, 8, 9] = datetime, snr, tooltip)
 *   8 = Multiple chart     (columns [0, 4, 10, 13, 7, ...calc] = complex)
 *   9 = Longitude          (columns [0, 11] = datetime, lon)
 *   10 = Frequency         (columns [0, 12] = datetime, freq)
 *   11 = Solar + Temp °F   (columns [0, 3, 13] = datetime, solar_v, temp_f)
 *   12 = Height + Knots    (columns [0, 1, 14] = datetime, height_m, speed_knots)
 *   13 = Solar flux        (opens popup window)
 *   14 = (unused)
 *   15 = Distance histogram (uses data5 array)
 */
function drawChart(meterfeet) {

  // Highlight selected chart button
  setChartButtonHighlight(meterfeet);

  // Get chart container
  const chartDiv = document.getElementById('chart_div');
  if (!chartDiv) {
    console.error('[Charts] chart_div element not found');
    return;
  }

  const mapCanvas = document.getElementById('map');

  chartDiv.style.left = mapCanvas.offsetLeft + 'px';
  chartDiv.style.top = mapCanvas.offsetTop + 'px';
  chartDiv.style.width = mapCanvas.clientWidth + 'px';
  chartDiv.style.height = mapCanvas.clientHeight + 'px';

  // Special case: Solar flux (opens popup window)
  if (meterfeet === 13) {
    solarFlux();
    return;
  }

  // Special case: Distance chart uses data5
  if (meterfeet === 15) {
    drawDistanceChart();
    return;
  }

  // For all other charts, ensure data3 is ready
  if (data3.length === 0) {
    chartDiv.style.visibility = 'hidden';
    return;
  }

  // ========================================================================
  // CREATE GOOGLE DATA TABLE WITH ALL COLUMNS (ASP APPROACH)
  // Then use DataView to select which columns to display
  // ========================================================================

  const dataTable = new google.visualization.DataTable();

  // Add ALL columns (matching data3 structure)
  dataTable.addColumn('datetime', 'Date/Time');      // 0
  dataTable.addColumn('number', 'Height m');         // 1
  dataTable.addColumn('number', 'Height ft');        // 2
  dataTable.addColumn('number', 'Solar V');          // 3
  dataTable.addColumn('number', 'Solar Elev °');     // 4
  dataTable.addColumn('number', 'Speed Km/h');       // 5
  dataTable.addColumn('number', 'Asc/Desc m/s');     // 6
  dataTable.addColumn('number', 'Temp °C');          // 7
  dataTable.addColumn('number', 'SNR dB');           // 8
  dataTable.addColumn({ type: 'string', role: 'tooltip' }); // 9
  dataTable.addColumn('number', 'Latitude');         // 10
  dataTable.addColumn('number', 'Longitude');        // 11
  dataTable.addColumn('number', 'Frequency Hz');     // 12
  dataTable.addColumn('number', 'Temp °F');          // 13
  dataTable.addColumn('number', 'Speed Knots');      // 14

  // ========================================================================
  // POPULATE DATA TABLE FROM data3 (ALL ROWS, ALL COLUMNS)
  // ========================================================================

  for (let i = 0; i < data3.length; i++) {
    const d = data3[i];
    // Add complete row with all 15 columns
    dataTable.addRow([
      d[0],  // datetime
      d[1],  // height m
      d[2],  // height ft
      d[3],  // solar v
      d[4],  // solar elev
      d[5],  // speed kmh
      d[6],  // asc/desc
      d[7],  // temp c
      d[8],  // snr
      d[9],  // tooltip
      d[10], // lat
      d[11], // lon
      d[12], // freq
      d[13], // temp f
      d[14]  // speed knots
    ]);
  }

  // ========================================================================
  // FORMAT DATE COLUMN (ASP uses 'MMM-dd HH:mm')
  // ========================================================================

  const dateFormatter = new google.visualization.DateFormat({
    pattern: 'MMM-dd HH:mm'
  });
  dateFormatter.format(dataTable, 0);

  // ========================================================================
  // BUILD CHART OPTIONS
  // ========================================================================

  // Common options for all charts
  const commonOptions = {
    backgroundColor: '#f2f2f2',
    width: window.innerWidth,
    smoothLine: true,
    lineWidth: 2,
    chartArea: {
      width: '85%',
      height: '85%',
      left: '5%'  // FIXED: Added missing 'left' property
    },
    legend: 'top',
    explorer: {
      actions: ['dragToZoom', 'rightClickToReset'],
      axis: 'horizontal',
      keepInBounds: true
    }
  };

  // Get chart-specific title
  const title = buildChartTitle(meterfeet);

  let options = { ...commonOptions, title };

  // Chart-specific vAxis and series configurations
  switch (meterfeet) {
    case 0: // Height meters
      options.vAxis = {
        0: {
          gridlines: { color: '#CBCBDC', count: 16 },
          title: 'Height meters',
          titleTextStyle: { fontSize: 20 }
        },
        1: { gridlines: { color: 'transparent', count: 16 } }
      };
      options.series = {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 }
      };
      options.colors = ['#3366cc'];
      break;

    case 1: // Height feet
      options.vAxis = {
        0: {
          gridlines: { color: '#CBCBDC', count: 16 },
          title: 'Height feet',
          titleTextStyle: { fontSize: 20 }
        },
        1: { gridlines: { color: 'transparent', count: 16 } }
      };
      options.series = {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 }
      };
      options.colors = ['#3366cc'];
      break;

    case 2: // Solar volts
      options.vAxis = {
        0: {
          gridlines: { color: '#CBCBDC', count: 16 },
          title: 'Solar volts',
          titleTextStyle: { fontSize: 20 }
        },
        1: { gridlines: { color: 'transparent', count: 16 } }
      };
      options.series = {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 }
      };
      options.colors = ['lightblue', '#3366cc'];
      break;

    case 3: // Solar elevation
      options.vAxis = {
        0: {
          gridlines: { color: '#CBCBDC', count: 16 },
          title: 'Solar elevation °',
          titleTextStyle: { fontSize: 20 }
        },
        1: { gridlines: { color: 'transparent', count: 16 } }
      };
      options.series = {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 }
      };
      options.colors = ['#3366cc', 'lightblue'];
      break;

    case 4: // Speed Km/h
      options.vAxis = {
        0: {
          gridlines: { color: '#CBCBDC', count: 16 },
          title: 'Horizontal Speed Km/h',
          titleTextStyle: { fontSize: 20 }
        },
        1: { gridlines: { color: 'transparent', count: 16 } }
      };
      options.series = {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 }
      };
      options.colors = ['lightblue', '#3366cc'];
      break;

    case 5: // Asc/Desc
      options.vAxis = {
        0: {
          gridlines: { color: '#CBCBDC', count: 16 },
          title: 'Asc/Desc m/s',
          titleTextStyle: { fontSize: 20 }
        },
        1: { gridlines: { color: 'transparent', count: 16 } }
      };
      options.series = {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 }
      };
      options.colors = ['lightblue', '#3366cc'];
      break;

    case 6: // Temp °C
      options.vAxis = {
        0: {
          gridlines: { color: '#CBCBDC', count: 16 },
          title: 'Temperature °C',
          titleTextStyle: { fontSize: 20 }
        },
        1: { gridlines: { color: 'transparent', count: 16 } }
      };
      options.series = {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 }
      };
      options.colors = ['lightblue', '#3366cc'];
      break;

    case 7: // SNR
      options.vAxis = {
        0: {
          gridlines: { color: '#CBCBDC', count: 16 },
          title: 'SNR dB',
          titleTextStyle: { fontSize: 20 }
        },
        1: { gridlines: { color: 'transparent', count: 16 } }
      };
      options.series = {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 }
      };
      options.colors = ['#3366cc', 'lightblue'];
      break;

    case 8: // Multiple chart
      options.vAxes = {
        0: {
          title: 'Height m / Solar V',
          gridlines: { color: '#CBCBDC', count: 16 }
        },
        1: {
          title: 'Temp °C / Speed Km/h',
          gridlines: { color: 'transparent', count: 16 }
        }
      };
      options.series = {
        0: { targetAxisIndex: 0 }, // Height
        1: { targetAxisIndex: 0 }, // Solar
        2: { targetAxisIndex: 1 }, // Temp
        3: { targetAxisIndex: 1 }  // Speed
      };
      break;
    case 9: // Longitude
      options.vAxes = {
        0: { title: '◁  West        Longitude °        East ▷' },
        gridlines: { color: '#CBCBDC', count: 16 },

        1: {
          gridlines: { color: 'transparent', count: 16 }
        }
      }
      options.series = {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 }
      };
      break;
    case 10: // Frequency
      options.legend = 'none';
      options.vAxis = {
        gridlineColor: '#ff0000',
        title: 'Frequency Hz',
        titleTextStyle: { fontSize: 17, italic: true },
        format: '######'
      };
      break;

    case 11: // Temp °F
      options.vAxis = {
        0: {
          gridlines: { color: '#CBCBDC', count: 16 },
          title: 'Temperature °F',
          titleTextStyle: { fontSize: 20 }
        },
        1: { gridlines: { color: 'transparent', count: 16 } }
      };
      options.series = {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 }
      };
      options.colors = ['lightblue', '#3366cc'];
      break;

    case 12: // Speed Knots
      options.vAxis = {
        0: {
          gridlines: { color: '#CBCBDC', count: 16 },
          title: 'Horizontal Speed Knots',
          titleTextStyle: { fontSize: 20 }
        },
        1: { gridlines: { color: 'transparent', count: 16 } }
      };
      options.series = {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 }
      };
      options.colors = ['lightblue', '#3366cc'];
      break;
  }

  // ========================================================================
  // CREATE DATAVIEW TO SELECT COLUMNS (ASP EXACT LOGIC)
  // CRITICAL: ASP uses MULTIPLE independent if statements (not if-else!)
  // The LAST matching if statement wins!
  // ========================================================================

  const view = new google.visualization.DataView(dataTable);

  // Column mapping for reference:
  // dataTable columns: [0=datetime, 1=height_m, 2=height_ft, 3=solar_v, 4=solar_elev, 
  //                     5=speed_kmh, 6=asc_desc, 7=temp_c, 8=snr, 9=tooltip,
  //                     10=lat, 11=lon, 12=freq, 13=temp_f, 14=speed_knots]

  // ASP logic - EXACT COPY (lines 1666-1676):
  // IMPORTANT: These are independent if statements, order matters!

  // Default for 0,1,3 (height meters, height feet, solar elevation)
  if (meterfeet < 6 && meterfeet != 2) {
    view.setColumns([0, meterfeet + 1]);
  }

  // Override specific cases:
  if (meterfeet == 6) {
    view.setColumns([0, 1, 7]); // Temp °C with height
  }
  if (meterfeet == 11) {
    view.setColumns([0, 3, 13]); // Temp °F with solar
  }
  if (meterfeet == 2) {
    view.setColumns([0, 1, 3]); // Height with solar
  }
  if (meterfeet == 7) {
    view.setColumns([0, 8, 9]); // SNR with tooltip column
  }
  if (meterfeet == 4) {
    view.setColumns([0, 1, 5]); // Height with Speed Km/h
  }
  if (meterfeet == 12) {
    view.setColumns([0, 1, 14]); // Height with Speed Knots
  }
  if (meterfeet == 8) {
    // Multiple chart with calculated columns
    view.setColumns([0, 4, 10, 13, 7,
      // Calculated: Solar Volts x 10
      {
        calc: function (dt, row) {
          const value = dt.getValue(row, 3);
          if (value !== null) {
            return { v: value * 10 };
          }
        },
        label: 'Solar Volts x 10',
        type: 'number'
      },
      // Calculated: Height Kfeet
      {
        calc: function (dt, row) {
          const value = dt.getValue(row, 2);
          if (value !== null) {
            return { v: value / 1000 };
          }
        },
        label: 'Height Kfeet',
        type: 'number',
        format: '$##,###'
      }
    ]);
  }
  if (meterfeet == 10) {
    view.setColumns([0, 12]); // Frequency
  }
  if (meterfeet == 9) {
    view.setColumns([0, 11]); // Longitude
  }
  if (meterfeet == 5) {
    view.setColumns([0, 1, 6]); // Height with Asc/Desc
  }

  // ========================================================================
  // DRAW CHART USING DATAVIEW
  // ========================================================================

  const chart = new google.visualization.LineChart(chartDiv);
  chart.draw(view, options);  // Draw with view, not dataTable!
  chartDiv.style.visibility = 'visible';

}

/**
 * Draw distance histogram chart (chart type 15)
 * Uses data5 array
 */
function drawDistanceChart() {

  const chartDiv = document.getElementById('chart_div');
  if (!chartDiv) {
    console.error('[Charts] chart_div element not found');
    return;
  }

  // Ensure data5 is ready
  if (data5.length === 0) {
    console.error('[Charts] data5 is empty - call prepareDistanceData() first');
    chartDiv.style.visibility = 'hidden';
    return;
  }

  // Highlight chart button
  setChartButtonHighlight(15);

  // Create data table
  const dataTable = new google.visualization.DataTable();
  dataTable.addColumn('number', 'Dist.Km.');
  dataTable.addColumn('number', 'Reports Count');

  // Add rows
  for (let i = 0; i < data5.length; i++) {
    dataTable.addRow(data5[i]);
  }

  // Build options
  const title = buildChartTitle(15);

  const options = {
    backgroundColor: '#f2f2f2',
    width: window.innerWidth,
    smoothLine: true,
    lineWidth: 2,
    chartArea: { width: '85%', height: '85%' },
    legend: 'top',
    hAxis: { format: '##,###Km' },
    vAxis: {
      title: 'Reports Count',
      titleTextStyle: { fontSize: 22 },
      viewWindow: { min: 0 },
      viewWindowMode: 'explicit',
      gridlines: { color: '#CBCBDC', count: 19 }
    },
    explorer: {
      actions: ['dragToZoom', 'rightClickToReset'],
      axis: 'horizontal',
      keepInBounds: true
    },
    title
  };

  // Draw chart
  const chart = new google.visualization.LineChart(chartDiv);
  chart.draw(dataTable, options);
  chartDiv.style.visibility = 'visible';

}

/**
 * Open solar flux popup window
 * Matches ASP solarflux() function (lines 2277-2291)
 */
function solarFlux() {
  // Highlight button
  setChartButtonHighlight(13);

  // Position window
  const posleft = screen.availWidth / 2 + 6;
  const postop = screen.availHeight / 2 - 320;

  // Close existing popup
  if (typeof popupwin !== 'undefined' && popupwin != null) {
    popupwin.close();
  }

  // Build HTML
  let codata = '</head><body style="margin-top:0px;margin-left:0px;margin-right:0;margin-bottom:0;background-color:#f8f8f8;" color="#ffffff" onclick="self.close();">';
  codata += "<center><img src='https://services.swpc.noaa.gov/images/swx-overview-small.gif' height='495px' style='background-color:#ffffff;'>";
  codata += '</body></html>';

  // Window preferences
  const anchopantalla = 514;
  const altopantalla = 505;
  const preferences = `toolbar=no,width=${anchopantalla}px,height=${altopantalla}px,center,margintop=0,top=${postop},left=${posleft},status=no,scrollbars=no,resizable=no,dependent=yes,z-lock=yes`;

  // Open popup
  window.popupwin = window.open('', 'win1', preferences);
  window.popupwin.document.write(codata);
  window.popupwin.setTimeout('self.close();', 120000); // Close after 2 minutes

}

// ============================================================================
// CHART CYCLING
// ============================================================================

/**
 * Automatically cycle through all charts
 * Displays each chart for 5 seconds
 */
function startChartCycle() {

  // Stop any existing cycle
  if (chartInterval) {
    clearInterval(chartInterval);
  }

  let meterfeet = 0;

  chartInterval = setInterval(() => {
    drawChart(meterfeet);
    meterfeet++;

    if (meterfeet > 13) {
      // Cycle complete
      meterfeet = 0;
      document.getElementById('chart_div').style.visibility = 'hidden';
      clearInterval(chartInterval);
      chartInterval = null;
    }
  }, 5000); // 5 seconds per chart
}

/**
 * Stop chart cycling
 */
function stopChartCycle() {
  if (chartInterval) {
    clearInterval(chartInterval);
    chartInterval = null;
  }

  const chartDiv = document.getElementById('chart_div');
  if (chartDiv) {
    chartDiv.style.visibility = 'hidden';
    setChartButtonHighlight(-2);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export functions for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initCharts,
    prepareChartData,
    prepareDistanceData,
    drawChart,
    drawDistanceChart,
    solarFlux,
    startChartCycle,
    stopChartCycle
  };
}
