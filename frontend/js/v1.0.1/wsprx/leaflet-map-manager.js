// ============================================================================
// LEAFLET-MAP-MANAGER.JS - Free Alternative to Google Maps
// Uses Leaflet.js + OpenStreetMap (No API keys required!)
// Drop-in replacement for map-manager.js
// ============================================================================

// Required: Add to HTML <head>:
// <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
// <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

let globalMap = null;
let globalPopup = null;

const MapObjects = {
  map: null,
  popup: null,

  // Markers
  balloonMarker: null,
  reporterMarkers: [],
  trajectoryMarkers: [],

  // Lines
  reporterArrows: [],
  flightPath: null,

  // Circles and grids
  coverageCircle: null,
  gridRectangles: [],

  // State
  hiddenSpots: false,
  hiddenTrack: false
};

// ============================================================================
// CUSTOM ICONS (Base64 encoded - no external files needed)
// ============================================================================

const LeafletIcons = {
  balloon: L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ff600a" ><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M13 18a2 2 0 0 1 2 2v1a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2v-1a2 2 0 0 1 2 -2z" /><path d="M12 1a7 7 0 0 1 7 7c0 4.185 -3.297 9 -7 9s-7 -4.815 -7 -9a7 7 0 0 1 7 -7" /></svg>`), 
    iconSize: [35, 48],
    iconAnchor: [21, 48],
    popupAnchor: [0, -48]
  }),
  
  greenArrow: L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#3eec32"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 2a1 1 0 0 1 .993 .883l.007 .117v.35l8.406 3.736c.752 .335 .79 1.365 .113 1.77l-.113 .058l-8.406 3.735v7.351h1a1 1 0 0 1 .117 1.993l-.117 .007h-4a1 1 0 0 1 -.117 -1.993l.117 -.007h1v-17a1 1 0 0 1 1 -1z" /></svg>
    `),
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  }),

  yellowDot: L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#feba01" ><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18.364 4.636a9 9 0 0 1 .203 12.519l-.203 .21l-4.243 4.242a3 3 0 0 1 -4.097 .135l-.144 -.135l-4.244 -4.243a9 9 0 0 1 12.728 -12.728zm-6.364 3.364a3 3 0 1 0 0 6a3 3 0 0 0 0 -6" /></svg>

    `),
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  }),

  redDot: L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fe1616" ><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18.364 4.636a9 9 0 0 1 .203 12.519l-.203 .21l-4.243 4.242a3 3 0 0 1 -4.097 .135l-.144 -.135l-4.244 -4.243a9 9 0 0 1 12.728 -12.728zm-6.364 3.364a3 3 0 1 0 0 6a3 3 0 0 0 0 -6" /></svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }),

  smallBalloon: L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ff600a" ><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M13 18a2 2 0 0 1 2 2v1a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2v-1a2 2 0 0 1 2 -2z" /><path d="M12 1a7 7 0 0 1 7 7c0 4.185 -3.297 9 -7 9s-7 -4.815 -7 -9a7 7 0 0 1 7 -7" /></svg>`),
    iconSize: [7, 24],
    iconAnchor: [5, 5]
  }),

  invisible: L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa('<svg width="1" height="1" xmlns="http://www.w3.org/2000/svg"></svg>'),
    iconSize: [1, 1],
    iconAnchor: [0, 0]
  })
};

// ============================================================================
// INITIALIZE MAP
// ============================================================================

