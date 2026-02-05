function buildEnhancedReportersTable() {
  const locations = AppState.map.locations || [];
  if (locations.length === 0) return '<p style="font-weight: 600; color: #2d3748;font-size: 14px;padding: 0 12px;">No Spotters data available.</p>';

  const reporters = [];
  const callsign = (AppState.config.other || '') + '-' + (AppState.config.SSID || '');

  // 1. Data Parsing (Kept original logic)
  for (let i = 1; i < locations.length; i++) {
    const [locator, infoHTML] = locations[i];
    const parts = infoHTML.split('<br>');
    if (parts.length < 5) continue;

    const reporterCall = parts[0].trim();
    const dateTimeStr = parts[1].replace('z', '').trim();
    const distStr = parts[2].replace('Km', '').replace(' km', '').trim();
    //const grid = parts[3].trim();
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

  if (reporters.length === 0) return '<p>No spotters found</p>';

  const reportersPerRow = 20;
  const sections = Math.ceil(reporters.length / reportersPerRow);
  let html = `<div id="estaciones">`;

  // 2. Grid Renderer
  function renderSection(start, end) {
    const sectionReporters = reporters.slice(start, end);
    
    let sectionHtml = start === 0 ? `<table class="reporters-grid">
      <tr>
        <td colspan="${sectionReporters.length + 1}" style="background-color: #fff7e6; border:none; font-weight:bold; height: 25px;">
          ${reporters.length} Spotters:
        </td>
      </tr>
    ` : `<table class="reporters-grid">`;

    const renderRow = (label, items, type) => {
      sectionHtml += `<tr><td class="col-label">${label}</td>`;
      items.forEach(item => {
        let content = item;
        let style = "";
        
        if (type === 'call') {
          style = "background-color:gold; color:#000;";
          content = `<a href="javascript:mostrar('${item}')" title="QRZ">${item}</a>`;
        } else if (type === 'loc') {
          style = "background-color:#e6ff99;";
          content = `<a target="_blank" href="http://k7fry.com/grid/?qth=${item}">${item}</a>`;
        }
        
        sectionHtml += `<td class="col-data" style="${style}">${content}</td>`;
      });
      sectionHtml += `</tr>`;
    };

    renderRow('Callsign', sectionReporters.map(r => r.callsign), 'call');
    renderRow('Distance Km', sectionReporters.map(r => r.distance));
    renderRow('SNR', sectionReporters.map(r => r.snr));
    renderRow('Locator', sectionReporters.map(r => r.locator), 'loc');
    renderRow('Date', sectionReporters.map(r => r.lastDate));
    renderRow('Time', sectionReporters.map(r => r.lastTime));

    sectionHtml += `</table>`;
    return sectionHtml;
  }

  // 3. Section Loop (including special links)
  const lat = AppState.balloonLat || 0;
  const lon = AppState.balloonLon || 0;
  const specialLinks = [
    { name: 'APRS ', url: `http://aprs.fi?z=09&call=${callsign}`, title: 'VIEW APRS ' },
    { name: 'SONDE', url: `https://amateur.sondehub.org/#${callsign}`, title: 'VIEW SONDE' },
    { name: 'WINDS', url: `https://en.windfinder.com/#6/${lat}/${lon}`, title: 'VIEW WINDS' },
    { name: 'CLOUD', url: `https://www.windy.com/`, title: 'VIEW CLOUD' }
  ];

  for (let s = 0; s < sections; s++) {
    if (s > 0) {
      const link = specialLinks[s - 1]; 
      html += s > specialLinks.length ? `<hr>` : `<hr><a href="${link.url}" target="aprs" style="display:inline-block; width: auto; background-color:gold; padding: 2px 5px; margin-bottom: 5px; color:#000;"><b><u>${link.name}</u></b></a>`;
    }
    html += renderSection(s * reportersPerRow, (s + 1) * reportersPerRow);
  }

  html += '</div>';
  return html;
}

/**
 * QRZ link function - opens QRZ.com page for callsign
 */
function mostrar(callsign) {
  window.open(`https://www.qrz.com/db/${callsign}`, '_blank');
}

function renderReportersTable(tableHTML, containerId = 'reporters-table') {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = tableHTML;
  } else {
    console.warn('[ReportersTable] #reporters-table container not found');
  }
}


if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildEnhancedReportersTable, renderReportersTable, mostrar };
}
