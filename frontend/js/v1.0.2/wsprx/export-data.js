function exportActiveTableToCSV() {
  // Find the active tab
  const activeTab = document.querySelector('.table-tab.active');
  if (!activeTab) {
    alert('No active tab found');
    return;
  }

  // Get the active tab's onclick attribute to determine which table
  const onclickAttr = activeTab.getAttribute('onclick');
  let tableType = '';
  
  if (onclickAttr.includes('telemetry1')) {
    tableType = 'telemetry1';
  } else if (onclickAttr.includes('telemetry2')) {
    tableType = 'telemetry2';
  } else if (onclickAttr.includes('reporters')) {
    tableType = 'reporters';
  }

  let csvContent = '';
  let filename = '';

  switch(tableType) {
    case 'telemetry1':
      csvContent = exportTelemetry1ToCSV();
      filename = 'telemetry1_export.csv';
      break;
    case 'telemetry2':
      csvContent = exportTelemetry2ToCSV();
      filename = 'telemetry2_export.csv';
      break;
    case 'reporters':
      csvContent = exportReportersToCSV();
      filename = 'spotters_export.csv';
      break;
    default:
      alert('Unknown table type');
      return;
  }

  // Download the CSV file
  downloadCSV(csvContent, filename);
}

function exportTelemetry1ToCSV() {
  const data = AppState.telemetry.tele1Filtered || [];
  
  // CSV Header
  const headers = [
    'Timestamp (z)', 'Call', 'MHz', 'SNR', 'Drift', 
    'Grid', 'Pwr', 'Reporter', 'RGrid', 'Km', 
    'Az°', 'Heig.m', 'Sun°'
  ];
  
  let csv = headers.join(',') + '\n';
  
  // CSV Rows
  data.forEach(row => {
    const time = row.time || "";
    const callsign = row.callsign || "?";
    const freq = parseFloat(row.frequency) || 0;
    const snr = row.snr || "?";
    const drift = row.drift || "0";
    const txGrid = (row.grid || "").padEnd(6, 'L').substring(0, 4);//(row.grid || "").padEnd(6, 'L').substring(0, 6);
    const powerW = row.power === "0.01" ? "0.01" : (parseFloat(row.power) || "?");
    const reporter = row.reporter || "?";
    const rGrid = (row.reporterGrid || "").padEnd(6, 'L').substring(0, 6);//(row.reporterGrid || "").padEnd(6, 'L').substring(0, 6);
    const distance = Math.round(row.distance || 0);
    const azimuth = row.azimuth !== undefined ? Math.round(row.azimuth) : "?";
    const altitude = row.altitude || "?";
    let freqDisplay = Math.round(freq);

    let sunElevation = "";
    try {
      if (tracker === "qrplabs" || tracker === "traquito") {
        if (row.grid && row.grid.length === 4) {
          sunElevation = putsun(time, row.grid + "LL");
        } else {
          sunElevation = putsun(time, txGrid.substring(0, 4));
        }
      } else {
        if (row.grid && row.grid.length >= 6) {
          sunElevation = putsun(time, row.grid.substring(0, 4));
        } else if (row.grid && row.grid.length === 4) {
          sunElevation = putsun(time, row.grid);
        }
      }
    } catch (e) {
      sunElevation = "?";
    }

    const fullTime = formatFullTime(time);
    
    const values = [
      escapeCSV(fullTime || ''),
      escapeCSV(callsign || ''),
      freqDisplay || '',
      snr || '',
      drift || '',
      escapeCSV(txGrid || ''),
      escapeCSV(powerW || ''),
      escapeCSV(reporter || ''),
      escapeCSV(rGrid || ''),
      distance || '',
      azimuth || '',
      altitude || '',
      sunElevation.replace(/&nbsp;/g, '')
    ];
    csv += values.join(',') + '\n';
  });
  
  return csv;
}

function exportTelemetry2ToCSV() {
  const data = AppState.telemetry.tele2RowData || [];
  
  // CSV Header
  const headers = [
    'Timestamp (z)', 'Call', 'Loc', 'Pwr', 'Locator', 
    'Temp', 'Bat/Sun', 'Km/h', 'GPS#', 'Reporter', 
    'RGrid', 'Km', 'Az°', 'Heig.m', 'Sun°'
  ];
  
  let csv = headers.join(',') + '\n';
  
  // CSV Rows
  data.forEach(row => {
    if (!row.success) return; // Skip error rows
    
    const tempStr = row.temperature !== null ? row.temperature + '°C' : '';
    const voltStr = row.voltage ? row.voltage + 'V' : '';
    const speedStr = row.speed !== null && row.speed !== undefined ? row.speed : '';
    const altStr = row.altitude || '';
    const gpsStr = row.gpsSats || '';
    const sunStr = row.sunAngle || '';
    const locatorDisplay = row.locator || row.rawGrid;
    
    const values = [
      escapeCSV(row.timestamp || ''),
      escapeCSV(row.callsign || ''),
      escapeCSV(row.rawGrid || ''),
      escapeCSV(row.power || ''),
      escapeCSV(locatorDisplay || ''),
      escapeCSV(tempStr),
      escapeCSV(voltStr),
      speedStr,
      escapeCSV(gpsStr),
      escapeCSV(row.reporter || ''),
      escapeCSV(row.reporterGrid || ''),
      row.distance || '',
      row.azimuth || '',
      altStr,
      sunStr.replace(/&nbsp;/g, '')
    ];
    csv += values.join(',') + '\n';
  });
  
  return csv;
}

function exportReportersToCSV() {
  const locations = AppState.map.locations || [];
  
  if (locations.length === 0) {
    alert('No reporter data available');
    return '';
  }
  
  const reporters = [];
  
  // Parse locations data (skip first element)
  for (let i = 1; i < locations.length; i++) {
    const [locator, infoHTML] = locations[i];
    const parts = infoHTML.split('<br>');
    if (parts.length < 5) continue;

    const reporterCall = parts[0].trim();
    const dateTimeStr = parts[1].replace('z', '').trim();
    const distStr = parts[2].replace('Km', '').replace(' km', '').trim();
    const snrStr = parts[4].replace('SNR:', '').trim();

    let lastDate = '', lastTime = '';
    const dateParts = dateTimeStr.split(' ');
    if (dateParts.length === 2) {
      lastDate = dateParts[0];
      lastTime = dateParts[1] + 'z';
    }

    reporters.push({
      callsign: reporterCall,
      locator,
      distance: parseInt(distStr) || 0,
      snr: snrStr,
      lastDate,
      lastTime
    });
  }
  
  // CSV Header
  const headers = ['Callsign', 'Distance Km', 'SNR', 'Locator', 'Date', 'Time'];
  let csv = headers.join(',') + '\n';
  
  // CSV Rows
  reporters.forEach(row => {
    const values = [
      escapeCSV(row.callsign),
      row.distance,
      escapeCSV(row.snr),
      escapeCSV(row.locator),
      escapeCSV(row.lastDate),
      escapeCSV(row.lastTime)
    ];
    csv += values.join(',') + '\n';
  });
  
  return csv;
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exportActiveTableToCSV };
}