function initializeMap() {
  
  if (!window.L) {
    console.error('[LeafletMap] Leaflet.js not loaded! Add: <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>');
    return;
  }

  if (!AppState.map.beacon1 || AppState.map.beacon1.length === 0) {
    console.error('[LeafletMap] No beacon data available');
    return;
  }

  const latestBeacon = AppState.map.beacon1[0];
  const locator = latestBeacon[1];
  const latLon = loctolatlon(locator);

  // Create map with multiple tile layer options
  const map = L.map('map', {
    center: [latLon.lat, latLon.lon],
    zoom: 5,
    zoomControl: true,
    attributionControl: true
  });

  MapObjects.map = map;

  // Add tile layers with layer control
  const baseMaps = {
    "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }),
    
    "Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Tiles © Esri'
    }),
    
    "Hybrid": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Tiles © Esri'
    }).addTo(map),
    
    "Topo": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '© OpenTopoMap'
    }),
    
    "Dark": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© CartoDB'
    })
  };

  // Add labels overlay for satellite view
  const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: ''
  });

  baseMaps["Hybrid"].addTo(map);
  labels.addTo(map);

  const overlayMaps = {
    "Labels": labels
  };

  L.control.layers(baseMaps, overlayMaps).addTo(map);

  // Add scale control
  L.control.scale({
    position: 'bottomleft',
    imperial: false
  }).addTo(map);

  restoreMapState(map);
  setupMapStateSaving(map);

  // Add all map elements
  addBalloonMarker(map, latLon);
  addReporterMarkers(map, locator);
  drawReporterArrows(map, latLon);
  drawFlightPath(map);
  drawGridRectangles(map, locator);
  addTrajectoryMarkers(map);
  setupMapClickHandler(map);

  return map;
}

// ============================================================================
// ADD BALLOON MARKER
// ============================================================================

function addBalloonMarker(map, latLon) {
 
  // Detect if stationary
  let isStationary = true;
  if (AppState.map.beacon1 && AppState.map.beacon1.length > 1) {
    const firstLoc = AppState.map.beacon1[0][1];
    for (let i = 1; i < AppState.map.beacon1.length; i++) {
      if (AppState.map.beacon1[i][1] !== firstLoc) {
        isStationary = false;
        break;
      }
    }
  }

  let icon = LeafletIcons.balloon;
  if (isStationary) {
    icon = LeafletIcons.greenArrow;
  }

  const marker = L.marker([latLon.lat, latLon.lon], {
    icon: icon,
    title: 'WSPR Emitter',
    zIndexOffset: 9999
  }).addTo(map);

  MapObjects.balloonMarker = marker;

  // Get info from locations array
  let balloonInfoHTML = '';
  if (AppState.map.locations && AppState.map.locations[0]) {
    balloonInfoHTML = AppState.map.locations[0][1];
  } else {
    balloonInfoHTML = buildFallbackBalloonInfo();
  }

  const styledHTML = `<div style="color: #3333ff;line-height:9px;font-size:11px;font-weight:bold;">
    <center>${balloonInfoHTML}</center>
  </div>`;

  marker.bindPopup(styledHTML, { maxWidth: 200 }).openPopup();

}

function buildFallbackBalloonInfo() {
  const callsign = AppState.config.other || 'Balloon';
  const ssid = AppState.config.SSID || '11';
  const locator = AppState.map.beacon1[0][1] || 'GF05vc';
  const altitude = AppState.map.beacon1[0][3] || '7000';
  const temp = AppState.map.beacon1[0][2] || '?';
  const voltage = AppState.map.beacon1[0][4] || '?';

  return `${callsign}<br>-${ssid}<br>${locator}<br>Alt.: ${altitude} m.<br>Temp.: ${temp} °C<br>Bat/Sol: ${voltage} V`;
}

// ============================================================================
// ADD REPORTER MARKERS
// ============================================================================

function addReporterMarkers(map, balloonLocator) {
  
  MapObjects.reporterMarkers = [];

  for (let i = 0; i < AppState.map.locations.length; i++) {
    const [locator, infoHTML] = AppState.map.locations[i];
    const latLon = loctolatlon(locator);

    if (!latLon.lat || !latLon.lon) continue;
    if (locator === balloonLocator) continue;

    // Icon selection
    let icon;
    let titleSuffix;

    if (i < 6 && AppState.map.locations.length > 5) {
      icon = LeafletIcons.yellowDot;
      titleSuffix = ' Last Reporter';
    } else {
      icon = LeafletIcons.redDot;
      titleSuffix = ' Reporter';
    }

    const callsign = infoHTML.substring(0, 7)
      .replace(/</, '')
      .replace(/b/, '')
      .replace(/r/, '');

    const marker = L.marker([latLon.lat, latLon.lon], {
      icon: icon,
      title: callsign + titleSuffix,
      opacity: 0.8
    }).addTo(map);

    MapObjects.reporterMarkers.push(marker);

    const styledHTML = `<div style="color: #4444ff; line-height:11px;font-weight:bold;">
      <center>${infoHTML}</center>
    </div>`;

    marker.bindPopup(styledHTML, { maxWidth: 200 });
  }

}

