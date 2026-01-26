/**
* processTelemetry1.js
* Process Telemetry 1 data (main beacon reports)
*
* Input: AppState.telemetry.tele1 (already parsed TelemetryRecord1 objects)
* Output: Processed data in AppState (punt, locations, statistics)
*/
function processTelemetry1(tele1Records) {

  // ===========================================
  // INITIALIZE
  // ===========================================
  AppState.telemetry.punt = [];
  AppState.telemetry.tablahoras = [];
  AppState.map.locations = [];
  AppState.statistics.distakm = new Array(85).fill(0);

  // Get configuration
  const config = AppState.config;
  const tracker = lcase(config.tracker);
  const timeslot = config.timeslot;
  const other = config.other;
  const launchdate = config.launchdate;

  // Timeslot character
  let tlmchar = "";
  if (trim(timeslot) !== "") {
    tlmchar = right((8 + parseInt(timeslot)).toString(), 1);
  }
  let tlmchar1 = tlmchar;
  if ((tracker === "zachtek1" || tracker === "6locators") && trim(timeslot) !== "") {
    tlmchar1 = right((10 + parseInt(timeslot)).toString(), 1);
  }

  // ===========================================
  // FILTER BY TIMESLOT
  // ===========================================
  let filteredRecords = [];
  if (tracker !== "zachtek1") {
    if (tlmchar !== "") {
      filteredRecords = tele1Records.filter(record => {
        if (!record.time || record.time.length < 16) return false;
        return mid(record.time, 16, 1) === tlmchar;
      });
    } else {
      filteredRecords = tele1Records;
    }
  } else {
    filteredRecords = tele1Records;
  }

  if (filteredRecords.length === 0) {
    return {
      error: false,
      records: 0,
      spots: 0,
      haylista: false
    };
  }

  // ===========================================
  // CALCULATE DISTANCE HISTOGRAM
  // ===========================================
  const row = [];
  for (let i = 0; i <= 84; i++) {
    row.push(i * 250);
  }
  AppState.statistics.dista = [row, new Array(85).fill(0)];

  // ===========================================
  // CALCULATE DATE RANGE
  // ===========================================
  let daysBack = -15;
  if (lcase(other) === "zl1rs") {
    daysBack = -13;
  }
  let desdefecham_date = dateAdd("d", daysBack, new Date());
  let desdefecham = [
    desdefecham_date.getMonth() + 1,
    desdefecham_date.getDate(),
    desdefecham_date.getFullYear(),
  ];
  let desdeFecha =
    desdefecham[2] +
    "-" +
    right("00" + desdefecham[0], 2) +
    "-" +
    right("00" + desdefecham[1], 2);
  if (launchdate !== "") {
    desdeFecha = launchdate;
  }
  AppState.results.desdeFecha = desdeFecha;

  // ===========================================
  // GET FREQUENCY RANGE
  // ===========================================
  const freqRange = AppState.getFrequencyRange();
  const bajo = freqRange.bajo;
  const alto = freqRange.alto;

  // ===========================================
  // PROCESSING VARIABLES
  // ===========================================
  let puntpointer = 0;
  let summhz = 0;
  let countmhz = 0;
  let haylista = false;
  let spots = 0;
  let last = 0;
  let hora0 = "";
  let locator = "";
  let locatorlast = "";
  let power = "";
  let licenciao = "";
  let licentab = [];
  let savealtur = 0;
  let lastaltura = "";
  let alturasave = 0;
  let savealtu = 0; // For VE3PRO/OSHPARK

  // Calculate alturasave from first record
  if (filteredRecords.length > 0) {
    const firstRecord = filteredRecords[0];
    if (firstRecord.power && firstRecord.power !== "0.01" && firstRecord.power !== "0") {
      const pwr = Number(firstRecord.power);
      if (!isNaN(pwr) && pwr !== 0) {
        const dbm = Math.round((10 * Math.log(pwr * 1000)) / Math.log(10) + 0.5);
        // SPECIAL CASES for alturasave
        if (ucase(other) === "VE3PRO" || ucase(tracker) === "OSHPARK") {
          alturasave = oriFun(dbm);
        } else if (lcase(other) === "zl1rs") {
          alturasave = 12000;
        } else if (lcase(other) === "km5xk") {
          alturasave = Math.floor(dbm * 180);
        } else {
          alturasave = xsnrFun(dbm);
        }
      }
    }
  }

  // ===========================================
  // PROCESS EACH RECORD
  // ===========================================
  for (let i = 0; i < filteredRecords.length; i++) {
    const record = filteredRecords[i];

    // Update distance histogram
    if (!isNaN(record.distance) && record.distance > 0) {
      let distIndex = Math.floor(record.distance / 250);
      if (distIndex >= 0 && distIndex < 85) {
        AppState.statistics.distakm[distIndex]++;
        AppState.statistics.dista[1][distIndex]++;
      }
    }

    // Set flag on first iteration
    if (i === 0) {
      haylista = true;
      hora0 = record.time;
    }

    // Check if record is within date range
    const fechahora = record.time;
    const nextRecord = filteredRecords[i + 1];
    if (new Date(fechahora) > new Date(desdeFecha) &&
      new Date(fechahora) >= new Date(launchdate)) {

      // Initialize punt record if needed
      if (!AppState.telemetry.punt[puntpointer]) {
        AppState.telemetry.punt[puntpointer] = new PuntRecord();
        AppState.telemetry.punt[puntpointer].reporters = "";
        AppState.telemetry.punt[puntpointer].frequency = 0;
      }

      // Update frequency tracking
      if (nextRecord &&
        AppState.telemetry.punt[puntpointer].frequency === 0 &&
        nextRecord.frequency > 10000) {
        AppState.telemetry.punt[puntpointer].frequency = nextRecord.frequency;
        summhz += record.frequency;
        countmhz++;
      }

      // Store SNR in tablahoras
      if (!AppState.telemetry.tablahoras[i]) {
        AppState.telemetry.tablahoras[i] = new TablaHoraRecord();
      }
      AppState.telemetry.tablahoras[i].field3 = trim(record.snr.toString());

      // Process locator
      const locatora = record.grid;
      locator = record.reporterGrid;

      // ===========================================
      // CALCULATE ALTITUDE FROM POWER — TRACKER-SPECIFIC
      // ===========================================
      let altura = 0;
      const pwr = parseFloat(record.power);
      if (!isNaN(pwr) && pwr > 0 && pwr !== 0.01) {
        const dbm = Math.round((10 * Math.log(pwr * 1000)) / Math.log(10) + 0.5);

        // SPECIAL CASES
        if (lcase(other) === "zl1rs") {
          altura = 12000;
        } else if (lcase(other) === "km5xk") {
          altura = Math.floor(dbm * 180);
        } else if (lcase(other) === "ve3pro" || ucase(tracker) === "OSHPARK") {
          if (right(record.time, 2) === "02" || right(record.time, 2) === "22" || right(record.time, 2) === "42") {
            altura = oriFun(dbm);
            savealtu = altura;
          } else {
            altura = savealtu;
          }
        }
        // STANDARD TRACKERS: use xsnr lookup
        else if (
          lcase(tracker) === "zachtek1" ||
          lcase(tracker) === "6locators" ||
          lcase(tracker) === "wb8elk" ||
          lcase(tracker) === "ab5ss"
        ) {
          altura = xsnrFun(dbm);
        } else if (lcase(tracker) === "qrplabs" || lcase(tracker) === "traquito") {
          altura = xsnrFun(parseInt(record.power));
        }
        // DEFAULT: linear (used by QRP in tele1 context)
        else {
          altura = Math.abs(dbm * 300);
        }
      }

      // Zachtek1 altitude override (from two packets)
      if (lcase(tracker) === "zachtek1" || lcase(tracker) === "6locators") {
        if (nextRecord) {
          const minelapsed = dateDiffMinutes(record.time, nextRecord.time);
          if (minelapsed === 2) {
            const alt1 = xsnrFun(parseFloat(record.power));
            const alt2 = xsnrFun(parseFloat(nextRecord.power));
            altura = alt2 + alt1; // tele1(i+1,tpwr)*300 + tele1(i,tpwr)*20 → approximated
            savealtur = altura;
            if (savealtur > lastaltura && savealtur < 15000 && i < 30) {
              lastaltura = savealtur;
            }
          }
        }
        if (altura < 10) {
          // Try previous records
          if (i > 0 && AppState.telemetry.punt[puntpointer - 1]) {
            altura = AppState.telemetry.punt[puntpointer - 1].altitude || 0;
          }
        }
      }

      // Store altitude
      record.altitude = altura;

      // Process license
      const licencia = record.reporter;

      // Build SNR string
      let snr = "SNR:" + record.snr;

      // Process first record specially
      if (i === 0) {
        licenciao = record.callsign;
        power = "20 mW"; // ← HARD CODED like old system
        AppState.results.powerW = power; // ← critical for telemetry2
        hora0 = record.time + "z";
        const locatoro = locatora.length === 4 ? locatora + "LL" : locatora;
        const displayText = `${licenciao} ${left(hora0, 16)}z ${power} ${locatoro} ${altura} m.`;
        AppState.map.locations.push([locatora.substring(0, 6), displayText]);
        //     continue;
      }

      // Process records after first (i > 0)
      spots++;

      // Check for duplicates in locations
      let duplicated = false;
      for (let f = 0; f < AppState.map.locations.length; f++) {
        if (AppState.map.locations[f][1] &&
          AppState.map.locations[f][1].includes(licencia)) {
          duplicated = true;
          break;
        }
      }

      // Add to locations if not duplicate
      if (!duplicated && new Date(record.time) > new Date(desdeFecha)) {
        const locatoro = locator.length === 4 ? locator + "LL" : locator;
        const monthNum = parseInt(record.time.substring(5, 7));
        const hora = mes[monthNum] + "-" + record.time.substring(record.time.length - 11);
        AppState.map.locations.push([
          trim(locatoro),
          `${licencia}<br>${left(hora, 12)}z<br>${record.distance} Km<br>${locator}<br>${snr}`
        ]);
      }

      // Add to flechas if new license
      let found = false;
      for (let h = 0; h < licentab.length; h++) {
        if (licentab[h] === licencia) {
          found = true;
          break;
        }
      }
      if (!found && new Date(fechahora) >= new Date(launchdate)) {
        licentab[last] = licencia;
        const locatorm = locator.length < 5 ? locator + "LL" : locator;
        if (locatorm !== locatorlast) {
          AppState.map.flechas.push(locatorm);
          last++;
        }
        locatorlast = locatorm;
      }

      // ========================================
      // BUILD PUNT ARRAY (key aggregation logic)
      // ========================================
      const horaoriginal = record.time;
      const currentPunt = AppState.telemetry.punt[puntpointer];
      const locatoraWithLL = locatora.length < 6 ? locatora + "LL" : locatora;

      // Check if we should add to existing punt or create new one
      if (currentPunt.locator === locatoraWithLL && currentPunt.altitude === altura) {
        if (config.detail !== "onx") {
          puntpointer++;
          if (!AppState.telemetry.punt[puntpointer]) {
            AppState.telemetry.punt[puntpointer] = new PuntRecord();
            AppState.telemetry.punt[puntpointer].reporters = "";
            AppState.telemetry.punt[puntpointer].frequency = 0;
          }
        }
        let insertar = true;
        if (currentPunt.reporters) {
          for (let w = 0; w < currentPunt.reporters.length - 8; w++) {
            if (currentPunt.reporters.substring(w, w + licencia.length) === licencia) {
              insertar = false;
              break;
            }
          }
        }
        if (insertar && AppState.telemetry.punt[puntpointer].reporters.length < 190) {
          AppState.telemetry.punt[puntpointer].reporters += `<br>${licencia} ${replace(snr, "SNR:", "", 1, 40, 1)}`;
        }
      } else {
        if (lcase(trim(tracker)) !== "zachtek1") {
          puntpointer++;
        } else {
          if (currentPunt.time !== horaoriginal + "z") {
            puntpointer++;
          }
        }
        if (!AppState.telemetry.punt[puntpointer]) {
          AppState.telemetry.punt[puntpointer] = new PuntRecord();
          AppState.telemetry.punt[puntpointer].reporters = "";
          AppState.telemetry.punt[puntpointer].frequency = 0;
        }
        const newPunt = AppState.telemetry.punt[puntpointer];
        newPunt.time = horaoriginal + "z";
        newPunt.locator = locatoraWithLL;
        newPunt.altitude = (tracker === "zachtek1" || tracker === "6locators") ? savealtur : altura;
        newPunt.temperature = "? ";
        newPunt.voltage = "? ";
        if (newPunt.reporters.length < 190) {
          newPunt.reporters += `<br>${licencia} ${replace(snr, "SNR:", "", 1, 40, 1)}`;
        }
      }

      last = i;
      locatorlast = locator;
      power = record.power;
      licenciao = record.reporter;
    }
  }

  // ===========================================
  // UPDATE APPSTATE RESULTS
  // ===========================================
  const firstFiltered = filteredRecords[0];
  AppState.results.last = last;
  AppState.results.avgfreq = countmhz > 0 ? Math.floor(summhz / countmhz) : 0;
  AppState.results.puntpointer = puntpointer;
  AppState.results.hora0 = hora0;
  AppState.results.locator = firstFiltered ? firstFiltered.grid : "";
  AppState.results.locatorlast = locatorlast;
  //AppState.results.licenciao = firstFiltered ? firstFiltered.callsign : "";
  //AppState.results.power = firstFiltered ? firstFiltered.power : "";
  // AppState.results.powerW = firstFiltered.power + " W";
  AppState.results.spots = spots;
  AppState.results.haylista = haylista;
  AppState.statistics.distakm = (AppState.statistics.dista ? AppState.statistics.dista[1] : new Array(85).fill(0));

  // Backward compatibility
  //window.locations = AppState.map.locations;
  //window.dista = AppState.statistics.dista;

  // ===========================================
  // RETURN RESULTS
  // ===========================================

  AppState.telemetry.tele1Filtered = filteredRecords;
  return {
    error: false,
    records: filteredRecords.length,
    spots: spots,
    haylista: haylista,
    avgfreq: AppState.results.avgfreq,
    locations: AppState.map.locations.length,
    distakm: AppState.statistics.distakm
  };
}

