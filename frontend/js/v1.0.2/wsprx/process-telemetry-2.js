/**
 * processTelemetry2.js
 *
 * Responsibilities:
 * 1. Decode each Telemetry 2 record using decowsprRefactored()
 * 2. Update `punt` and build `punto`/`puntos` arrays correctly
 * 3. Capture final popup values from row i === 2 (like old ASP)
 * 4. Return structured data for rendering and map updates
 */

function processTelemetry2() {

  const config = AppState.config;
  const tele1 = AppState.telemetry.tele1;
  const tele2 = AppState.telemetry.tele2;
  const punt = AppState.telemetry.punt;
  const puntpointer = AppState.results.puntpointer;
  const desdeFecha = AppState.results.desdeFecha;
  const launchdate = config.launchdate;
  const tracker = lcase(config.tracker);
  const balloonid = config.balloonid;
  const timeslot = config.timeslot;
  const detail = config.detail;

  AppState.telemetry.punto = [];
  AppState.telemetry.puntos = [];

  let puntopointer = 0;
  let puntospointer = 0;
  let cuentalineas = 0;

  let cuenta = config.cuentaSizeTele2;
  if (detail !== "") {
    cuenta = config.countSize2Tele2;
  }
  const cuentamax = cuenta;

  let TempFinal = "";
  let VoltFinal = "";
  let Altfinal = "";
  let Locfinal = "";
  let GPSfinal = "";
  let decoqr = "";
  let decoqr1 = "";
  let decoqrf = "";
  let previousdate = "";

  const rowDataArray = [];
  const seenBeacons = new Set();

  // ===========================================
  // MAIN LOOP - Process tele2 records
  // ===========================================
  for (let i = 0; i < tele2.length; i++) {
    const record = tele2[i];
    if (!record || !record.time) continue;

    const fechahora = record.time;

    // Calculate buscohora (ASP lines 1318-1345)
    let buscohora;
    if (trim(timeslot) !== "") {
      buscohora = left(fechahora, 15);
    } else {
      const fechahoraDate = new Date(fechahora);
      const buschoraDate = dateAdd("n", -1, fechahoraDate);
      buscohora = left(formatDateTime(buschoraDate), 15);
    }

    // Checkit validation (ASP lines 1348-1357)
    let checkit = true;
    if (lcase(tracker) === "wb8elk") {
      const actuali = record.grid;
      checkit = false;
      for (let r = i + 1; r < tele2.length; r++) {
        if (actuali === tele2[r].grid) {
          checkit = true;
          break;
        }
      }
    }

    const isQrpTracker = tracker === "qrplabs" || tracker === "traquito";
    const qrplen4 = record.grid.length === 4 && isQrpTracker;

    // Date range check (ASP line 1362)
    if (
      new Date(fechahora) <= new Date(desdeFecha) ||
      new Date(fechahora) < new Date(launchdate) ||
      !checkit
    ) {
      continue;
    }

    const loc4 = isQrpTracker ? left(record.grid, 4) : record.grid;

    // ===========================================
    // SHOULD PROCESS CHECK (ASP lines 1412-1431)
    // ===========================================
    let shouldProcess = false;

    // Check balloonid match (ASP line 1412)
    if (balloonid) {
      const callPattern = record.callsign.charAt(0) + record.callsign.charAt(2);
      if (callPattern !== balloonid) {
        continue;
      }
    }

    // Check timeslot and loc4 (ASP line 1421)
    if (
      (timeslot === mid(fechahora, 16, 1) ||
        timeslot === "" ||
        (timeslot === " " && balloonid !== "")) &&
      loc4.length === 4
    ) {
      shouldProcess = true;
    }

    if (!shouldProcess) continue;

    // ===========================================
    // SHOULD OUTPUT CHECK (ASP lines 1423-1443)
    // ===========================================
    const beaconKey = `${record.callsign}_${loc4}_${record.power}`;

    let shouldOutput = false;
    if (detail === "") {
      // Normal mode (ASP line 1425)
      const nextRecord = tele2[i + 1];
      const nextTimestamp = nextRecord ? nextRecord.time : "";
      if (i === 0) {
        shouldOutput = true;
      } else if (cuentalineas < cuentamax && record.time !== nextTimestamp) {
        shouldOutput = true;
      }

      // Skip duplicates in normal mode
      if (seenBeacons.has(beaconKey)) {
        continue;
      }
    } else {
      // Detail mode (ASP line 1432)
      if (cuentalineas < cuentamax || i === 0) {
        shouldOutput = true;
      }
    }

    if (!shouldOutput) continue;

    seenBeacons.add(beaconKey);

    // ===========================================
    // DECODE TELEMETRY (ASP line 1424/1433)
    // ===========================================
    const decoded = decowspr(
      fechahora,
      record.callsign,
      loc4,
      record.power,
      record.reporter,
      record.reporterGrid,
      record.distance,
      record.azimuth,
      {
        tracker: tracker,
        tele1: tele1
      }
    );

    // ===========================================
    // CAPTURE FINALS (ASP lines 1447-1453)
    // ===========================================
    if (decoded.success) {
      if (i === 0) {
        // First row becomes finals
        TempFinal = decoded.temperature !== null ? decoded.temperature.toString() : "";
        VoltFinal = decoded.voltage || "";
        Altfinal = decoded.altitude !== null && decoded.altitude !== " "
          ? decoded.altitude.toString() : "";
        Locfinal = decoded.locator || "";
        GPSfinal = decoded.gpsSats || "";

      }

      // ===========================================
      // UPDATE PUNT ARRAY (ASP lines 1524-1532)
      // CRITICAL: Match by buscohora (time - 1 minute)
      // ===========================================
      const actualdate = left(fechahora, 15);

      if (decoded.locator && decoded.locator.length > 2) {
        for (let z = 0; z <= puntpointer; z++) {
          const puntRecord = punt[z];
          if (puntRecord && left(puntRecord.time, 15) === buscohora) {
            // ASP lines 1526-1529
            puntRecord.locator = decoded.locator;
            puntRecord.altitude = decoded.altitude || puntRecord.altitude;
            puntRecord.temperature = decoded.temperature || puntRecord.temperature;
            puntRecord.voltage = decoded.voltage || puntRecord.voltage;
            puntRecord.field5 = decoded.speed || puntRecord.field5;

            break;
          }
        }
      }

      rowDataArray.push({
        ...decoded,
        originalRecord: record,
        index: i
      });

      // Save decoqrf (ASP lines 1387-1390)
      if (config.qp === "on" && decoqrf === "" && decoded.decodedInfo && decoded.decodedInfo.length > 61) {
        decoqrf = "T# " + decoded.decodedInfo.replace(/<[^>]*>/g, "").replace(/\r?\n/g, "");
      }
    }

    cuentalineas++;

    // Time gap separator (ASP lines 1445-1448)
    const nextRecord = tele2[i + 1];
    if (
      cuentalineas < cuentamax &&
      nextRecord &&
      nextRecord.time &&
      nextRecord.time.length > 5 &&
      dateDiffMinutes(nextRecord.time, previousdate) > 360
    ) {
      if (rowDataArray.length > 0) {
        rowDataArray[rowDataArray.length - 1].needsSeparator = true;
      }
    }

    if (nextRecord && nextRecord.time && nextRecord.time.length > 5) {
      previousdate = nextRecord.time;
    }
  }

  // ===========================================
  // BUILD PUNTO/PUNTOS FROM PUNT (ASP lines 1551-1568)
  // ===========================================

  puntopointer = puntpointer;
  puntospointer = 0;

  for (let k = 0; k <= puntpointer; k++) {
    const puntRecord = punt[k];
    if (puntRecord) {
      const puntoRecord = new PuntoRecord();
      puntoRecord.time = puntRecord.time || "";
      puntoRecord.locator = replace(puntRecord.locator || "", "&nbsp;", "", 1, 20, 1);
      puntoRecord.temperature = puntRecord.temperature || "";
      puntoRecord.altitude = puntRecord.altitude || 0;
      puntoRecord.voltage = puntRecord.voltage || "";
      puntoRecord.field5 = puntRecord.field5 || "";
      puntoRecord.data = puntRecord.reporters || "";
      puntoRecord.field7 = puntRecord.frequency || "";

      AppState.telemetry.punto.push(puntoRecord);

      const puntosRecord = new PuntosRecord();
      puntosRecord.time = puntRecord.time || "";
      puntosRecord.locator = replace(puntRecord.locator || "", "&nbsp;", "", 1, 20, 1);
      puntosRecord.temperature = puntRecord.temperature || "";
      puntosRecord.altitude = puntRecord.altitude || 0;
      puntosRecord.voltage = puntRecord.voltage || "";
      puntosRecord.field5 = puntRecord.field5 || "";
      puntosRecord.data = puntRecord.reporters || "";
      puntosRecord.field7 = puntRecord.frequency || "";

      AppState.telemetry.puntos.push(puntosRecord);

      puntospointer = k;
    }
  }

  // Shift punto down by 1 (ASP lines 1570-1579)
  puntopointer = puntopointer - 1;

  for (let m = 1; m <= puntopointer + 2; m++) {
    if (AppState.telemetry.punto[m]) {
      if (!AppState.telemetry.punto[m - 1]) {
        AppState.telemetry.punto[m - 1] = new PuntoRecord();
      }

      const source = AppState.telemetry.punto[m];
      const target = AppState.telemetry.punto[m - 1];

      target.time = source.time;
      target.locator = source.locator;
      target.temperature = source.temperature;
      target.altitude = source.altitude;
      target.voltage = source.voltage;
      target.field5 = source.field5;
      target.data = source.data;
      target.field7 = source.field7;
    }
  }

  // ===========================================
  // BUILD BEACON1 (ASP lines 1580-1602)
  // CRITICAL: Speed comes from punto[k][5], NOT velocity
  // ===========================================

  AppState.map.beacon1 = [];
  let lastpunto = "";
  let lasttiempo = "";
  let veloci = 0;
  const hora0 = AppState.results.hora0;

  // Calculate llaverage for LL filtering (ASP lines 1551-1560)
  let llcount = 0;
  let totalcount = 0;
  for (let k = 0; k <= puntopointer; k++) {
    const puntoLoc = AppState.telemetry.punto[k]?.locator || "";
    if (right(puntoLoc, 2) === "LL" && puntoLoc.length > 3) {
      llcount++;
    }
    if (puntoLoc.length > 3) {
      totalcount++;
    }
  }
  const llaverage = totalcount > 0 ? llcount / totalcount : 0;

  for (let k = 0; k <= puntopointer + 2; k++) {
    const puntoRecord = AppState.telemetry.punto[k];
    if (!puntoRecord || !puntoRecord.time) continue;

    // ASP line 1581: Check altitude
    if (puntoRecord.altitude !== undefined &&
      puntoRecord.altitude !== null &&
      puntoRecord.altitude !== "" &&
      puntoRecord.altitude >= 0) {

      // ASP line 1582: Fill missing time
      if (!puntoRecord.time || puntoRecord.time.length < 10) {
        puntoRecord.time = hora0;
      }

      // ASP line 1583: Clean locator
      puntoRecord.locator = replace(puntoRecord.locator || "", "db", "", 1, 1, 1);

      // ASP lines 1584-1586: Check omit list
      let estax = false;
      if (window.omi && Array.isArray(window.omi)) {
        for (let w = 0; w < window.omi.length; w++) {
          if (window.omi[w] === puntoRecord.locator) {
            estax = true;
            break;
          }
        }
      }

      // ASP line 1588: XOR logic for LL locators
      let usell;
      const isLL = right(puntoRecord.locator || "", 2) === "LL";
      const notLL = !isLL;
      const xorResult = (llaverage < 1 && isLL) || (llaverage >= 1 && notLL);
      usell = !xorResult;

      // ASP line 1589: Combined check
      if (
        puntoRecord.locator &&
        puntoRecord.locator.length > 3 &&
        puntoRecord.time !== lastpunto &&
        !estax &&
        usell
      ) {
        // ASP lines 1590-1596: Calculate velocity FOR FILTERING ONLY
        if (puntoRecord.locator && puntoRecord.locator.length > 3 && lastpunto !== "") {
          try {
            const loc1 = loctolatlon(puntoRecord.locator);
            const loc2 = loctolatlon(lastpunto);
            const dist = crsdist(loc1.lat, loc1.lon, loc2.lat, loc2.lon);
            const distancia = dist.distance * 1.852;

            if (lasttiempo !== "") {
              const currentTime = new Date(puntoRecord.time.replace(/z/gi, ""));
              const lastTime = new Date(lasttiempo.replace(/z/gi, ""));
              const tiempo = dateDiff("s", currentTime, lastTime);

              const tiempoAbs = Math.abs(tiempo);
              if (tiempoAbs > 0) {
                veloci = Math.abs((distancia * 3600) / tiempo);
              }
            }
          } catch (error) {
            console.error("Distance calc error:", error);
          }
        }

        // ASP line 1598: Update last point
        if (lastpunto !== puntoRecord.locator) {
          lastpunto = puntoRecord.locator;
          lasttiempo = puntoRecord.time;
        }

        // ASP line 1599: Add to beacon1 if velocity < 301
        // CRITICAL: Use punto[k][5] for speed, NOT veloci
        if (veloci < 301) {
          const timestamp = String(puntoRecord.time || "");
          const locator = String(left(puntoRecord.locator || "", 6));
          const temp = String(puntoRecord.temperature || "");
          const altitude = String(puntoRecord.altitude || "");
          const voltage = String(puntoRecord.voltage || "");

          // CRITICAL: Speed from punto[k][5] (telemetry), NOT calculated velocity
          let speed = "";
          const speedValue = puntoRecord.field5;
          if (speedValue !== undefined && speedValue !== null &&
            speedValue !== "" && speedValue !== 0 && speedValue !== "0") {
            const speedInt = Math.floor(Number(speedValue));
            if (speedInt > 0) {
              speed = String(speedInt);
            }
          }

          const reporters = String(puntoRecord.data || "");
          const frequency = String(puntoRecord.field7 || "");

          AppState.map.beacon1.push([
            timestamp,
            locator,
            temp,
            altitude,
            voltage,
            speed,
            reporters,
            frequency
          ]);
        }
      }
    }
  }

  AppState.map.trayecto = [];
  lastpunto = "";

  for (let k = 0; k <= puntospointer; k++) {
    const puntosRecord = AppState.telemetry.puntos[k];
    if (!puntosRecord) continue;

    if (puntosRecord.altitude !== "" && puntosRecord.altitude >= 0) {
      if (puntosRecord.time.length < 10) {
        puntosRecord.time = hora0;
      }

      puntosRecord.locator = replace(puntosRecord.locator || "", "db", "", 1, 1, 1);

      if (puntosRecord.locator &&
        puntosRecord.locator.length > 3 &&
        puntosRecord.time !== lastpunto) {

        AppState.map.trayecto.push([
          puntosRecord.time,
          left(puntosRecord.locator, 6),
          puntosRecord.temperature,
          puntosRecord.altitude,
        ]);
        lastpunto = puntosRecord.time;
      }
    }
  }

  let altutext = "";
  let locatorx = "";
  let trackertext = "";
  let addss = "";
  let GPSx = "";
  let decoqrfm = "";
  let hora = "";
  let horalocal = "";

  const puntoArray = AppState.telemetry.punto; // Array of PuntoRecord objects
  //const puntopointer = AppState.results.puntopointer;

  if (puntopointer > -1 && puntoArray[0]?.time) {
    const firstTimeStr = left(puntoArray[0].time, 16);
    const puntoDate = new Date(firstTimeStr);

    if (!isNaN(puntoDate.getTime())) {
      // Local time
      const TZDiff = new Date().getTimezoneOffset();
      const hlocalMs = new Date(firstTimeStr).getTime() - TZDiff * 60 * 1000;
      const hlocal = new Date(hlocalMs);
      horalocal =
        "<br>Local: " +
        String(hlocal.getHours()).padStart(2, "0") +
        ":" +
        String(hlocal.getMinutes()).padStart(2, "0");

      // UTC time string
      const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      hora = `${monthNames[puntoDate.getMonth() + 1]}-${puntoDate.getDate()} ${puntoDate.getHours()}:${puntoDate.getMinutes()}`;

      // Apply final values to FIRST punto record
      if (Altfinal !== "") {
        puntoArray[0].altitude = Altfinal;
      }
      if (TempFinal !== "") {
        puntoArray[0].temperature = TempFinal;
      }
      if (VoltFinal !== "") {
        puntoArray[0].voltage = VoltFinal;
      }

      // Build locatorx
      locatorx = puntoArray[0].locator || "";
      if (locatorx.length === 6) {
        locatorx = left(locatorx, 4) + lcase(right(locatorx, 2));
      }

      // Find first non-LL locator
      for (let h = 0; h < puntoArray.length; h++) {
        const loc = puntoArray[h]?.locator || "";
        if (loc.length > 4 && ucase(right(loc, 2)) !== "LL") {
          locatorx = loc;
          break;
        }
      }

      // Altitude text
      altutext = "<br>Alt.: 0&nbsp;m.";
      for (let z = 0; z < puntoArray.length; z++) {
        const alt = puntoArray[z]?.altitude;
        if (
          alt !== undefined &&
          alt !== "" &&
          alt != 15000 &&
          alt != 14000 &&
          alt != 3000 &&
          alt != 4000 &&
          alt > 360 &&
          alt != 12000
        ) {
          const altNum = parseInt(alt);
          altutext =
            `<br>Alt.: ${altNum}&nbsp;m.&nbsp;&nbsp;<br>Alt.: ${Math.round(altNum * 3.28084)} feet`;
          break;
        }
      }

      // Temperature
      let temptext = "";
      for (let z = 0; z < puntoArray.length; z++) {
        const temp = puntoArray[z]?.temperature || "";
        if (temp.length > 1 && trim(temp) !== "?") {
          temptext = `<br>Temperat: ${temp}&deg;C`;
          break;
        }
      }

      // Voltage
      let batetext = "";
      for (let z = 0; z < puntoArray.length; z++) {
        const volt = puntoArray[z]?.voltage || "";
        if (volt.length > 2 && volt !== "?") {
          const cleanVolt = parseFloat(replace(volt, "V", "")) || 0;
          batetext = `<br>Bat/Sol: ${cleanVolt}Volts`;
          break;
        }
      }

      // GPS
      GPSx = GPSfinal ? `<br>GPS-Sats: ${GPSfinal}` : "";

      // Tracker
      if (trim(tracker) !== "") {
        trackertext = `<br>Tracker: ${trim(tracker)}`;
      }

      // APRS link
      const SSID = getParamSafe("SSID");
      const other = getParamSafe("other");
      if (SSID !== "") {
        addss = `APRS: <a href='http://aprs.fi?call=${ucase(other)}-${SSID}&timerange=604800&tail=604800&mt=hybrid' target=_blank>
        <u style='line-height:13px;color:green;'>${ucase(trim(other))}-${SSID}</u></a><br>`;
      } else {
        addss = "";
      }

      // Decoded telemetry formatting
      if (decoqrf !== "") {
        if (decoqrf.length > 16) {
          decoqrfm =
            replace(left(decoqrf, 17), "T#", "T1", 1, 1, 1) +
            "<br>T2 " +
            right(decoqrf, 13);
        } else {
          decoqrfm = decoqrf;
        }
        trackertext += "<br>" + decoqrfm;
      }

      // Build window.locations[0]
      const licenciao = AppState.results.licenciao || "Balloon";
      const power = AppState.results.powerW || "??";

      AppState.map.locations[0] = [
        locatorx,
        licenciao +
        "<br>" +
        addss +
        hora +
        "z" +
        horalocal +
        "<br>Power: " +
        power +
        "<br>Locator: " +
        locatorx +
        altutext +
        temptext +
        batetext +
        GPSx +
        replace(
          replace(
            replace(
              trackertext,
              "<span class='narrow' style='color:black;'>",
              "",
              1,
              300,
              1
            ),
            "</span>",
            "<span class='narrow' style='color:gray;'>",
            1,
            300,
            1
          ),
          "</span>",
          "",
          1,
          300,
          1
        ) +
        (puntoArray[0]?.data || "") +
        " <br><a href=# onclick='gowinds1()' style='color: #3333ff;line-height:13px;overflow:hidden;font-weight:bold;white-space:nowrap;cursor:pointer;'><u>Click for Winds</u></a>"
      ];

      // Update AppState
      AppState.results.powerW = power;
      AppState.results.altutext = altutext;
      AppState.results.licenciao = licenciao;
      AppState.results.addss = addss;
      AppState.results.hora = hora;
      AppState.results.horalocal = horalocal;
      AppState.results.temptext = temptext;
      AppState.results.batetext = batetext;
      AppState.results.GPSx = GPSx;
      AppState.results.trackertext = trackertext;
      AppState.results.spot = puntoArray[0]?.data || ""; // .data = field6
      AppState.results.locatorx = locatorx;
    }
  }

  // Show capture flag
  const showcapture = mid(puntoArray[0]?.time || "", 9, 8) !== mid(hora, 5, 8);
  window.showcapture = showcapture;

  // Frequency offset
  let addplus = "";
  const avgfreq = AppState.results.avgfreq || 0;
  const fcentral = AppState.config.fcentral || 0;
  const freqDiff = avgfreq - fcentral;

  if (freqDiff < 10 && freqDiff > -1) {
    addplus = `<span style='color:#ffffff;'>&#x25B3;+${freqDiff}Hz</span>`;
    window.addplusm = ` △+${freqDiff}Hz. `;
  } else if (freqDiff < 0 && freqDiff > -10) {
    addplus = `<span style='color:#ffffff;'>&#x25B3;${freqDiff}Hz</span>`;
    window.addplusm = ` △${freqDiff}Hz. `;
  } else if (freqDiff > 9) {
    addplus = `<span style='color:#ff6e5e;'>&#x25B3;+${freqDiff}Hz</span>`;
    window.addplusm = ` △+${freqDiff}Hz. `;
  } else if (freqDiff < -9) {
    addplus = `<span style='color:#ff6e5e;'>&#x25B3;${freqDiff}Hz</span>`;
    window.addplusm = ` △${freqDiff}Hz. `;
  }

  window.addplusElementValue = addplus;
  window.avgfreqElementValue = avgfreq;

  // Final updates
  AppState.results.locatorlast = locatorx;
  AppState.results.Altfinal = Altfinal;
  AppState.results.TempFinal = TempFinal;
  AppState.results.VoltFinal = VoltFinal;
  AppState.results.GPSfinal = GPSfinal;
  AppState.results.decoqrf = decoqrf;

  // Backward compatibility
  //window.beacon1 = AppState.map.beacon1;
  //window.trayecto = AppState.map.trayecto;

  // ===========================================
  // UPDATE APPSTATE
  // ===========================================

  AppState.results.puntopointer = puntopointer;
  AppState.results.puntospointer = puntospointer;
  AppState.telemetry.tele2RowData = rowDataArray;

  return {
    error: false,
    puntopointer: puntopointer,
    puntospointer: puntospointer,
    finals: {
      temperature: TempFinal,
      voltage: VoltFinal,
      altitude: Altfinal,
      locator: Locfinal,
      gps: GPSfinal,
      decoqrf: decoqrf
    }
  };
}