// ============================================================================
// DRAW REPORTER ARROWS
// ============================================================================

function drawReporterArrows(map, balloonLatLon) {

  MapObjects.reporterArrows = [];

  const saveLat = parseFloat(balloonLatLon.lat).toFixed(4);
  const saveLon = parseFloat(balloonLatLon.lon).toFixed(4);

  for (let i = 0; i < AppState.map.flechas.length; i++) {
    const locator = AppState.map.flechas[i];
    const latLon = loctolatlon(locator);

    if (!latLon.lat || !latLon.lon) continue;

    const locLat = parseFloat(latLon.lat).toFixed(4);
    const locLon = parseFloat(latLon.lon).toFixed(4);

    if (saveLat === locLat && saveLon === locLon) continue;

    const polyline = L.polyline([
      [balloonLatLon.lat, balloonLatLon.lon],
      [latLon.lat, latLon.lon]
    ], {
      color: '#F4FA58',
      weight: 2,
      opacity: 0.25
    }).addTo(map);

    // Add arrowhead decorator
    const decorator = L.polylineDecorator(polyline, {
      patterns: [
        {
          offset: '100%',
          repeat: 0,
          symbol: L.Symbol.arrowHead({
            pixelSize: 8,
            pathOptions: {
              fillOpacity: 1,
              weight: 0,
              color: '#F4FA58'
            }
          })
        }
      ]
    }).addTo(map);

    MapObjects.reporterArrows.push(polyline);
    MapObjects.reporterArrows.push(decorator);
  }

}

// Note: Leaflet-polylineDecorator required for arrows
// Add to HTML: <script src="https://cdn.jsdelivr.net/npm/leaflet-polylinedecorator@1.6.0/dist/leaflet.polylineDecorator.min.js"></script>

// ============================================================================
// DRAW FLIGHT PATH
// ============================================================================

function drawFlightPath(map) {
  
  const coordinates = [];

  for (let i = 0; i < AppState.map.beacon1.length - 1; i++) {
    const [time, locator] = AppState.map.beacon1[i];
    const latLon = loctolatlon(locator);

    if (!isNaN(latLon.lat) && !isNaN(latLon.lon)) {
      coordinates.push([latLon.lat, latLon.lon]);
    }
  }

  const polyline = L.polyline(coordinates, {
    color: '#FF6000',
    weight: 3,
    opacity: 1.0
  }).addTo(map);

  MapObjects.flightPath = polyline;

}

// ============================================================================
// DRAW GRID RECTANGLES
// ============================================================================

