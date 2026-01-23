/**
 * TelemetryRecords.js
 * Record Type Classes for WSPR Telemetry Data
 * 
 * Converts array-based data structures to object-based for better maintainability:
 * - tele1[i][3] → tele1[i].frequency
 * - punt[i][3] → punt[i].altitude
 * 
 * Each class includes:
 * - Constructor for creating new records
 * - fromArray() for converting old array format
 * - toArray() for backward compatibility
 */

// ===========================================
// TELEMETRY RECORD TYPE 1
// ===========================================

/**
 * TelemetryRecord1
 * Represents a single telemetry 1 record (main beacon reports)
 * 
 * Example data:
 * 2025-12-25 23:30:00	AB9LM	14097017	-21	0	EM58bv	23	WA1KPD	FN54fa	1782	65	1
 */
class TelemetryRecord1 {
  constructor() {
    this.type = "";           // [0] - ttipo (Type identifier)
    this.time = "";           // [1] - thora (Timestamp)
    this.callsign = "";       // [2] - tcall (Callsign)
    this.frequency = 0;       // [3] - tmhz (Frequency in Hz)
    this.snr = 0;             // [4] - tsnr (Signal-to-Noise Ratio)
    this.drift = 0;           // [5] - tdrift (Frequency drift)
    this.grid = "";           // [6] - tgrid (Grid locator)
    this.power = "";          // [7] - tpwr (Power in dBm)
    this.reporter = "";       // [8] - treporter (Reporter callsign)
    this.reporterGrid = "";   // [9] - trgrid (Reporter grid)
    this.distance = 0;        // [10] - tkm (Distance in km)
    this.azimuth = 0;         // [11] - taz (Azimuth in degrees)
    this.altitude = 0;        // [12] - taltura (Altitude in meters)
    this.field13 = "";        // [13] - Extra field
  }

  /**
   * Create TelemetryRecord1 from array
   * @param {Array} arr - Array in old format [type, time, call, freq, ...]
   * @returns {TelemetryRecord1}
   */
  static fromArray(arr) {
    const record = new TelemetryRecord1();
    if (!arr || arr.length === 0) return record;

    record.type = arr[0] || "";
    record.time = arr[1] || "";
    record.callsign = arr[2] || "";
    record.frequency = Number(arr[3]) || 0;
    record.snr = Number(arr[4]) || 0;
    record.drift = Number(arr[5]) || 0;
    record.grid = arr[6] || "";
    record.power = arr[7] || "";
    record.reporter = arr[8] || "";
    record.reporterGrid = arr[9] || "";
    record.distance = Number(arr[10]) || 0;
    record.azimuth = Number(arr[11]) || 0;
    record.altitude = Number(arr[12]) || 0;
    record.field13 = arr[13] || "";

    return record;
  }

  /**
   * Convert TelemetryRecord1 to array (backward compatibility)
   * @returns {Array}
   */
  toArray() {
    return [
      this.type,          // [0]
      this.time,          // [1]
      this.callsign,      // [2]
      this.frequency,     // [3]
      this.snr,           // [4]
      this.drift,         // [5]
      this.grid,          // [6]
      this.power,         // [7]
      this.reporter,      // [8]
      this.reporterGrid,  // [9]
      this.distance,      // [10]
      this.azimuth,       // [11]
      this.altitude,      // [12]
      this.field13        // [13]
    ];
  }

  /**
   * Create from tab-separated string
   * @param {string} line - Tab-separated data line
   * @returns {TelemetryRecord1}
   */
  static fromTabString(line) {
    const parts = line.split('\t');
    const record = new TelemetryRecord1();
    record.type = "1"; // Type 1 telemetry
    record.time = parts[0] || "";
    record.callsign = parts[1] || "";
    record.frequency = Number(parts[2]) || 0;
    record.snr = Number(parts[3]) || 0;
    record.drift = Number(parts[4]) || 0;
    record.grid = parts[5] || "";
    record.power = parts[6] || "";
    record.reporter = parts[7] || "";
    record.reporterGrid = parts[8] || "";
    record.distance = Number(parts[9]) || 0;
    record.azimuth = Number(parts[10]) || 0;
    record.altitude = Number(parts[11]) || 0;
    return record;
  }

  static fromRawData(text) {
    if (!text || text.trim() === "") {
      return [];
    }

    const lines = text.split(/\r?\n/);
    const reports = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const record = TelemetryRecord1.fromTabString(line);
      reports.push(record);
    }
    return reports;
  }

}

// ===========================================
// TELEMETRY RECORD TYPE 2
// ===========================================

/**
 * TelemetryRecord2
 * Represents a single telemetry 2 record (encoded telemetry)
 * 
 * Example data:
 * 2026-01-05 22:02:00	1U7SCU	14097060	-24	0	JO65eq	23	GI3VAF	IO74	1114	270	1
 */
