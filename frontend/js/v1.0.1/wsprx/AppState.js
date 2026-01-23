/**
 * AppState.js
 * Global Application State Manager
 * Centralizes all application data and configuration
 * 
 * This replaces scattered window.* variables with a single, organized state object
 */

window.HOST_URL = `${new URL(window.parent.window.location.href).origin}`;
const nuevahora = new Date(Date.now() + 600 * 1000);

const AppState = {
  // ===========================================
  // CONFIGURATION
  // ===========================================
  config: {
    // Size parameters (calculated from slowerParam)
    slowerParam: false,
    dataSizeTele1: 0,
    dataSizeTele2: 0,
    cuentaSizeTele1: 0,
    cuentaSizeTele2: 0,
    countSizeTele1: 0,
    countSizeTele2: 0,
    countSize1Tele1: 0,
    countSize2Tele2: 0,
    limitUrl1: 0,
    limitUrl2: 0,


    // User parameters
    launchdate: "",
    frequency: 0,
    fcentral: 0,
    tracker: "",
    balloonid: "",
    timeslot: "",
    banda: "",
    callsign: "",
    other: "",
    qrpid: "",
    detail: "",
    qp: "",
    SSID: "",

    aprs4: "",
    wide: false,
    repito: false,
    telen: false,
  },

  // ===========================================
  // TELEMETRY DATA
  // ===========================================
  telemetry: {
    // Array of TelemetryRecord1 objects
    tele1: [],

    // Array of TelemetryRecord2 objects
    tele2: [],

    // Array of PuntRecord objects (first telemetry processing)
    punt: [],

    // Array of PuntoRecord objects (second telemetry processing)
    punto: [],

    // Array of PuntosRecord objects
    puntos: [],

    // Array of TablaHoraRecord objects
    tablahoras: [],

    // Raw table data
    tablam: [],
    tablax: [],
    tablan: [],
  },

  // ===========================================
  // MAP DATA
  // ===========================================
  map: {
    // Beacon locations for Google Maps
    // Format: [locator, infoHTML]
    locations: [],

    // Arrow markers showing direction
    flechas: [],

    // Trajectory path coordinates
    trayecto: [],

    // Primary beacon data
    beacon1: [],

    parentUrl: HOST_URL,
  },

  // ===========================================
  // DISTANCE STATISTICS
  // ===========================================
  statistics: {
    // Distance histogram data
    // dista[0] = distance ranges (0, 250, 500, ...)
    // dista[1] = counts per range
    dista: [],

    // Distance by km ranges (85 buckets of 250km each)
    distakm: [],
  },

  // ===========================================
  // CURRENT TELEMETRY VALUES
  // ===========================================
  current: {
    wtemp: 0,        // Current temperature (°C)
    wbat: "",        // Current battery voltage (V)
    wspeed: 0,       // Current speed (km/h)
    wsats: "",       // GPS satellites status
    walt: "",        // Current altitude (m)
    newloc: "",      // New location from telemetry 1
    K6_SAVE: "",     // Saved K6 character for locator
    N6_SAVE: "",     // Saved N6 character for locator
  },

  // ===========================================
  // UI STATE
  // ===========================================
  ui: {
    addplusm: "",              // Frequency offset message
    addplusElementValue: "",   // HTML for frequency display
    avgfreqElementValue: "",   // Average frequency value
    proxElementValue: "",      // Proximity value
    showcapture: false,        // Show capture indicator
    Prox: `Next:<br style='line-height:2px;'>${String(nuevahora.getUTCHours()).padStart(2, "0")}:${String(nuevahora.getUTCMinutes()).padStart(2, "0")}`,
  },

  // ===========================================
  // PROCESSING RESULTS
  // ===========================================
  results: {
    last: 0,           // Last record index processed
    avgfreq: 0,        // Average frequency calculated
    puntpointer: 0,    // Current punt array pointer
    puntopointer: 0,   // Current punto array pointer
    puntospointer: 0,  // Current puntos array pointer
    hora0: "",         // Initial time
    locator: "",       // Current locator
    locatorx: "",
    locatorlast: "",   // Last locator
    licenciao: "",     // License/callsign
    power: "",         // Power level
    desdeFecha: "",    // Start date for processing
    spots: 0,          // Total spots counted
    haylista: false,   // Has data flag
    Altfinal: "",
    TempFinal: "",
    VoltFinal: "",
    GPSfinal: "",
    decoqr1: "",
    decoqrf: "",
    powerW: "",
    altutext: "",
  },
  temporal: {
    diaslaunch: Math.floor((new Date() - new Date(window.getLaunchDate())) / (1000 * 60 * 60 * 24)),
    TZD: new Date().getTimezoneOffset() / 60 / 24,
  },
  // ===========================================
  // INITIALIZATION
  // ===========================================

  /**
   * Initialize AppState with configuration from URL parameters
   * Must be called before any processing begins
   */
  init() {

    // Get slower parameter
    this.config.slowerParam = getParamSafe("slower") === "true";

    // Calculate size parameters based on slower mode
    const slower = this.config.slowerParam;
    this.config.dataSizeTele1 = slower ? 20001 : 3001;
    this.config.dataSizeTele2 = slower ? 20001 : 5001;
    this.config.cuentaSizeTele1 = slower ? 20000 : 700;
    this.config.cuentaSizeTele2 = slower ? 12500 : 8700;
    this.config.countSizeTele1 = slower ? 20300 : 5000;
    this.config.countSizeTele2 = slower ? 20000 : 5000;
    this.config.countSize1Tele1 = slower ? 20300 : 800;
    this.config.countSize2Tele2 = slower ? 20000 : 698;
    this.config.limitUrl1 = slower ? 20000 : 3000;
    this.config.limitUrl2 = slower ? 22000 : 5000;

    // Get user parameters
    this.config.launchdate = getLaunchDate();
    this.config.frequency = getFrequency();
    this.config.fcentral = this.config.frequency;
    this.config.tracker = getParamSafe("tracker");
    this.config.balloonid = getParamSafe("balloonid");
    this.config.timeslot = getParamSafe("timeslot");
    this.config.banda = getParamSafe("banda");
    this.config.callsign = getParamSafe("other").toUpperCase();
    this.config.other = getParamSafe("other");
    this.config.qrpid = getParamSafe("qrpid");
    this.config.detail = getParamSafe("detail");
    this.config.qp = getParamSafe("qp");
    this.config.SSID = getParamSafe("SSID");
    this.config.wide = getParamSafe("wide");


  },

  // ===========================================
  // RESET METHODS
  // ===========================================

  /**
   * Reset all telemetry data arrays
   */
  resetTelemetry() {
    this.telemetry.tele1 = [];
    this.telemetry.tele2 = [];
    this.telemetry.punt = [];
    this.telemetry.punto = [];
    this.telemetry.puntos = [];
    this.telemetry.tablahoras = [];
    this.telemetry.tablam = [];
    this.telemetry.tablax = [];
    this.telemetry.tablan = [];
  },

  /**
   * Reset all map data
   */
  resetMap() {
    this.map.locations = [];
    this.map.flechas = [];
    this.map.trayecto = [];
    this.map.beacon1 = [];
  },

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.statistics.dista = [];
    this.statistics.distakm = [];
  },

  /**
   * Reset current values
   */
  resetCurrent() {
    this.current.wtemp = 0;
    this.current.wbat = "";
    this.current.wspeed = 0;
    this.current.wsats = "";
    this.current.walt = "";
    this.current.newloc = "";
    this.current.K6_SAVE = "";
    this.current.N6_SAVE = "";
  },

  /**
   * Reset processing results
   */
  resetResults() {
    this.results.last = 0;
    this.results.avgfreq = 0;
    this.results.puntpointer = 0;
    this.results.puntopointer = 0;
    this.results.puntospointer = 0;
    this.results.hora0 = "";
    this.results.locator = "";
    this.results.locatorlast = "";
    this.results.licenciao = "";
    this.results.power = "";
    this.results.desdeFecha = "";
    this.results.spots = 0;
    this.results.haylista = false;
  },

  /**
   * Reset all data (telemetry, map, statistics, current values, results)
   */
  reset() {
    this.resetTelemetry();
    this.resetMap();
    this.resetStatistics();
    this.resetCurrent();
    this.resetResults();
  },

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get current configuration as object
   */
  getConfig() {
    return { ...this.config };
  },

  /**
   * Check if tracker is QRP Labs or Traquito
   */
  isQrpTracker() {
    const tracker = lcase(this.config.tracker);
    return tracker === "qrplabs" || tracker === "traquito";
  },

  /**
   * Check if tracker is Zachtek1
   */
  isZachtek1() {
    return lcase(this.config.tracker) === "zachtek1";
  },

  /**
   * Get frequency range based on tracker type
   */
  getFrequencyRange() {
    if (this.isQrpTracker()) {
      return {
        bajo: this.config.fcentral - 25,
        alto: this.config.fcentral + 25
      };
    } else {
      return {
        bajo: this.config.fcentral - 105,
        alto: this.config.fcentral + 105
      };
    }
  },

  /**
   * Print current state summary to console
   */
  printState() {
    console.log("📊 AppState Summary:");
    console.log("  Config:", this.config);
    console.log("  Telemetry records:", {
      tele1: this.telemetry.tele1.length,
      tele2: this.telemetry.tele2.length,
      punt: this.telemetry.punt.length,
      punto: this.telemetry.punto.length,
    });
    console.log("  Map data:", {
      locations: this.map.locations.length,
      flechas: this.map.flechas.length,
      trayecto: this.map.trayecto.length,
    });
    console.log("  Current values:", this.current);
    console.log("  Results:", this.results);
  }
};

