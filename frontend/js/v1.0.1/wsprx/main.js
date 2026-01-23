// ============================================================================
// MAIN.JS - Application Orchestrator
// Coordinates data fetching, processing, and rendering
// ============================================================================

let chartsManager;
var popupwin;
var newssid;
var qrp;
var fd;
var qrpchange = false;
var ssidchange = false;
var launchdatetime = "";
var newdatetime = ""

/**
 * Initialize the application
 */
async function initializeApp() {

  try {
    initializeMobileLayout();

    await loadBalloons();

    // Search input handler
    document.getElementById('balloon-search').addEventListener('focus', function () {
      document.getElementById('balloon-dropdown').classList.add('active');
      renderBalloonList(AppState.balloonsData);
    });

    document.getElementById('balloon-search').addEventListener('input', function (e) {
      const search = e.target.value.toLowerCase();
      const filtered = AppState.balloonsData.filter(b =>
        b.callsign.toLowerCase().includes(search)
      );
      renderBalloonList(filtered);
    });

    document.getElementById('balloon-search').addEventListener('blur', function () {
      setTimeout(() => {
        document.getElementById('balloon-dropdown').classList.remove('active');
      }, 200);
    });

    document.getElementById("main-loader").style.display = "none";
    document.getElementById("main-container").style.display = "flex";

    const url = new URL(window.parent.window.location.href);
    if (![...url.searchParams].length) {
      document
        .getElementById("tables-container").style.display = "none";
      document
        .getElementById("map-container").style.display = "none";

      return;
    }

    AppState.init();

    populateForm();
    populateLinkRef();

    document.getElementById("callTitleHeader").innerText = AppState.config.other.toUpperCase();


    const {
      error,
      pag1,
      pag2,
      cuenta,
      query1,
      query2
    } = await processWSPRQuery();


    AppState.telemetry.tele1 = TelemetryRecord1.fromRawData(pag1);
    AppState.telemetry.tele2 = TelemetryRecord2.fromRawData(pag2);


    const result = processTelemetry1(AppState.telemetry.tele1);
    if (!result.error && result.haylista) {
      renderTelemetryTablePaginated();
    }

    if (AppState.config.balloonid && AppState.config.balloonid !== "") {
      const result2 = processTelemetry2();
      if (!result2.error) {
        renderTelemetry2TablePaginated();
      }

    } else {
      console.log('⚠ No balloon ID specified, skipping Telemetry 2');
      //renderTelemetry2Table('<p>No balloon ID specified</p>');
    }

    if (window.L) {
      try {

        formatMapDataForJS();
        initializeMap();
        initializeUI();
      } catch (error) {
        console.error('❌ Error initializing map:', error);
        console.log('⚠ Map will not be displayed');
      }
    }

    // Build and render reporters table
    const reportersHTML = buildEnhancedReportersTable();
    renderReportersTable(reportersHTML);

    prepareChartData();
    prepareDistanceData();

    aprsend(AppState.map.beacon1, AppState.map.locations, AppState.map.trayecto);

    updateFrequencyDisplay();

  } catch (error) {
    console.error('❌ Error initializing app:', error);
    alert('Error loading tracker data. Check console for details.');
  } finally {
    autoRefresh();
    initializeMobileLayout();

  }
}

/**
 * Populate form fields from AppState
 */
function populateForm() {
  document.getElementById('other').value = AppState.config.other;
  document.getElementById('SSID').value = AppState.config.SSID;
  document.getElementById('banda').value = AppState.config.banda;
  document.getElementById('balloonid').value = AppState.config.balloonid;
  document.getElementById('timeslot').value = AppState.config.timeslot;
  document.getElementById('settracker').innerText = AppState.config.tracker;
  document.getElementById('tracker').value = AppState.config.tracker;
  document.getElementById('callsign').value = AppState.config.callsign;
  document.getElementById('launch').innerText = AppState.config.launchdate;
  document.getElementById('detail').checked = AppState.config.detail === 'on';
  document.getElementById('qp').checked = AppState.config.qp === 'on';

  // Update QRP channel display
  if (AppState.config.qrpid) {
    document.getElementById('qrpchn').textContent = AppState.config.qrpid;
  }

}

function populateLinkRef() {
  const didBand = bandDict[AppState.config.banda.toLowerCase()] || "";
  const dxhref = `${window.HOST_URL}/dx?call=${AppState.config.other}&band=${didBand}&bs=B`;
  document.getElementById('dxLink').href = dxhref;
  document.getElementById('dxLink').classList.remove('hidden');

  if (AppState.config.SSID) {
    const href = `${HOST_URL}/balloonchart?callsign=${AppState.config.other}-${AppState.config.SSID}&flights=0&grafico=height%20m`;
    document.getElementById('chartLink').href = href;
    document.getElementById('chartLink').classList.remove('hidden');
  }

  const queryParams = new URLSearchParams(window.parent.window.location.search);
  let qstring = "?";
  for (const [key, value] of queryParams.entries()) {
    if (key === "slower") continue;
    qstring += `${key}=${encodeURIComponent(value)}&`;
  }
  const slowerhref = `${window.HOST_URL}/wsprx${qstring}slower=true`;
  document.getElementById('slowerLink').href = slowerhref;
}

/**
 * Render Telemetry 1 table to DOM
 */
function renderTelemetry1Table(tableHTML) {
  const container = document.getElementById('telemetry1-table');
  if (!container) {
    console.warn('Telemetry1 container not found');
    return;
  }

  container.innerHTML = tableHTML;
}