class TelemetryRecord2 {
  constructor() {
    this.type = "";           // [0] - Type identifier
    this.time = "";           // [1] - Timestamp
    this.callsign = "";       // [2] - Encoded callsign
    this.frequency = 0;       // [3] - Frequency in Hz
    this.snr = 0;             // [4] - Signal-to-Noise Ratio
    this.drift = 0;           // [5] - Frequency drift
    this.grid = "";           // [6] - Encoded grid (contains telemetry)
    this.power = "";          // [7] - Power in dBm
    this.reporter = "";       // [8] - Reporter callsign
    this.reporterGrid = "";   // [9] - Reporter grid
    this.distance = 0;        // [10] - Distance in km
    this.azimuth = 0;         // [11] - Azimuth in degrees
    this.altitude = 0;        // [12] - Altitude in meters
    this.field13 = "";        // [13] - Extra field
  }

  static fromArray(arr) {
    const record = new TelemetryRecord2();
    if (!arr || arr.length === 0) return record;

    record.type = arr[0] || "";
    record.time = arr[1] || "";
    record.callsign = arr[2] || "";
    record.frequency = Number(arr[3]) || 0;
    record.snr = Number(arr[4]) || 0;
    record.drift = Number(arr[5]) || 0;
    record.grid = arr[6] || "";
    record.power = arr[7] || "";
    record.reporter = arr[8] || "";
    record.reporterGrid = arr[9] || "";
    record.distance = Number(arr[10]) || 0;
    record.azimuth = Number(arr[11]) || 0;
    record.altitude = Number(arr[12]) || 0;
    record.field13 = arr[13] || "";

    return record;
  }

  toArray() {
    return [
      this.type,
      this.time,
      this.callsign,
      this.frequency,
      this.snr,
      this.drift,
      this.grid,
      this.power,
      this.reporter,
      this.reporterGrid,
      this.distance,
      this.azimuth,
      this.altitude,
      this.field13
    ];
  }

  static fromTabString(line) {
    const parts = line.split('\t');
    const record = new TelemetryRecord2();
    record.type = "2"; // Type 2 telemetry
    record.time = parts[0] || "";
    record.callsign = parts[1] || "";
    record.frequency = Number(parts[2]) || 0;
    record.snr = Number(parts[3]) || 0;
    record.drift = Number(parts[4]) || 0;
    record.grid = parts[5] || "";
    record.power = parts[6] || "";
    record.reporter = parts[7] || "";
    record.reporterGrid = parts[8] || "";
    record.distance = Number(parts[9]) || 0;
    record.azimuth = Number(parts[10]) || 0;
    record.altitude = Number(parts[11]) || 0;
    return record;
  }
  
  static fromRawData(text) {
    const tracker = getParamSafe("tracker");
    
    if (!text || text.trim() === "") {
      return [];
    }

    const lines = text.split(/\r?\n/);
    const reports = [];
    const normalizedTracker = tracker.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const record = TelemetryRecord2.fromTabString(line);

      // Apply filtering logic only for specific trackers
      if (normalizedTracker === "qrplabs" || normalizedTracker === "traquito") {
        // In fromTabString(), grid is parsed from parts[5]
        // So record.grid corresponds to old datos2[5]
        if (!record.grid || record.grid.length !== 4) {
          // Skip invalid records (like your old code did)
          continue;
        }
      }

      // Only push valid records
      reports.push(record);
    }

    return reports;
  }
}

// ===========================================
// PUNT RECORD
// ===========================================

/**
 * PuntRecord
 * Represents processed telemetry data point from first pass
 * Used to aggregate multiple reports for same location/time
 */
class PuntRecord {
  constructor() {
    this.time = "";           // [0] - Timestamp with 'z' suffix
    this.locator = "";        // [1] - Grid locator (4 or 6 chars)
    this.temperature = "";    // [2] - Temperature in °C
    this.altitude = 0;        // [3] - Altitude in meters
    this.voltage = "";        // [4] - Battery voltage
    this.field5 = "";         // [5] - Reserved/unused
    this.reporters = "";      // [6] - HTML string of reporter info
    this.frequency = 0;       // [7] - Frequency in Hz
  }

  static fromArray(arr) {
    const record = new PuntRecord();
    if (!arr || arr.length === 0) return record;

    record.time = arr[0] || "";
    record.locator = arr[1] || "";
    record.temperature = arr[2] || "";
    record.altitude = Number(arr[3]) || 0;
    record.voltage = arr[4] || "";
    record.field5 = arr[5] || "";
    record.reporters = arr[6] || "";
    record.frequency = Number(arr[7]) || 0;

    return record;
  }