/**
 * Efficiently renders paginated telemetry table without full reloads.
 * Only replaces tbody content when navigating pages.
 */
function renderTelemetryTablePaginated(containerId = "telemetry1-table", defaultRowsPerPage = 100) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Parse initial state from URL (once)
  const params = getParamSafe("rows", String(defaultRowsPerPage));
  const initialRows = parseInt(params, 10) || defaultRowsPerPage;
  const initialPage = 1;
  //parseInt(urlParams.get("page"), 10) || 1;

  const records = AppState.telemetry.tele1Filtered || [];
  const totalRecords = records.length;
  //const maxRowsPerPage = 500;
  const rowsPerPage = initialRows;
  //Math.min(Math.max(25, initialRows), maxRowsPerPage);
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  let currentPage = Math.max(1, Math.min(initialPage, totalPages));

  // Ensure container has structure
  container.innerHTML = `

     <div id="telemetryControls">
      <label>
        Show 
        <select id="rowsPerPageSelector">
          ${[25, 50, 100, 200, 500, 1000, 1500, 2000, 3000].map(n =>
    `<option value="${n}" ${n === rowsPerPage ? 'selected' : ''}>${n}</option>`
  ).join('')}
        </select>
        rows per page
      </label>
      <span id="paginationInfo"></span>
    </div>


      <table class="telemetry-table" style="font-family:monospace;font-size:12px;border-collapse:collapse;width:100%;min-width:900px;overflow-x: auto; -webkit-overflow-scrolling: touch;">
      <thead style="position:sticky;top:0; z-index:11;">
        <tr style="background:#f0f0f0;">
          <th>Timestamp (z)</th>
          <th>Call</th>
          <th>MHz</th>
          <th>SNR</th>
          <th>Drift</th>
          <th>Grid</th>
          <th>Pwr</th>
          <th>Reporter</th>
          <th>RGrid</th>
          <th>Km.</th>
          <th>Az°</th>
          <th>Heig.m</th>
          <th>Sun°</th>
        </tr>
      </thead>
      <tbody id="telemetryTableBody"></tbody>
    </table>

    <div id="paginationControls">
      <span class="paginationNPBtns">
        <button id="prevPageBtn" aria-label="Previous page">&laquo; Previous</button>
        <span id="pageInfo" role="status" aria-live="polite"></span>
        <button id="nextPageBtn" aria-label="Next page">Next &raquo;</button>
      </span>
    
      <span class="paginationGoBtns">
        <label for="jumpPageInput" style="font-size:13px;">Go to page:</label>
        <input 
          type="number" 
          id="jumpPageInput" 
          min="1" 
          max="${totalPages}" 
          value="${currentPage}"
          aria-label="Jump to page number"
        />
        <button id="jumpPageBtn" aria-label="Go to specified page">Go</button>
      </span>
    </div>
  `;

  initialTelemetry1TableRender(currentPage);
  addScrollIndicator(container.querySelector('div[style*="overflow-x"]'));
}