/**
 * Render Telemetry 2 table to DOM
 */
function renderTelemetry2Table(tableHTML) {
  const container = document.getElementById('telemetry2-table');
  if (!container) {
    console.warn('Telemetry2 container not found');
    return;
  }

  container.innerHTML = tableHTML;
}

/**
 * Update frequency display
 */
function updateFrequencyDisplay() {
  const freqDisplay = document.getElementById('freq-display');
  if (!freqDisplay) return;

  freqDisplay.innerHTML = `
    <span style="font-size:14px;">Spotters<br style="line-height:8px;" />
    Avg.Freq.<br style="line-height:2px;" /><br style="line-height:2px;" />
    ${AppState.results.avgfreq}<br style="line-height:2px;" />
    <b>${AppState.results.addplus}</b></span>
  `;
}

async function loadBalloons() {

  try {
    const dataContent = await fetchJsonData();
    //  const jsonArray = JSON.parse(dataContent.jsonArray);

    if (dataContent && dataContent.balloons) {
      const enriched = dataContent.balloons.filter((b) => b.old !== "true").map(processBalloonData);
      AppState.balloonsData = enriched.map(balloon => {
        const callsign = balloon.other;
        const url = balloon.url;
        const launchd1 = balloon.launchdate1;

        return {
          callsign,
          band: balloon.banda,
          channel: balloon?.qrpid || "",
          link: url,
          launchdate: launchd1
        };
      });

    } else {
      console.warn('⚠ Could not fetch picoss.txt');
    }


  } catch (error) {
    console.error('Error loading balloons:', error);
  }
}



function renderBalloonList(balloons) {
  const dropdown = document.getElementById('balloon-dropdown');
  dropdown.innerHTML = balloons.map(b => `
    <div class="balloon-item" onclick="loadBalloon('${b.link}')" title="${b.launchdate}">
      <div class="callsign">${b.callsign}</div>
      <div class="details">Band: ${b.band} | Channel: ${b.channel}</div>
    </div>
  `).join('');
}

function loadBalloon(link) {
  window.parent.window.location.href = link;
}


// Modified switchTab function
function switchTab(event, tabName) {
  document.querySelectorAll('.table-tab').forEach(tab =>
    tab.classList.remove('active'));
  document.querySelectorAll('.table-panel').forEach(panel =>
    panel.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById('panel-' + tabName).classList.add('active');

  // Initialize charts when charts tab is opened
  if (tabName === 'charts') {
    setTimeout(initializeCharts, 100);
  }
}


function toggleTableMode(mode) {
  const container = document.getElementById('tables-container');
  const backdrop = document.getElementById('overlay-backdrop');

  if (mode === 'overlay') {
    container.classList.add('overlay');
    backdrop.classList.add('active');
    hideRestoreTableModeButtons('none');

  } else if (mode === 'fullscreen') {
    container.classList.add('fullscreen');
    backdrop.classList.add('active');
    hideRestoreTableModeButtons('none');
  } else {
    hideRestoreTableModeButtons('unset');
  }
}

function hideRestoreTableModeButtons(display) {
  document.querySelector('#tables-container > div.table-controls > div > button:nth-child(1)').style.display = display;
  document.querySelector('#tables-container > div.table-controls > div > button:nth-child(2)').style.display = display;
}

function closeOverlay() {
  const container = document.getElementById('tables-container');
  const backdrop = document.getElementById('overlay-backdrop');
  container.classList.remove('overlay', 'fullscreen');
  backdrop.classList.remove('active');
  hideRestoreTableModeButtons('unset');
}


function processBalloonData(entry) {
  const launchd1 = entry.launch || "";
  let launchdate1 = "";
  let dias1 = 0;
  let was = "Was";

  // Ensure launch string is long enough
  if (launchd1.length >= 14) {
    const year = launchd1.substring(0, 4);
    const month = launchd1.substring(4, 6);
    const day = launchd1.substring(6, 8);
    const hour = launchd1.substring(8, 10);
    const minute = launchd1.substring(10, 12);
    const second = launchd1.substring(12, 14);

    const lanzado1 = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    const lanzado2 = new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}Z`,
    );
    const now = new Date();

    // Calculate day difference
    const diffTime = now.getTime() - lanzado2.getTime();
    dias1 = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Set 'was' info
    if (entry.SSID && entry.SSID !== "") {
      was = "-" + entry.SSID;
    }

    if (launchd1.length > 10) {
      launchdate1 = `Launched ${mes[parseInt(month, 10)]}-${day} ${year} ${hour}:${minute}&#13;${was} launched ${dias1} days ago`;

      if (dias1 < 0) {
        launchdate1 = `To be Launched &#13; ${mes[parseInt(month, 10)]}-${day} ${year} ${hour}:${minute}&#13; It will be in ${-dias1} days`;
      } else if (dias1 === 0) {
        launchdate1 = `To be Launched &#13; ${mes[parseInt(month, 10)]}-${day} ${year} ${hour}:${minute}&#13; ${was} Launch today`;
      }
    }
  } else {
    const ballooncall = (entry.other || "").toUpperCase();
    launchdate1 = `See ${ballooncall} aprs.fi tracking`;
  }

  return {
    ...entry,
    launchdate1,
    dias1,
  };
}

function autoRefresh() {
  const hasOtherParam = getParamSafe('other').trim() !== '';
  const delaySeconds = hasOtherParam ? 600 : 1800;
  const delayMs = delaySeconds * 1000;

  setTimeout(() => {
    window.parent.window.location.reload();
  }, delayMs);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded
  initializeApp();
}

