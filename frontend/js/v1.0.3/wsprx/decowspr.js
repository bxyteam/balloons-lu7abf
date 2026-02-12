function decoqrp(lcall, lloc, ldbm) {
  try {
    const E7 = lloc.charCodeAt(0) - 65; // A=0, B=1, etc.
    const F7 = lloc.charCodeAt(1) - 65;
    const G7 = lloc.charCodeAt(2) - 48; // 0=0, 1=1, etc.
    const H7 = lloc.charCodeAt(3) - 48;

    const F5A = lcall[1];
    const H5A = lcall[3];
    const I5A = lcall[4] || '';
    const J5A = lcall[5] || ''; // May be empty

    // Convert to numeric (ASP lines 307-310) - safe access
    const F5 = isNaN(F5A) ? (F5A ? F5A.charCodeAt(0) - 55 : 0) : parseInt(F5A);
    const H5 = isNaN(H5A) ? (H5A ? H5A.charCodeAt(0) - 65 : 0) : parseInt(H5A);
    const I5 = isNaN(I5A) ? (I5A ? I5A.charCodeAt(0) - 65 : 0) : parseInt(I5A);
    const J5 = isNaN(J5A) ? (J5A ? J5A.charCodeAt(0) - 65 : 0) : parseInt(J5A);

    // Calculate telemetry values (ASP line 314)
    const num1 = (F5 * 26 * 26 * 26 + H5 * 26 * 26 + I5 * 26 + J5) % 632736;
    const num2 = Math.floor((E7 * 18 * 10 * 10 * 19 + F7 * 10 * 10 * 19 +
      G7 * 10 * 19 + H7 * 19 + (powerDict[ldbm] || 0)) / 4) % 158184;

    return String(num1).padStart(6, '0') + " " + String(num2).padStart(6, '0');
  } catch (error) {
    console.error("Error in decoqrp:", error);
    return "";
  }
}


/**
 * decowsprRefactored.js
 * Phase 2: Refactored decowspr Function
 * 
 * CRITICAL: All calculation logic remains IDENTICAL to original
 * CHANGE: Separates data processing from HTML generation
 * 
 * OLD: decowspr() returns HTML string
 * NEW: decowsprRefactored() returns data object
 *      buildTelemetryRow() builds HTML from data object
 */

/**
 * Refactored decowspr function
 * Returns structured data instead of HTML string
 * 
 * @param {string} diahora - Timestamp
 * @param {string} lcall - Callsign
 * @param {string} lloc - Grid locator
 * @param {number} ldbm - Power in dBm
 * @param {string} reporter - Reporter callsign
 * @param {string} rgrid - Reporter grid
 * @param {number} km - Distance in km
 * @param {number} az - Azimuth in degrees
 * @param {Object} options - Additional options
 * @param {Array} options.tele1 - Telemetry 1 data for reference
 * @param {string} options.tracker - Tracker type
 * @returns {Object} Decoded telemetry data
 */
/**
 * decowsprRefactored.js
 * Fully patched version — returns pure data object, preserves legacy behavior
 */

/**
 * CORRECTED decowsprRefactored.js
 * Complete rewrite based on ASP original (lines 528-919)
 * Returns data object instead of HTML
 */