// Helper: format full timestamp
const formatFullTime = (isoStr) => {
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
};

// Render a specific page
function renderTelemetry1ByPage(currentPage) {
  const totalRecords = AppState.telemetry?.tele1Filtered?.length || 0;
  const rowsPerPage = parseInt(document.getElementById("rowsPerPageSelector").value, 10) || 100;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRecords);
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));

  let tbodyHtml = "";
  const config = AppState.config || {};
  const tracker = (config.tracker || "").toLowerCase();
  const freqRange = AppState.getFrequencyRange();
  //const bajo = freqRange.bajo;
  //const alto = freqRange.alto;

  for (let i = startIndex; i < endIndex; i++) {
    const record = AppState.telemetry?.tele1Filtered?.[i] || {};
    const time = record.time || "";
    const callsign = record.callsign || "?";
    const freq = parseFloat(record.frequency) || 0;
    const snr = record.snr || "?";
    const drift = record.drift || "0";
    const txGrid = (record.grid || "").padEnd(6, 'L').substring(0, 4);//(record.grid || "").padEnd(6, 'L').substring(0, 6);
    const powerW = record.power === "0.01" ? "0.01" : (parseFloat(record.power) || "?");
    const reporter = record.reporter || "?";
    const rGrid = (record.reporterGrid || "").padEnd(6, 'L').substring(0, 6);//(record.reporterGrid || "").padEnd(6, 'L').substring(0, 6);
    const distance = Math.round(record.distance || 0);
    const azimuth = record.azimuth !== undefined ? Math.round(record.azimuth) : "?";
    const altitude = record.altitude || "?";

    // const freqDisplay = (freq < bajo || freq > alto)
    //   ? `<span style="color:red;">${Math.round(freq)}!</span>`
    //   : Math.round(freq);
    let freqDisplay = Math.round(freq);
    if (record.frequency < freqRange.bajo || record.frequency > freqRange.alto) {
      freqDisplay = `<span style="color:red;">${Math.round(freq)}!</span>`;
    }

    let sunElevation = "&nbsp;";
    try {
      if (tracker === "qrplabs" || tracker === "traquito") {
        if (record.grid && record.grid.length === 4) {
          sunElevation = putsun(time, record.grid + "LL");
        } else {
          sunElevation = putsun(time, txGrid.substring(0, 4));
        }
      } else {
        if (record.grid && record.grid.length >= 6) {
          sunElevation = putsun(time, record.grid.substring(0, 4));
        } else if (record.grid && record.grid.length === 4) {
          sunElevation = putsun(time, record.grid);
        }
      }
    } catch (e) {
      sunElevation = "?";
    }

    const fullTime = formatFullTime(time);

    tbodyHtml += `<tr style="line-height:1.3;">`;
    tbodyHtml += `<td>${fullTime}</td>`;
    tbodyHtml += `<td>${callsign}</td>`;
    tbodyHtml += `<td>${freqDisplay}</td>`;
    tbodyHtml += `<td>${snr}</td>`;
    tbodyHtml += `<td>${drift}</td>`;
    tbodyHtml += `<td>${txGrid}</td>`;
    tbodyHtml += `<td>${powerW}</td>`;
    tbodyHtml += `<td>${reporter}</td>`;
    tbodyHtml += `<td>${rGrid}</td>`;
    tbodyHtml += `<td>${distance}</td>`;
    tbodyHtml += `<td>${azimuth}</td>`;
    tbodyHtml += `<td>${altitude}</td>`;
    tbodyHtml += `<td>${sunElevation}</td>`;
    tbodyHtml += `</tr>`;
  }

  if (totalRecords === 0) {
    tbodyHtml = `<tr><td colspan="13" style="text-align:center;color:#b33c00;padding:20px;">⚠️ No telemetry spots found</td></tr>`;
  }

  document.getElementById("telemetryTableBody").innerHTML = tbodyHtml;
  document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById("paginationInfo").textContent = `Showing ${startIndex + 1}–${endIndex} of ${totalRecords} spots`;

  // Update button states
  document.getElementById("prevPageBtn").disabled = (currentPage <= 1);
  document.getElementById("nextPageBtn").disabled = (currentPage >= totalPages);
  document.getElementById("jumpPageInput").max = totalPages;
  document.getElementById("jumpPageInput").value = currentPage;

  const container = document.querySelector(".table-content");
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}