function drawGridRectangles(map, locator) {
  
  const grid4 = locator.substring(0, 4);
  
  const corners = {
    aa: grid4 + 'AA',
    aw: grid4 + 'AW',
    wa: grid4 + 'WA',
    ww: grid4 + 'WW'
  };

  const latLon = {};
  for (const key in corners) {
    const result = loc2latlon(corners[key]);
    if (isNaN(result.loclat) || isNaN(result.loclon)) return;
    latLon[key] = result;
  }

  // 4-character grid
  const gridCoords = [
    [latLon.aa.loclat - 0.04, latLon.aa.loclon - 0.08],
    [latLon.aa.loclat - 0.04, latLon.wa.loclon + 0.08],
    [latLon.aw.loclat + 0.04, latLon.wa.loclon + 0.08],
    [latLon.aw.loclat + 0.04, latLon.aa.loclon - 0.08],
    [latLon.aa.loclat - 0.04, latLon.aa.loclon - 0.08]
  ];

  L.polyline(gridCoords, {
    color: '#F0F0F0',
    weight: 3,
    opacity: 0.7
  }).addTo(map);

  // 6-character subsquare
  if (locator.length >= 6) {
    const grid6 = locator.substring(0, 6);
    const subLatLon = loc2latlon(grid6);

    if (!isNaN(subLatLon.loclat) && !isNaN(subLatLon.loclon)) {
      const subGridCoords = [
        [subLatLon.loclat - 0.04, subLatLon.loclon - 0.08],
        [subLatLon.loclat - 0.04, subLatLon.loclon + 0.08],
        [subLatLon.loclat + 0.04, subLatLon.loclon + 0.08],
        [subLatLon.loclat + 0.04, subLatLon.loclon - 0.08],
        [subLatLon.loclat - 0.04, subLatLon.loclon - 0.08]
      ];

      L.polyline(subGridCoords, {
        color: '#F0F0F0',
        weight: 3,
        opacity: 0.7
      }).addTo(map);
    }
  }

  // Draw coverage circle
  if (AppState.map.beacon1 && AppState.map.beacon1.length > 0) {
    const balloonLocator = AppState.map.beacon1[0][1];
    const balloonLatLon = loc2latlon(balloonLocator);
    if (!isNaN(balloonLatLon.loclat) && !isNaN(balloonLatLon.loclon)) {
      drawCoverageCircle(map, balloonLatLon);
    }
  }
}

function drawCoverageCircle(map, balloonLatLon) {
  const altMeters = parseInt(AppState.map.beacon1[0][3]) || 7000;
  const earthRadiusMeters = 6378137;
  const radiusKm = (Math.sqrt(Math.pow(altMeters + earthRadiusMeters, 2) - Math.pow(earthRadiusMeters, 2)) / 1000) * 0.997;
  const radiusMeters = radiusKm * 1000;

  const circle = L.circle([balloonLatLon.loclat, balloonLatLon.loclon], {
    radius: radiusMeters,
    color: '#F0F0F0',
    weight: 2,
    opacity: 0.6,
    fillColor: '#F0F0F0',
    fillOpacity: 0.1
  }).addTo(map);

  MapObjects.coverageCircle = circle;

  circle.bindPopup(`<div style="color: #3333ff;line-height:15px;font-weight:bold;">
    <center>Coverage Circle<br>Radius: ${radiusKm.toFixed(0)} Km.</center>
  </div>`);

}

// ============================================================================
// ADD TRAJECTORY MARKERS
// ============================================================================

function addTrajectoryMarkers(map) {

  MapObjects.trajectoryMarkers = [];

  const markerInterval = Math.max(1, Math.floor(AppState.map.beacon1.length / 500));

  for (let i = 0; i < AppState.map.beacon1.length; i += markerInterval) {
    const [time, locator, temp, altitude, voltage, speed, reporter, freq] = AppState.map.beacon1[i];
    const latLon = loctolatlon(locator);

    if (!latLon.lat || !latLon.lon || isNaN(latLon.lat) || isNaN(latLon.lon)) continue;

    const marker = L.marker([latLon.lat, latLon.lon], {
      icon: LeafletIcons.greenArrow,
      title: `${time} - ${altitude}m`
    }).addTo(map);

    MapObjects.trajectoryMarkers.push(marker);

    // Add click popup
    const date = new Date(time);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = months[date.getMonth()] + '-' +
      String(date.getDate()).padStart(2, '0') + ' ' +
      String(date.getHours()).padStart(2, '0') + ':' +
      String(date.getMinutes()).padStart(2, '0') + 'z';

    const markerLatLon = loc2latlon(locator);
    let sunElevStr = '';
    if (typeof SunCalc !== 'undefined' && markerLatLon.loclat && markerLatLon.loclon) {
      try {
        const markerTime = new Date(time);
        const sunPos = SunCalc.getPosition(markerTime, markerLatLon.loclat, markerLatLon.loclon);
        const sunElev = (sunPos.altitude * 57.2957795).toFixed(1);
        const arrow = sunElev > 0 ? '▲' : '▼';
        const color = sunElev > 0 ? '#267326' : '#ff0000';
        sunElevStr = `<span style='color:${color};'>Sun Elev:${sunElev}°${arrow}</span><br>`;
      } catch (e) {
        sunElevStr = '';
      }
    }

    const content = `<div style="color: #3333ff;line-height:13px;font-size:11px;font-weight:bold;">
      <center>
        <span style="color:#000;font-size:12px;">${AppState.config.other || 'Balloon'}-${AppState.config.SSID || '11'}</span><br>
        <span style="color:#000;">${dateStr}</span><br>
        <span style="color:#000;">Loc: ${locator}</span><br>
        <span style="color:#000;">Alt.: ${altitude} m.</span><br>
        <span style="color:#000;">Temp.: ${temp} °C</span><br>
        <span style="color:#000;">Bat/Sol: ${voltage} V</span><br>
        ${sunElevStr}
        <span style="color:#000;">V: ${speed} Km/h</span><br>
        ${reporter ? `<span style="color:#000;">${reporter}</span>` : ''}
      </center>
    </div>`;

    marker.bindPopup(content, { maxWidth: 200 });
  }

}