function renderTelemetry2TablePaginated(containerId = "telemetry2-table", defaultRowsPerPage = 100) {
  const container = document.getElementById(containerId);
  if (!container || !Array.isArray(AppState.telemetry.tele2RowData)) {
    console.warn("Invalid container or rowData");
    return;
  }

  // Parse URL params once
  const params = getParamSafe("rows", String(defaultRowsPerPage));
  const rowsParam = parseInt(params, 10) || defaultRowsPerPage;
  const pageParam = parseInt(getParamSafe("page"), 10) || 1;
  const rowsPerPage = isNaN(rowsParam) ? defaultRowsPerPage : Math.min(Math.max(25, rowsParam), 500);
  const totalPages = Math.max(1, Math.ceil(AppState.telemetry.tele2RowData.length / rowsPerPage));
  let currentPage = isNaN(pageParam) ? 1 : Math.max(1, Math.min(pageParam, totalPages));

  // Build initial 
  container.innerHTML = `
    <div id="telemetry2Controls">
      <label>
        Show 
        <select id="rowsPerPageSelector2">
          ${[25, 50, 100, 200, 500, 1000, 1500, 2000, 3000, 4000, 5000].map(n =>
    `<option value="${n}" ${n === rowsPerPage ? 'selected' : ''}>${n}</option>`
  ).join('')}
        </select>
        rows per page
      </label>
      <span id="paginationInfo2"></span>
    </div>

      <table class="telemetry-table" style="font-family:monospace;font-size:12px;border-collapse:collapse;width:100%;min-width:900px;overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <thead style="position:sticky;top:0; z-index:11;">
          <tr style="background:#f0f0f0;">
            <th>Timestamp (z)</th>
            <th>Call Loc Pwr</th>
            <th>Locator</th>
            <th>Temp</th>
            <th>Bat/Sun</th>
            <th>Km/h</th>
            <th>GPS#</th>
            <th>Reporter</th>
            <th>RGrid</th>
            <th>Km.</th>
            <th>Az°</th>
            <th>Heig.m</th>
            <th>Sun°</th>
            ${AppState.config?.qp === "on" ? '<th>Telen 1/2</th>' : ''}
          </tr>
        </thead>
        <tbody id="telemetry2TableBody"></tbody>
      </table>
    
    <div id="paginationControls2">
      <span class="paginationNPBtns">
        <button id="prevPageBtn2" aria-label="Previous page">&laquo; Previous</button>
        <span id="pageInfo2" role="status" aria-live="polite"></span>
        <button id="nextPageBtn2" aria-label="Next page">Next &raquo;</button>
      </span>
      <span class="paginationGoBtns">
        <label for="jumpPageInput2" style="font-size:13px;">Go to page:</label>
        <input 
          type="number" 
          id="jumpPageInput2" 
          min="1" 
          max="${totalPages}" 
          value="${currentPage}"
          aria-label="Jump to page number"
        />
        <button id="jumpPageBtn2" aria-label="Go to specified page">Go</button>
      </span>
    </div>
    
  `;

  initialTelemetry2TableRender(currentPage);
  addScrollIndicator(container.querySelector('div[style*="overflow-x"]'));

}