  toArray() {
    return [
      this.time,
      this.locator,
      this.temperature,
      this.altitude,
      this.voltage,
      this.field5,
      this.reporters,
      this.frequency
    ];
  }

  /**
   * Check if record has valid data
   */
  isEmpty() {
    return this.time === "" && this.locator === "";
  }

  /**
   * Get short locator (4 chars)
   */
  getShortLocator() {
    return this.locator.substring(0, 4);
  }
}

// ===========================================
// PUNTO RECORD
// ===========================================

/**
 * PuntoRecord
 * Represents processed telemetry data from second pass
 * Similar to PuntRecord but used in telemetry 2 processing
 */
class PuntoRecord {
  constructor() {
    this.time = "";           // [0] - Timestamp
    this.locator = "";        // [1] - Grid locator
    this.temperature = "";    // [2] - Temperature in °C
    this.altitude = 0;        // [3] - Altitude in meters
    this.voltage = "";        // [4] - Battery voltage
    this.field5 = "";         // [5] - Reserved/unused
    this.data = "";           // [6] - Additional data
    this.field7 = "";         // [7] - Reserved/unused
  }

  static fromArray(arr) {
    const record = new PuntoRecord();
    if (!arr || arr.length === 0) return record;

    record.time = arr[0] || "";
    record.locator = arr[1] || "";
    record.temperature = arr[2] || "";
    record.altitude = Number(arr[3]) || 0;
    record.voltage = arr[4] || "";
    record.field5 = arr[5] || "";
    record.data = arr[6] || "";
    record.field7 = arr[7] || "";

    return record;
  }

  toArray() {
    return [
      this.time,
      this.locator,
      this.temperature,
      this.altitude,
      this.voltage,
      this.field5,
      this.data,
      this.field7
    ];
  }

  isEmpty() {
    return this.time === "" && this.locator === "";
  }
}

// ===========================================
// PUNTOS RECORD
// ===========================================

/**
 * PuntosRecord
 * Another variant of processed telemetry data
 */
class PuntosRecord {
  constructor() {
    this.time = "";
    this.locator = "";
    this.temperature = "";
    this.altitude = 0;
    this.voltage = "";
    this.field5 = "";
    this.data = "";
    this.field7 = "";
  }

  static fromArray(arr) {
    const record = new PuntosRecord();
    if (!arr || arr.length === 0) return record;

    record.time = arr[0] || "";
    record.locator = arr[1] || "";
    record.temperature = arr[2] || "";
    record.altitude = Number(arr[3]) || 0;
    record.voltage = arr[4] || "";
    record.field5 = arr[5] || "";
    record.data = arr[6] || "";
    record.field7 = arr[7] || "";

    return record;
  }

  toArray() {
    return [
      this.time,
      this.locator,
      this.temperature,
      this.altitude,
      this.voltage,
      this.field5,
      this.data,
      this.field7
    ];
  }

  isEmpty() {
    return this.time === "" && this.locator === "";
  }
}

// ===========================================
// TABLA HORA RECORD
// ===========================================

/**
 * TablaHoraRecord
 * Represents time table data
 * Purpose TBD - needs clarification on what these 4 fields contain
 */
class TablaHoraRecord {
  constructor() {
    this.field0 = "";
    this.field1 = "";
    this.field2 = "";
    this.field3 = "";
  }

  static fromArray(arr) {
    const record = new TablaHoraRecord();
    if (!arr || arr.length === 0) return record;

    record.field0 = arr[0] || "";
    record.field1 = arr[1] || "";
    record.field2 = arr[2] || "";
    record.field3 = arr[3] || "";

    return record;
  }

  toArray() {
    return [
      this.field0,
      this.field1,
      this.field2,
      this.field3
    ];
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Convert array of arrays to array of objects
 * @param {Array} arrayOfArrays - Old format data
 * @param {Class} RecordClass - Record class to convert to
 * @returns {Array} Array of record objects
 */
function convertArraysToRecords(arrayOfArrays, RecordClass) {
  if (!arrayOfArrays || !Array.isArray(arrayOfArrays)) {
    return [];
  }

  return arrayOfArrays.map(arr => RecordClass.fromArray(arr));
}

/**
 * Convert array of objects back to array of arrays
 * @param {Array} arrayOfRecords - New format data
 * @returns {Array} Array of arrays
 */
function convertRecordsToArrays(arrayOfRecords) {
  if (!arrayOfRecords || !Array.isArray(arrayOfRecords)) {
    return [];
  }

  return arrayOfRecords.map(record => record.toArray());
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TelemetryRecord1,
    TelemetryRecord2,
    PuntRecord,
    PuntoRecord,
    PuntosRecord,
    TablaHoraRecord,
    convertArraysToRecords,
    convertRecordsToArrays
  };
}