// ============================================================================
// MAP CLICK HANDLER
// ============================================================================

function setupMapClickHandler(map) {
 
  map.on('click', function(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    const locator = latlon2loc(lat, lng);
    const grid = locator.substring(0, 4) + locator.substring(4, 6).toLowerCase();

    let sunElevStr = '';
    if (typeof SunCalc !== 'undefined') {
      const sunPos = SunCalc.getPosition(new Date(), lat, lng);
      const sunElev = (sunPos.altitude * 180 / Math.PI).toFixed(1);
      const arrow = sunElev > 0 ? '▲' : '▼';
      const color = sunElev > 0 ? '#267326' : '#ff0000';
      sunElevStr = `<span style='color:${color};'>${sunElev}°${arrow}</span>`;
    }

    const balloonLoc = AppState.map.beacon1[0][1];
    const balloonLatLon = loc2latlon(balloonLoc);
    const dist = crsdist(balloonLatLon.loclat, balloonLatLon.loclon, lat, lng);
    const distKm = (dist.distance * 1.852).toFixed(1);
    const azimuth = dist.bearing.toFixed(0);

    const latStr = deg2dms ? deg2dms(lat, false) : lat.toFixed(4);
    const lngStr = deg2dms ? deg2dms(lng, true) : lng.toFixed(4);

    const content = `<div onclick="gowinds2(${lng},${lat})" style='color: #3333ff;line-height:13px;font-weight:bold;cursor:pointer;'>
      <center>
        Here: ${grid}<br>
        Sun: ${sunElevStr}<br>
        Lat: ${latStr}<br>
        Lon: ${lngStr}<br>
        Balloon Az: ${azimuth}°<br>
        Dist.: ${distKm} Km.<br>
        <u>Click for Winds</u>
      </center>
    </div>`;

    const popup = L.popup()
      .setLatLng(e.latlng)
      .setContent(content)
      .openOn(map);

    setTimeout(() => popup.remove(), 10000);
  });

}

// ============================================================================
// MAP STATE SAVING
// ============================================================================

function setupMapStateSaving(map) {

  function saveMapState() {
    const center = map.getCenter();
    const mapState = {
      lat: center.lat,
      lng: center.lng,
      zoom: map.getZoom(),
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('balloonMapState', JSON.stringify(mapState));
    } catch (e) {
      console.warn('[LeafletMap] Could not save map state:', e);
    }
  }

  map.on('moveend', saveMapState);
  map.on('zoomend', saveMapState);

}