// ===========================================
// BACKWARD COMPATIBILITY
// ===========================================
// Support old window.* access for gradual migration

// Export to window for backward compatibility
if (typeof window !== 'undefined') {
  window.AppState = AppState;

  // Create proxy getters/setters for backward compatibility
  // This allows old code to still use window.locations while we migrate
  Object.defineProperty(window, 'locations', {
    get: () => AppState.map.locations,
    set: (val) => { AppState.map.locations = val; }
  });

  Object.defineProperty(window, 'flechas', {
    get: () => AppState.map.flechas,
    set: (val) => { AppState.map.flechas = val; }
  });

  Object.defineProperty(window, 'dista', {
    get: () => AppState.statistics.dista,
    set: (val) => { AppState.statistics.dista = val; }
  });

  Object.defineProperty(window, 'beacon1', {
    get: () => AppState.map.beacon1,
    set: (val) => { AppState.map.beacon1 = val; }
  });

  Object.defineProperty(window, 'trayecto', {
    get: () => AppState.map.trayecto,
    set: (val) => { AppState.map.trayecto = val; }
  });

  Object.defineProperty(window, 'wtemp', {
    get: () => AppState.current.wtemp,
    set: (val) => { AppState.current.wtemp = val; }
  });

  Object.defineProperty(window, 'wbat', {
    get: () => AppState.current.wbat,
    set: (val) => { AppState.current.wbat = val; }
  });

  Object.defineProperty(window, 'wspeed', {
    get: () => AppState.current.wspeed,
    set: (val) => { AppState.current.wspeed = val; }
  });

  Object.defineProperty(window, 'wsats', {
    get: () => AppState.current.wsats,
    set: (val) => { AppState.current.wsats = val; }
  });

  Object.defineProperty(window, 'walt', {
    get: () => AppState.current.walt,
    set: (val) => { AppState.current.walt = val; }
  });

  Object.defineProperty(window, 'newloc', {
    get: () => AppState.current.newloc,
    set: (val) => { AppState.current.newloc = val; }
  });

  Object.defineProperty(window, 'K6_SAVE', {
    get: () => AppState.current.K6_SAVE,
    set: (val) => { AppState.current.K6_SAVE = val; }
  });

  Object.defineProperty(window, 'N6_SAVE', {
    get: () => AppState.current.N6_SAVE,
    set: (val) => { AppState.current.N6_SAVE = val; }
  });

  Object.defineProperty(window, 'addplusm', {
    get: () => AppState.ui.addplusm,
    set: (val) => { AppState.ui.addplusm = val; }
  });

  Object.defineProperty(window, 'addplusElementValue', {
    get: () => AppState.ui.addplusElementValue,
    set: (val) => { AppState.ui.addplusElementValue = val; }
  });

  Object.defineProperty(window, 'avgfreqElementValue', {
    get: () => AppState.ui.avgfreqElementValue,
    set: (val) => { AppState.ui.avgfreqElementValue = val; }
  });

  Object.defineProperty(window, 'proxElementValue', {
    get: () => AppState.ui.proxElementValue,
    set: (val) => { AppState.ui.proxElementValue = val; }
  });
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AppState };
}