function initialTelemetry1TableRender(currentPage = 1) {
  renderTelemetry1ByPage(currentPage);

  // Event listeners (attached once)
  document.getElementById("rowsPerPageSelector").addEventListener("change", (e) => {
    let currentPage = parseInt(document.getElementById("jumpPageInput").value);
    const totalRecords = AppState.telemetry?.tele1Filtered?.length || 0;
    const newRows = parseInt(e.target.value, 10);
    const newTotalPages = Math.max(1, Math.ceil(totalRecords / newRows));
    currentPage = Math.min(currentPage, newTotalPages); // clamp if needed
    renderTelemetry1ByPage(currentPage);
  });

  document.getElementById("prevPageBtn").addEventListener("click", () => {
    const currentPage = parseInt(document.getElementById("jumpPageInput").value);
    if (currentPage > 1) renderTelemetry1ByPage(currentPage - 1);
  });

  document.getElementById("nextPageBtn").addEventListener("click", () => {
    const currentPage = parseInt(document.getElementById("jumpPageInput").value);
    const totalPages = parseInt(document.getElementById("jumpPageInput").max);
    if (currentPage < totalPages) renderTelemetry1ByPage(currentPage + 1);
  });

  document.getElementById("jumpPageBtn").addEventListener("click", () => {
    const input = document.getElementById("jumpPageInput");
    const totalPages = parseInt(document.getElementById("jumpPageInput").max);
    let page = parseInt(input.value, 10);
    if (isNaN(page)) page = 1;
    page = Math.max(1, Math.min(page, totalPages));
    input.value = page;
    renderTelemetry1ByPage(page);
  });
}

// Export
if (typeof window !== 'undefined') {
  window.processTelemetry1 = processTelemetry1;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { processTelemetry1, renderTelemetryTablePaginated };
}