function decowspr(
  diahora,
  lcall,
  lloc,
  ldbm,
  reporter,
  rgrid,
  km,
  az,
  options = {}
) {
  // ===========================================
  // RESULT OBJECT
  // ===========================================
  const result = {
    success: false,
    error: null,
    timestamp: diahora || "",
    callsign: lcall || "",
    rawGrid: lloc || "",
    power: ldbm,
    reporter: reporter || "",
    reporterGrid: rgrid || "",
    distance: km || 0,
    azimuth: az || 0,
    locator: "",
    temperature: null,
    voltage: null,
    speed: null,
    altitude: null,
    gpsSats: "",
    gpsValid: false,
    sunAngle: null,
    decodedInfo: "",
    _internal: {
      K6: "",
      N6: "",
      wchan: "",
      walt1: ""
    }
  };

  // ===========================================
  // VALIDATION
  // ===========================================
  if (!diahora || !lcall || !lloc || ldbm === undefined || ldbm === null) {
    result.error = "Missing required parameters";
    return result;
  }

  try {
    const tracker = options.tracker || getParamSafe("tracker");
    const isQrpTracker = lcase(tracker) === "qrplabs" || lcase(tracker) === "traquito";

    // Extract components
    const E5 = lcall.charAt(0);
    const F5 = lcall.charAt(1);
    const G5 = lcall.charAt(2);
    const H5 = lcall.charAt(3);
    const I5 = lcall.charAt(4);
    const J5 = lcall.charAt(5);

    const E7 = lloc.charAt(0);
    const F7 = lloc.charAt(1);
    const G7 = lloc.charAt(2);
    const H7 = lloc.charAt(3);

    const A_code = "A".charCodeAt(0);

    // ===========================================
    // STANDARD TRACKER PATH
    // ===========================================
    if (!isQrpTracker) {
      const G5_code = G5.charCodeAt(0);
      const H5_code = H5.charCodeAt(0);

      // Calculate I5 and J5 from power (ASP lines 539-544)
      let I5_val, J5_val;
      if (ldbm >= 23) {
        I5_val = ldbm - 23;
        J5_val = 0;
      } else {
        I5_val = 0;
        J5_val = ldbm;
      }

      // CRITICAL: Calculate W7, X7, Y7 (ASP lines 546-551)
      const W7 = G5_code - 65 + I5_val;
      const X7 = H5_code - 65;
      const Y7 = J5_val;

      // Temperature calculation (ASP lines 554-565)
      const K7 = Math.floor((G5_code * 179 + H5_code * 10 + J5_val) / 25);
      const L7 = K7 * 2 + 407;
      let M7 = (5 * L7) / 1024;
      if (M7 > 3) M7 = M7 - 0.95;
      const N7 = 100 * (M7 - 2) - 73;
      let O7 = N7;
      if (O7 < -50) O7 = -30 - O7;

      window.wtemp = Math.floor(O7 + 2);
      result.temperature = window.wtemp;
      AppState.current.wtemp = window.wtemp;

      // Battery voltage (ASP lines 568-573)
      const P7 = (G5_code * 179 + H5_code * 10 + J5_val) - K7 * 25;
      const Q7 = P7 * 10 + 614;
      const R7 = 3.0 + Math.floor((P7 + 5) % 50) * 0.05;

      window.wbat = R7.toFixed(2);
      result.voltage = window.wbat;
      AppState.current.wbat = window.wbat;

      // Speed (ASP line 576)
      window.wspeed = Math.floor((H5_code - A_code) * 5 * 1.852);
      result.speed = window.wspeed;
      AppState.current.wspeed = window.wspeed;

      // Altitude (ASP lines 579-581)
      const AB7 = X7 - Y7 * 1068;
      const AC7 = AB7 * 20;

      window.walt = AC7;
      result.altitude = window.walt;
      AppState.current.walt = window.walt;

      // GPS satellites (ASP lines 584-598)
      const AD7 = Math.floor(W7 / 2);
      const AE7 = W7 % 2;

      let wgps = AD7;
      let wsats = "";

      if (AD7 === 1 && AE7 === 0) {
        wgps = 0;
        wsats = "NOF";
        result.altitude = " ";
      } else {
        wgps = 1;
        if (AD7 < 8) {
          wsats = "4-8";
        } else {
          wsats = "> 8";
        }
      }

      window.wsats = wsats;
      result.gpsSats = wsats;
      result.gpsValid = wgps === 1;
      AppState.current.wsats = wsats;

      // Locator characters (ASP lines 601-604)
      const K6 = String.fromCharCode(W7 + A_code);
      const N6 = String.fromCharCode(Y7 + A_code);

      window.K6_SAVE = K6;
      window.N6_SAVE = N6;
      result._internal.K6 = K6;
      result._internal.N6 = N6;
      AppState.current.K6_SAVE = K6;
      AppState.current.N6_SAVE = N6;

      result.locator = lloc + K6 + N6;
    }
    // ===========================================
    // QRP TRACKER PATH
    // ===========================================
    else {
      // Convert locator to numeric values (ASP lines 714-718)
      const E7_val = E7.charCodeAt(0) - A_code;
      const F7_val = F7.charCodeAt(0) - A_code;
      const G7_val = parseInt(G7, 10) || 0;
      const H7_val = parseInt(H7, 10) || 0;

      // Get power dictionary value (ASP line 720)
      const D5 = (window.dic && window.dic[ldbm]) ? window.dic[ldbm] : 0;

      // Calculate I7 (ASP lines 723-727)
      const I7 = E7_val * 18 * 10 * 10 * 19 +
                 F7_val * 10 * 10 * 19 +
                 G7_val * 10 * 19 +
                 H7_val * 19 +
                 D5;

      // Temperature (ASP lines 730-741)
      const J7 = Math.floor(I7 / (40 * 42 * 2 * 2));
      const J8 = J7 * 2 + 457;
      let J9 = (5 * J8) / 1024;
      if (J9 > 3) J9 = J9 - 0.85;
      const J10 = 100 * (J9 - 2) - 73;
      let finalTemp = J10;
      if (finalTemp < -45) finalTemp = -28 - finalTemp;

      window.wtemp = Math.floor(finalTemp + 2);
      result.temperature = window.wtemp;
      AppState.current.wtemp = window.wtemp;

      // Callsign processing (ASP lines 744-748)
      const F5_val = parseInt(F5, 10);
      const isF5Numeric = !isNaN(F5_val);

      // Calculate L5 (ASP lines 751-760)
      let L5;
      if (isF5Numeric) {
        L5 = 26 * 26 * 26 * (F5.charCodeAt(0) - "0".charCodeAt(0)) +
             26 * 26 * (H5.charCodeAt(0) - A_code) +
             26 * (I5.charCodeAt(0) - A_code) +
             (J5.charCodeAt(0) - A_code);
      } else {
        L5 = 26 * 26 * 26 * (10 + F5.charCodeAt(0) - A_code) +
             26 * 26 * (H5.charCodeAt(0) - A_code) +
             26 * (I5.charCodeAt(0) - A_code) +
             (J5.charCodeAt(0) - A_code);
      }

      // Calculate channel and locator (ASP lines 763-771)
      const I6 = L5;
      const resul = (E5 === "Q") ? 10 : 0;
      const K5 = G5.charCodeAt(0) + resul;

      const J6_N = Math.floor(I6 / (24 * 1068));
      const J6 = isNaN(J6_N) ? 0 : J6_N;
      const L6 = I6 - J6 * (24 * 1068);
      const L7 = I7 - J7 * (40 * 42 * 2 * 2);
      const M6_N = Math.floor(L6 / 1068);
      const M6 = isNaN(M6_N) ? 0 : M6_N;

      // Locator characters (ASP lines 774-778)
      const K6 = String.fromCharCode(J6 + A_code);
      const N6 = String.fromCharCode(M6 + A_code);

      window.K6_SAVE = K6;
      window.N6_SAVE = N6;
      result._internal.K6 = K6;
      result._internal.N6 = N6;
      AppState.current.K6_SAVE = K6;
      AppState.current.N6_SAVE = N6;

      // Battery voltage (ASP lines 781-786)
      const M7 = Math.floor(L7 / (42 * 2 * 2));
      const M8 = M7 * 10 + 614;
      const wb = 3.0 + Math.floor((M7 + 20) % 40) * 0.05;

      window.wbat = wb.toFixed(2);
      result.voltage = window.wbat;
      AppState.current.wbat = window.wbat;

      // Altitude (ASP lines 789-791)
      const O6 = L6 - M6 * 1068;
      const P6 = O6 * 20;

      window.walt = P6;
      result._internal.walt1 = P6;
      AppState.current.walt = P6;

      // Speed (ASP lines 794-800)
      const O7 = L7 - M7 * 42 * 2 * 2;
      const P7 = Math.floor(O7 / (2 * 2));
      const Q7 = P7 * 2;
      const R7 = O7 - P7 * 2 * 2;

      let speed = Q7;
      speed = Math.floor((speed * 60 * 60) / 1000 / 1.852);
      if (speed < 84) speed = speed + 84;

      window.wspeed = speed;
      result.speed = window.wspeed;
      AppState.current.wspeed = window.wspeed;

      // GPS status (ASP lines 803-817)
      const S7 = Math.floor(R7 / 2);
      const T7 = R7 % 2;
      let wgps = S7;

      const S7_fixed = 1;
      const T7_fixed = 1;

      let wsats = "";
      let walt1 = " ";

      if (S7_fixed === 1 && T7_fixed === 0) {
        wgps = 0;
        wsats = "NOF";
        walt1 = " ";
      } else {
        wgps = 1;
        wsats = "4-8";
        walt1 = window.walt;
      }

      window.wsats = wsats;
      result.gpsSats = wsats;
      result.gpsValid = wgps === 1;
      result.altitude = walt1 || " ";
      AppState.current.wsats = wsats;

      // Channel (ASP lines 820-823)
      let wchan = K5 - 48;
      if (wchan < 10) {
        wchan = "0" + wchan;
      }
      result._internal.wchan = wchan;

      // Determine buscohora (ASP lines 826-843)
      let buscohora = diahora;
      const timeslot = getParamSafe("timeslot") || "";

      if (timeslot.trim() === "") {
        const dateObj = new Date(diahora);
        if (!isNaN(dateObj.getTime())) {
          dateObj.setMinutes(dateObj.getMinutes() - 1);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const day = String(dateObj.getDate()).padStart(2, "0");
          const hours = String(dateObj.getHours()).padStart(2, "0");
          const minutes = String(dateObj.getMinutes()).padStart(2, "0");
          buscohora = `${year}-${month}-${day} ${hours}:${minutes}`;
        }
      }

      // Lookup in tele1 (ASP lines 846-855)
      const actualdate = buscohora.substring(0, 15);
      window.newloc = "";

      if (options.tele1 && Array.isArray(options.tele1)) {
        for (let k = 0; k < options.tele1.length; k++) {
          const record = options.tele1[k];
          const recordTime = record.time || "";
          const recordGrid = record.grid || "";

          if (actualdate === recordTime.substring(0, 15)) {
            window.newloc = recordGrid;
            break;
          }
        }
      }

      AppState.current.newloc = window.newloc;

      // QRP decode info (ASP lines 858-869)
      if (getParamSafe("qp") === "on") {
        const dig2 = diahora.charAt(14);
        let colori, colorf;

        if (["1", "3", "5", "7", "9"].includes(dig2)) {
          colori = "<span class='narrow' style='color:gray;'>";
          colorf = "</span>";
        } else {
          colori = "<span class='narrow' style='color:black;'>";
          colorf = "</span>";
        }

        const decoqrpResult = decoqrp(lcall, lloc, ldbm);
        result.decodedInfo = colori + decoqrpResult + colorf;
      }

      // Final locator (ASP lines 872-876)
      let finalLocator;
      if (window.newloc && window.newloc.length > 3) {
        finalLocator = window.newloc.substring(0, 4) + K6 + N6;
      } else {
        finalLocator = K6 + N6;
      }

      result.locator = finalLocator;
    }

    // ===========================================
    // SUN ANGLE (common to both paths)
    // ===========================================
    if (result.locator && result.locator.length > 3) {
      try {
        result.sunAngle = putsun(diahora, result.locator);
      } catch (error) {
        console.warn("Error calculating sun angle:", error);
        result.sunAngle = null;
      }
    }

    result.success = true;
    return result;

  } catch (error) {
    console.error("Error in decowsprRefactored:", error);
    result.error = error.message || "Unknown error";
    result.success = false;
    return result;
  }
}