// Render page function
function renderTelemetry2ByPage(currentPage) {
  const rowsPerPage = parseInt(document.getElementById("rowsPerPageSelector2").value, 10) || 100;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, AppState.telemetry.tele2RowData.length);
  const totalPages = Math.max(1, Math.ceil(AppState.telemetry.tele2RowData.length / rowsPerPage));

  let tbodyHtml = "";
  for (let i = startIndex; i < endIndex; i++) {
    const decoded = AppState.telemetry.tele2RowData[i];
    // Use your existing buildTelemetryRow with showDecoded 
    const rowHtml = buildTelemetryRow(decoded, {
      showDecoded: AppState.config?.qp === "on"
    });
    tbodyHtml += rowHtml;
  }

  if (AppState.telemetry.tele2RowData.length === 0) {
    const cols = AppState.config?.qp === "on" ? 14 : 13;
    tbodyHtml = `<tr><td colspan="${cols}" style="text-align:center;color:#b33c00;padding:20px;">⚠️ No decoded telemetry spots</td></tr>`;
  }

  document.getElementById("telemetry2TableBody").innerHTML = tbodyHtml;
  document.getElementById("pageInfo2").textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById("paginationInfo2").textContent = `Showing ${startIndex + 1}–${endIndex} of ${AppState.telemetry.tele2RowData.length} decoded spots`;
  // Update button states
  document.getElementById("prevPageBtn2").disabled = (currentPage <= 1);
  document.getElementById("nextPageBtn2").disabled = (currentPage >= totalPages);
  document.getElementById("jumpPageInput2").max = totalPages;
  document.getElementById("jumpPageInput2").value = currentPage;

 const container = document.querySelector(".table-content");
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

}