function restoreMapState(map) {
  try {
    const saved = localStorage.getItem('balloonMapState');
    if (saved) {
      const mapState = JSON.parse(saved);
      if (Date.now() - mapState.timestamp < 7 * 24 * 60 * 60 * 1000) {
        map.setView([mapState.lat, mapState.lng], mapState.zoom);
      }
    }
  } catch (e) {
    console.warn('[LeafletMap] Could not restore map state:', e);
  }
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

function initializeUI(ui) {
  // const mapContainer = document.getElementById('map');
  // if (mapContainer) {
  //   mapContainer.style.width = `${ui.canvasMapW}px`;
  //   mapContainer.style.height = `${ui.canvasMapH}px`;
  // }
  const mapSkeleton = document.getElementById("map-skeleton");
  if(mapSkeleton) {
    mapSkeleton.remove();
  }
  document
    .getElementById("chart-buttons").classList.remove("chart-buttons-outer");
  if (window.innerWidth > 1024){
    document
    .getElementById("chart-buttons").style.display = "flex";
  } else {
     document
      .getElementById("chart-buttons").style.display = "grid";
  }
      
  const iconos = document.getElementById('iconos');
  if (iconos) iconos.style.visibility = 'visible';

  const legend = document.getElementById('legend');
  if (legend) legend.style.visibility = 'visible';
  
  document.getElementById('addPlus').innerHTML = AppState.ui.addplusElementValue;
  document.getElementById('avgfreq').innerText = AppState.ui.avgfreqElementValue;
  document.getElementById('Prox').innerHTML = AppState.ui.Prox;
}

function toggleSpots() {
  const visible = MapObjects.hiddenSpots;
  
  MapObjects.reporterMarkers.forEach(m => {
    if (visible) m.addTo(MapObjects.map);
    else m.remove();
  });
  
  MapObjects.reporterArrows.forEach(a => {
    if (visible) a.addTo(MapObjects.map);
    else a.remove();
  });
  
  MapObjects.hiddenSpots = !visible;
  document.getElementById('hide').innerText = visible ? 'HideSpots' : 'ShowSpots';
}

function toggleTrack() {
  const visible = MapObjects.hiddenTrack;
  
  if (MapObjects.flightPath) {
    if (visible) MapObjects.flightPath.addTo(MapObjects.map);
    else MapObjects.flightPath.remove();
  }
  
  MapObjects.trajectoryMarkers.forEach(m => {
    if (visible) m.addTo(MapObjects.map);
    else m.remove();
  });
  
  MapObjects.hiddenTrack = !visible;
  document.getElementById('hidet').innerText = visible ? 'HideTrack' : 'ShowTrack';
}

// ============================================================================
// HELPER FUNCTIONS (from original code)
// ============================================================================

function loctolatlon(loc) {
  if (!loc || loc.length < 4) {
    return { lat: 0, lon: 0 };
  }

  loc = loc.toUpperCase().trim().replace(/"/g, '');
  if (loc.length === 4) {
    loc = loc + 'LL';
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
  if (!locname) locname = "MyPlace";
  if (!loc) loc = "GF05";
  
  loc = loc.toUpperCase();
  if (loc.length == 4) loc = loc + "LL";
  
  if (loc.length > 0) {
    let err = 0;
    if (loc.length != 6) err = 1;
    else {
      const c0 = loc.charAt(0);
      const c1 = loc.charAt(1);
      const c2 = loc.charAt(2);
      const c3 = loc.charAt(3);
      const c4 = loc.charAt(4);
      const c5 = loc.charAt(5);
      
      if (
        c0 < "A" || c0 > "R" ||
        c1 < "A" || c1 > "R" ||
        (c2 < "0") | (c2 > "9") ||
        c3 < "0" || c3 > "9" ||
        c4 < "A" || c4 > "X" ||
        c5 < "A" || c5 > "X"
      ) err = 1;
    }
    
    if (err) {
      return { loclat: "", loclon: "", locname: "" };
    } else {
      const loclat = (parseInt(loc.charAt(1), 28) - 19) * 10 +
        parseInt(loc.charAt(3), 10) +
        (parseInt(loc.charAt(5), 34) - 9.5) / 24;
      const loclon = (parseInt(loc.charAt(0), 28) - 19) * 20 +
        parseInt(loc.charAt(2), 10) * 2 +
        (parseInt(loc.charAt(4), 34) - 9.5) / 12;
      return { loclat: loclat, loclon: loclon, locname: locname };
    }
  }
}

function latlon2loc(lat, lon) {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWX';
  const c1 = base.charAt(Math.floor(lat / 10) + 9);
  lat -= Math.floor(lat / 10) * 10;
  const c3 = Math.floor(lat);
  lat -= Math.floor(lat);
  const c5 = base.charAt(Math.floor(lat * 24));
  const c0 = base.charAt(Math.floor(lon / 20) + 9);
  lon -= Math.floor(lon / 20) * 20;
  const c2 = Math.floor(lon / 2);
  lon -= Math.floor(lon / 2) * 2;
  const c4 = base.charAt(Math.floor(lon * 12));
  return c0 + c1 + c2 + c3 + c4 + c5;
}

function deg2dms(dd, isLng) {
  const dir = dd < 0
    ? isLng ? ' W' : ' S'
    : isLng ? ' E' : ' N';

  const absDd = Math.abs(dd);
  const deg = absDd | 0;
  const frac = absDd - deg;
  const min = (frac * 60) | 0;
  let sec = frac * 3600 - min * 60;
  sec = Math.round(sec);
  return deg + "°" + min + "'" + sec + '"' + dir;
}

function crsdist(lat1, lon1, lat2, lon2) {
  const EARTH_RADIUS = 3440.07;
  const PI = 3.1415926535897932384626433832795;
  const DEG2RAD = 0.01745329252;
  const RAD2DEG = 57.29577951308;
  const x1 = lon1 * DEG2RAD;
  const y1 = lat1 * DEG2RAD;
  const x2 = lon2 * DEG2RAD;
  const y2 = lat2 * DEG2RAD;

  const osphFrom = defSphereCoo(EARTH_RADIUS, y1, x1);
  const osphTo = defSphereCoo(EARTH_RADIUS, y2, x2);

  const qchordkm = Math.sqrt(
    (osphTo.xp - osphFrom.xp) * (osphTo.xp - osphFrom.xp) +
    (osphTo.yp - osphFrom.yp) * (osphTo.yp - osphFrom.yp) +
    (osphTo.zp - osphFrom.zp) * (osphTo.zp - osphFrom.zp)
  );
  
  const distance = 2 * EARTH_RADIUS * Math.asin(qchordkm / 2 / EARTH_RADIUS);
  
  const a = Math.cos(y2) * Math.sin(x2 - x1);
  const b = Math.cos(y1) * Math.sin(y2) - Math.sin(y1) * Math.cos(y2) * Math.cos(x2 - x1);
  
  let adjust = 0;
  let bearing;
  
  if (a == 0 && b == 0) {
    bearing = 0;
  } else if (b == 0) {
    bearing = (a < 0) ? (3 * PI) / 2 : PI / 2;
  } else if (b < 0) {
    adjust = PI;
  } else {
    adjust = (a < 0) ? 2 * PI : 0;
  }
  
  if (!(a == 0 && b == 0) && b != 0) {
    bearing = (Math.atan(a / b) + adjust) * RAD2DEG;
  }
  
  return { distance: distance, bearing: bearing };
}

function defSphereCoo(rad, nw, nl) {
  const rad_ = rad * Math.cos(nw);
  return {
    xp: rad_ * Math.cos(nl),
    yp: rad_ * Math.sin(nl),
    zp: rad * Math.sin(nw)
  };
}

// ============================================================================
// EXTERNAL LINK FUNCTIONS
// ============================================================================

function showprop() {
  const preferences = "toolbar=no,width=640px,height=479px,center,margintop=0,top=100,left=100,status=no,scrollbars=no,resizable=no,dependent=yes,z-lock=yes";
  if (window.popup != null) window.popup.close();
  const popupwi = window.open("https://www.sws.bom.gov.au/Images/HF%20Systems/Global%20HF/Ionospheric%20Map/West/fof2_maps.png", "win1", preferences);
  popupwi.setTimeout('self.close()', 120000);
}

function gowinds() {
  const token = ",";
  const url = "https://www.windy.com/en/-Mostrar---a%C3%B1adir-m%C3%A1s-capas/overlays?cloudtop,";
  const EXTRA = ",5";
  const lugarlatlong = loctolatlon(AppState.map.locations[0][0]).lat + token + loctolatlon(AppState.map.locations[0][0]).lon;
  const irhacia = url + lugarlatlong + EXTRA;
  window.open(irhacia, "_blank");
}

function gowinds1() {
  let altuv = 0;
  for (let c = 0; c < 5; c++) {
    if (AppState.map.beacon1[c][3] * 1 > 500) {
      altuv = AppState.map.beacon1[c][3] * 1;
    }
  }
  
  const url = "https://www.ventusky.com/?p=";
  const EXTRA1 = "&t=" + AppState.map.beacon1[0][0].substring(0, 4) + 
    AppState.map.beacon1[0][0].substring(5, 7) + 
    AppState.map.beacon1[0][0].substring(8, 10) + "/" + 
    ((100 + Math.floor(AppState.map.beacon1[0][0].substring(11, 13) / 3) * 3).toString()).slice(-2) + "00";
  
  let EXTRA = ";6&l=wind-200hpa" + EXTRA1;
  if (altuv < 10000) EXTRA = ";6&l=wind-300hpa" + EXTRA1;
  if (altuv < 7000) EXTRA = ";6&l=wind-500hpa" + EXTRA1;
  if (altuv < 5000) EXTRA = ";6&l=wind-600hpa" + EXTRA1;
  if (altuv < 1000) EXTRA = ";6&l=wind-900hpa" + EXTRA1;
  if (altuv < 100) EXTRA = ";6&l=wind-10m" + EXTRA1;
  
  const lugarlatlong = loctolatlon(AppState.map.locations[0][0]).lat + ";" + loctolatlon(AppState.map.locations[0][0]).lon;
  const irhacia = url + lugarlatlong + EXTRA;
  window.open(irhacia, "_blank");
}

function gowinds2(oldlon, oldlat) {
  const url = "https://www.ventusky.com/?p=";
  let EXTRA = ";6&l=wind-200hpa";
  if (AppState.map.beacon1[0][3] * 1 < 10000) EXTRA = ";6&l=wind-300hpa";
  if (AppState.map.beacon1[0][3] * 1 < 7000) EXTRA = ";6&l=wind-500hpa";
  if (AppState.map.beacon1[0][3] * 1 < 5000) EXTRA = ";6&l=wind-600hpa";
  if (AppState.map.beacon1[0][3] * 1 < 1000) EXTRA = ";6&l=wind-900hpa";
  if (AppState.map.beacon1[0][3] * 1 < 100) EXTRA = ";6&l=wind-10m";
  
  const lugarlatlong = oldlat + ";" + oldlon;
  const irhacia = url + lugarlatlong + EXTRA;
  window.open(irhacia, "_blank");
}

function goplanes() {
  const token = ",";
  const url = "https://www.flightradar24.com/";
  const EXTRA = "/6";
  const lugarlatlong = (loctolatlon(AppState.map.locations[0][0]).lat * 1).toFixed(2) + token + (loctolatlon(AppState.map.locations[0][0]).lon * 1).toFixed(2);
  const irhacia = url + lugarlatlong + EXTRA;
  window.open(irhacia, "_blank");
}

function goships() {
  const url = "https://www.marinetraffic.com/en/ais/home/" + 
    "centerx:" + loctolatlon(AppState.map.locations[0][0]).lon + 
    "/centery:" + loctolatlon(AppState.map.locations[0][0]).lat;
  const EXTRA = "/zoom:6";
  const irhacia = url + EXTRA;
  window.open(irhacia, "_blank");
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeMap,
    initializeUI,
    toggleSpots,
    toggleTrack,
    showprop,
    gowinds,
    gowinds1,
    gowinds2,
    goplanes,
    goships
  };
}