/**
 * Build HTML table row from decoded data
 * SEPARATE function for HTML generation
 * 
 * @param {Object} decoded - Decoded telemetry data
 * @param {Object} options - Display options
 * @returns {string} HTML table row
 */

function buildTelemetryRow(decoded, options = {}) {
  if (!decoded.success) {
    const errorMsg = decoded.error || 'Unknown error';
    return `<tr><td colspan="14">Error: ${errorMsg}</td></tr>`;
  }

  // Format values with proper padding
  const tempStr = decoded.temperature !== null
    ? decoded.temperature.toString().padStart(4, " ").replaceAll(" ", "&nbsp;")
    : "&nbsp;";

  const voltStr = decoded.voltage
    ? decoded.voltage + "V"
    : "&nbsp;";

 
const speedStr = decoded.speed !== null && decoded.speed !== undefined
  ? right("   " + decoded.speed, 3)
  : "   ";

  let altStr = "";
  if (decoded.altitude === " ") {
    altStr = "&nbsp;";
  } else if (typeof decoded.altitude === 'number' || !isNaN(decoded.altitude)) {
    altStr = right("     " + decoded.altitude, 5);
  } else {
    altStr = "    0";
  }

  const gpsStr = decoded.gpsSats || "&nbsp;";
  const sunStr = decoded.sunAngle || "&nbsp;";

  // Build locator display
  const locatorDisplay = decoded.locator || decoded.rawGrid;

  // Get power for display (padded to 2 chars)
  const powerDisplay = decoded.power.toString().padStart(2, " ").slice(-2);

  // Build HTML row (PRESERVE ORIGINAL STRUCTURE)
  let html = `<tr style="line-height:11px;">`;
  html += `<td colspan="1">${decoded.timestamp}</td>`;
  html += `<td>${decoded.callsign}&nbsp;${decoded.rawGrid.substring(0, 4)}&nbsp;${powerDisplay}</td>`;
  html += `<td>${locatorDisplay}</td>`;
  html += `<td>${tempStr}°C</td>`;
  html += `<td>${voltStr}</td>`;
  html += `<td>${speedStr}</td>`;
  html += `<td>${decoded.gpsValid ? "1" : "0"}&nbsp;${gpsStr}</td>`;
  html += `<td>${decoded.reporter}</td>`;
  html += `<td>${decoded.reporterGrid}</td>`;
  html += `<td>${decoded.distance}</td>`;
  html += `<td>${decoded.azimuth}</td>`;
  html += `<td>${altStr}</td>`;
  html += `<td align="right">${sunStr}</td>`;

  // Add decoded info column if present
  if (options.showDecoded && decoded.decodedInfo) {
    html += `<td style='font-family:Arial Narrow;text-align:left;'>${decoded.decodedInfo}</td>`;
  }

  html += `</tr>`;

  if (decoded.needsSeparator) {
    const colCount = options.showDecoded ? 14 : 13;
    html += `<tr><td colspan="${colCount}"><hr></td></tr>\n`;
  }

  return html;
}


if (typeof window !== 'undefined') {
  window.decowspr = decowspr;
  window.decoqrp = decoqrp;
  window.buildTelemetryRow = buildTelemetryRow;

}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    decowspr,
    decoqrp,
    buildTelemetryRow,
    
  };
}