function initialTelemetry2TableRender(currentPage = 1) {
  renderTelemetry2ByPage(currentPage);
  // Event listeners
  document.getElementById("rowsPerPageSelector2").addEventListener("change", (e) => {
    let currentPage = parseInt(document.getElementById("jumpPageInput2").value);
    const newRows = parseInt(e.target.value, 10);
    const newTotalPages = Math.max(1, Math.ceil(AppState.telemetry.tele2RowData.length / newRows));
    currentPage = Math.min(currentPage, newTotalPages);
    renderTelemetry2ByPage(currentPage);
  });

  document.getElementById("prevPageBtn2").addEventListener("click", () => {
    const currentPage = parseInt(document.getElementById("jumpPageInput2").value);
    if (currentPage > 1) renderTelemetry2ByPage(currentPage - 1);
  });

  document.getElementById("nextPageBtn2").addEventListener("click", () => {
    const currentPage = parseInt(document.getElementById("jumpPageInput2").value);
    const totalPages = parseInt(document.getElementById("jumpPageInput2").max);
    if (currentPage < totalPages) renderTelemetry2ByPage(currentPage + 1);
  });

  document.getElementById("jumpPageBtn2").addEventListener("click", () => {
    const input = document.getElementById("jumpPageInput2");
    let page = parseInt(input.value, 10);
    if (isNaN(page)) page = 1;
    page = Math.max(1, Math.min(page, totalPages));
    input.value = page;
    renderTelemetry2ByPage(page);
  });
}


// Export
if (typeof window !== 'undefined') {
  window.processTelemetry2 = processTelemetry2;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { processTelemetry2, renderTelemetry2TablePaginated };
}