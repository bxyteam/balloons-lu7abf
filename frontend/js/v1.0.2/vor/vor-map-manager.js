// Global variables
var map;
// Leaflet marker references
var marker1, marker2, marker7, marker;
var cityPath, flightPath, positionPath, flightLand, widePath;
var circulo;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// MAP STATE SAVING WITH LOCALSTORAGE
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
      localStorage.setItem('vorMapState', JSON.stringify(mapState));
    } catch (e) {
      console.warn('[LeafletMap] Could not save map state:', e);
    }
  }

  map.on('moveend', saveMapState);
  map.on('zoomend', saveMapState);
}

function restoreMapState(map) {
  try {
    const saved = localStorage.getItem('vorMapState');
    if (saved) {
      const mapState = JSON.parse(saved);
      // Only restore if less than 7 days old
      if (Date.now() - mapState.timestamp < 7 * 24 * 60 * 60 * 1000) {
        map.setView([mapState.lat, mapState.lng], mapState.zoom);
        return true;
      }
    }
  } catch (e) {
    console.warn('[LeafletMap] Could not restore map state:', e);
  }
  return false;
}

// ============================================================================
// CUSTOM ICON CREATORS
// ============================================================================

function createAirplaneIcon(rotation) {
  return L.divIcon({
    html: `<svg width="30" height="30" viewBox="-15 -15 30 30" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${rotation}deg);">
      <path d="M 0,0 1,1 1,2 5,3 5,5 1,5 1,8 3,9 3,10 -3,10 -3,9 -1,8 -1,5 -5,5 -5,3 -1,2 -1,1 z" 
            stroke="#FFFF00" stroke-width="0.6" fill="#CC6666" fill-opacity="0.6" transform="scale(1.5)"/>
    </svg>`,
    className: 'airplane-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
}

// ============================================================================
// MAIN MAP INITIALIZATION
// ============================================================================

async function showvormap() {
  if (GLatdeg != 0) {
    // Validate locations array
    if (!Array.isArray(locations)) {
      console.warn('locations is not an array, initializing as empty array');
      locations = [];
    }
    
    // Filter out invalid locations
    locations = locations.filter(function(loc) {
      var hasArrayCoords = (loc[1] !== undefined && loc[2] !== undefined);
      var hasObjectCoords = (loc.lat !== undefined && loc.lng !== undefined);
      return hasArrayCoords || hasObjectCoords;
    });
    
    // Initialize Leaflet map
    map = L.map('map', {
      center: [GLatdeg, GLondeg],
      zoom: deltapos > 1 ? 8 : 10,
      zoomControl: true,
      attributionControl: true,
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: 'topleft',
        title: 'Fullscreen',
        titleCancel: 'Exit fullscreen'
      }
    });

    // Try to restore previous map state
    var stateRestored = restoreMapState(map);
    
    // Setup state saving for future changes
    setupMapStateSaving(map);

    // Add tile layers with layer control
    var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 18
    });

    var streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    });

    var hybrid = L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18
      }),
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        opacity: 0.3,
        maxZoom: 19
      })
    ]);

    // Add default layer
    satellite.addTo(map);

    // Add layer control
    var baseMaps = {
      "Satellite": satellite,
      "Streets": streets,
      "Hybrid": hybrid
    };
    L.control.layers(baseMaps).addTo(map);

    // Add scale control
    L.control.scale({
      position: 'bottomleft',
      imperial: true,
      metric: true
    }).addTo(map);

    // ========================================================================
    // CREATE BALLOON/AIRPLANE MARKER
    // ========================================================================
    
    var balloonIcon;
    if (iconomapa) {
      balloonIcon = L.icon({
        iconUrl: iconomapa,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
    } else if (
      GLondegf * 1 > -61 &&
      GLondegf * 1 < -56 &&
      GLatdegf * 1 > -36 &&
      GLatdegf * 1 < -31 &&
      ucase(callsign) === "LU7AA-11"
    ) {
      balloonIcon = createAirplaneIcon(wdir);
    } else {
      balloonIcon = L.icon({
        iconUrl: imageSrcUrl["balloon"],
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
    }

    var titleText =
      GLondegf * 1 > -61 &&
      GLondegf * 1 < -56 &&
      GLatdegf * 1 > -36 &&
      GLatdegf * 1 < -31 &&
      ucase(callsign) === "LU7AA-11"
        ? "Avion\nHeight\n" +
          replace(
            formatNumberV2((heightsave - feetlaunchfinal) * 0.3048, 0),
            ",",
            "",
            1,
            10
          ) +
          " m."
        : "Balloon\nHeight\n" +
          replace(
            formatNumberV2((heightsave - feetlaunchfinal) * 0.3048, 0),
            ",",
            "",
            1,
            10
          ) +
          " m.";

    marker1 = L.marker([GLatdegf, GLondegf], {
      icon: balloonIcon,
      title: titleText
    }).addTo(map);

    // ========================================================================
    // CREATE CITY MARKER
    // ========================================================================
    
    var pinIcon = L.icon({
      iconUrl: imageSrcUrl["pin"],
      iconSize: [20, 30],
      iconAnchor: [10, 30],
      popupAnchor: [0, -30]
    });

    marker7 = L.marker([latciudad, lonciudad], {
      icon: pinIcon,
      title: "Balloon reference City"
    }).addTo(map);

    // ========================================================================
    // CALCULATE LANDING TIME
    // ========================================================================
    
    var altact = heightsave;
    altact = altact - feetlaunchfinal;
    var deltaact = -saveddeltafeetpersecond;
    var deltac = parseInt(altact / deltaact);
    if (deltac < 0) {
      deltac = deltac * -1;
    }

    var hours = Math.floor(deltac / 3600);
    var minutes = Math.floor((deltac - hours * 3600) / 60);
    var seconds = deltac - hours * 3600 - minutes * 60;
    var spandias = 0;
    if (hours > 24) {
      spandias = Math.floor(hours / 24);
      hours = hours - Math.floor(hours / 24) * 24;
    }
    if (hours < 10) {
      hours = "0" + hours;
    }
    if (minutes < 10) {
      minutes = "0" + minutes;
    }
    if (seconds < 10) {
      seconds = "0" + seconds;
    }
    var time = hours + ":" + minutes + ":" + seconds;
    if (spandias > 0) {
      time = spandias + "d + " + time;
    }

    if (altact < 120000 && !isNaN(hours)) {
      var touchdown = `<br>Terrain at ${formatNumber(feetlaunchfinal * 0.3048, 0)} m. above sea level<br>Estimated land in  ${time}`;
    } else {
      var touchdown = `<br>Terrain at ${formatNumber(feetlaunchfinal * 0.3048, 0)} m. above sea level`;
    }

    horam = horalocal * 1 + timezoneoffset * 1;
    if (horam > 23) {
      horam = horam - 24;
    }
    if (horam < 0) {
      horam = horam + 24;
    }
    horam = right("00" + horam, 2);

    // ========================================================================
    // BIND POPUPS TO MARKERS
    // ========================================================================
    
    // Bind popup to balloon marker
    var balloonPopupContent = `<div style='line-height:1.2;overflow:hidden;white-space:nowrap;'>${callsign} ${horam} : ${right("0" + actualdate.getMinutes(), 2)} : ${right("0" + actualdate.getSeconds(), 2)} / ${right("0" + actualdate.getHours(), 2)} : ${right("0" + actualdate.getMinutes(), 2)} : ${right("0" + actualdate.getSeconds(), 2)} z<br>On ${mes[actualdate.getMonth() + 1]} - ${actualdate.getDate()} of  ${actualdate.getFullYear()} <br>Lat: ${formatNumber(GLatdeg, 6)} Lon: ${formatNumber(GLondeg, 6)} <br>Altitude: ${formatNumberV2(AlturaNumber * 0.3048, 0)} m. / ${AlturaNumber} feet<br>RF reach radio: ${formatNumberV2(1.0 * 3.87 * Math.sqrt(Math.abs(posdatam[5] - feetlaunch) * 0.3048), 0)} Km. (Coverage)<br>Toward ${wdir} ordm; @ ${formatNumber(wspeed / 0.539956803, 1)} Km/h /  ${wspeed} knots<br> ${Delta} ${touchdown}</div>`;
    
    marker1.bindPopup(balloonPopupContent, { maxWidth: 249 });

    // Bind popup to city marker with click event
    marker7.on('click', function() {
      crsdist(latciudad, lonciudad, latsearch, lonsearch);
      var cityPopupContent = `<div style='line-height:1.2;overflow:hidden;white-space:nowrap;'>${cityname}<br>Lat: ${deg_to_dms(latciudad)}<br>Lon ${deg_to_dms(lonciudad)}<br>${(out.distance * 1.852).toFixed(1)} Km > ${out.bearing.toFixed(0)}º</div>`;
      
      // Update popup content and open it
      marker7.setPopupContent(cityPopupContent);
      marker7.openPopup();
    });

    // ========================================================================
    // RIGHT-CLICK HANDLER
    // ========================================================================
    
    map.on('contextmenu', function(e) {
      // Remove existing marker if any
      if (marker) {
        map.removeLayer(marker);
      }

      var lat = e.latlng.lat;
      var lng = e.latlng.lng;

      crsdist(lat, lng, latsearch, lonsearch);
      var distaldesc = out.distance;
      var azimaldesc = out.bearing;

      crsdist(lat, lng, GLatdegf, GLondegf);
      distalglobo = out.distance;
      azimalglobo = out.bearing;

      var greenArrowIcon = L.icon({
        iconUrl: imageSrcUrl["green-arrow"],
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      marker = L.marker([lat, lng], {
        icon: greenArrowIcon,
        title: "     Lat " +
          deg_to_dms(lat) +
          '"\n     Lon ' +
          deg_to_dms(lng) +
          '"\nDistDesc  ' +
          (distaldesc * 1.852).toFixed(2) +
          " Km\nAzimDesc " +
          azimaldesc.toFixed(0) +
          "º\n   --------------------\nDistGlobo  " +
          (distalglobo * 1.852).toFixed(2) +
          " Km\nAzimGlobo " +
          azimalglobo.toFixed(0) +
          "º"
      }).addTo(map);
    });

    // ========================================================================
    // CALCULATE ESTIMATED LANDING POSITION
    // ========================================================================
    
    altact1 = heightsave;
    altact1 = altact1 - feetlaunchfinal;
    deltaact1 = -deltafeetpersecond;
    deltac1 = altact1 / deltaact1;
    if (deltac1 < 0) {
      deltac1 = deltac1 * -1;
    }
    getlatlon(GLatdeg, GLondegf, wdir, (wspeed / 3600) * deltac1);

    // ========================================================================
    // DRAW LINES
    // ========================================================================
    
    // Draw line from balloon to city
    var cityBalloonCoords = [
      deltafeetpersecond < 0 ? [out.lat2, out.lon2] : [GLatdegf, GLondegf],
      [latciudad, lonciudad]
    ];
    cityPath = L.polyline(cityBalloonCoords, {
      color: '#00FF00',
      opacity: 0.6,
      weight: 2
    }).addTo(map);

    // Draw VOR lines if within range
    crsdist(VOR1La, VOR1Lo, GLatdegf, GLondegf);
    var d1 = out.distance;

    crsdist(VOR2La, VOR2Lo, GLatdegf, GLondegf);
    var d2 = out.distance;
    
    if (d1 < 800 && d2 < 800) {
      var vorCoords = [
        [VOR1La, VOR1Lo],
        [GLatdeg, GLondeg],
        [VOR2La, VOR2Lo]
      ];
      flightPath = L.polyline(vorCoords, {
        color: '#FF0000',
        opacity: 1.0,
        weight: 2
      }).addTo(map);
    }

    // Draw flight path if we have position history
    if (um > 1) {
      altact1 = heightsave;
      altact1 = altact1 - feetlaunchfinal;
      deltaact1 = -deltafeetpersecond;
      deltac1 = altact1 / deltaact1;
      if (deltac1 < 0) {
        deltac1 = deltac1 * -1;
      }
      
      getlatlon(GLatdeg, GLondeg, 0, 0);
      
      var tempCoordsArr = [];
      let h = 0;
      for (h = 0; h < um; h++) {
        tempCoordsArr.push([posis[h][0], posis[h][1]]);
      }
      tempCoordsArr.push([posis[h - 1][0], posis[h - 1][1]]);

      positionPath = L.polyline(tempCoordsArr, {
        color: '#FFFF00',
        opacity: 1.0,
        weight: 2
      }).addTo(map);

      // Draw dashed line to estimated landing
      var lastPositionCoords = [
        [GLatdeg, GLondeg],
        [out.lat2, out.lon2]
      ];

      flightLand = L.polyline(lastPositionCoords, {
        color: '#FFFF00',
        opacity: 1.0,
        weight: 1,
        dashArray: '5, 10'
      }).addTo(map);

      // Create wider invisible polyline for click events
      widePath = L.polyline(lastPositionCoords, {
        color: '#FFFF00',
        opacity: 0.01,
        weight: 21
      }).addTo(map);

      crsdist(GLatdeg, GLondeg, out.lat2, out.lon2);
      
      var distkm = out.distance * 1.85;
      if (distkm > 1) {
        var tiempodown = distkm.toFixed(2) + " Km.";
      } else {
        tiempodown = (distkm * 1000).toFixed(0) + " m.";
      }

      var landingPopupContent = `<div style='line-height:1.2;overflow:hidden;white-space:nowrap;'>Aterrizaje estimado en<br>${time} ${timel} local a los <br>${tiempodown} de &uacute;ltima posici&oacute;n<br> Toward direcci&oacute;n ${out.bearing.toFixed(1)} º</div>`;
      
      widePath.on('click', function(e) {
        L.popup()
          .setLatLng(e.latlng)
          .setContent(landingPopupContent)
          .openOn(map);
      });
    }

    // ========================================================================
    // ADD LOCATION MARKERS (VORs, etc.)
    // ========================================================================
    
    var locationMarkers = [];
    for (i = 0; i < locations.length; i++) {
      var location = locations[i];
      
      // Determine latitude and longitude based on structure
      var lat, lng, iconUrl, infoContent;
      
      // Check if it's an array-like object (with numeric indices)
      if (location[1] !== undefined && location[2] !== undefined) {
        lat = location[1];
        lng = location[2];
        iconUrl = location[3] || location.icon;
        infoContent = location[0] || location.infoWindow;
      } 
      // Otherwise it's an object with named properties
      else if (location.lat !== undefined && location.lng !== undefined) {
        lat = location.lat;
        lng = location.lng;
        iconUrl = location.icon;
        infoContent = location.infoWindow;
      } else {
        // Skip invalid locations
        console.warn('Invalid location at index', i, location);
        continue;
      }

      // Validate coordinates
      if (lat === undefined || lng === undefined || lat === null || lng === null) {
        console.warn('Invalid coordinates at index', i, 'lat:', lat, 'lng:', lng);
        continue;
      }

      // Create custom icon for this location
      var locationIcon = L.icon({
        iconUrl: iconUrl || imageSrcUrl["point"],
        iconSize: [8, 8],
        iconAnchor: [4, 4],
        popupAnchor: [0, -4]
      });

      // Create the marker with the actual coordinates
      var locationMarker = L.marker([lat, lng], {
        icon: locationIcon
      }).addTo(map);

      locationMarkers.push(locationMarker);

      // Add click handler with closure - CRITICAL FIX HERE
      // The issue was that the popup was being bound to the wrong marker
      (function(index, loc, theMarker) {
        theMarker.on('click', function(e) {
          var radio = 0;
          var content = loc[0] || loc.infoWindow || '';
          
          // Parse coverage radius if present
          if (content.search("lcance") > 0) {
            var datauno = content.split("lcance");
            datados = datauno[1].split(" ");
            radio = datados[1] * 1000;
          }

          // Remove existing circle if any
          if (circulo) {
            map.removeLayer(circulo);
          }

          // Add circle if we have a radius
          if (radio > 0) {
            var markerLat = loc[1] !== undefined ? loc[1] : loc.lat;
            var markerLng = loc[2] !== undefined ? loc[2] : loc.lng;
            
            circulo = L.circle([markerLat, markerLng], {
              color: '#00FFFF',
              fillColor: '#00FFFF',
              fillOpacity: 0.08,
              opacity: 0.5,
              weight: 1,
              radius: radio
            }).addTo(map);
          }

          // Replace placeholders with actual values
          if (index == vorloc1m) {
            content = content.replace("xQpZ1", parseInt(r1) + " º");
            content = content.replace("ZpQx1", parseInt(d1));
          }
          if (index == vorloc2m) {
            content = content.replace("xQpZ2", parseInt(r2) + " º");
            content = content.replace("ZpQx2", parseInt(d2));
          }

          // Create popup content
          var popupContent = `<div style='line-height:1.2;overflow:hidden;white-space:nowrap;'>${content}</div>`;
          
          // CRITICAL FIX: Open popup at the marker's location, not at map center
          // Use the marker's coordinates explicitly
          var markerLatLng = theMarker.getLatLng();
          L.popup({ maxWidth: 220 })
            .setLatLng(markerLatLng)
            .setContent(popupContent)
            .openOn(map);
        });

        // Special handling for first marker
        if (index === 0) {
          theMarker.options.title = "   Aterrizaje estimado " +
            fechadescmesdia +
            "\nA las " +
            timel +
            " local / " +
            timez +
            " z";
        }
      })(i, location, locationMarker);
    }

    // ========================================================================
    // AUTO-OPEN BALLOON POPUP IF REQUESTED
    // ========================================================================
    
    if (autoRefParam == 1) {
      setTimeout(function() {
        marker1.openPopup();
      }, 500);
    }

  } else {
    document.getElementById("map").innerHTML =
      "Invalid Balloon Location Detected, can't show VOR's map";
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showMap() {
  document.getElementById("gMapLoader").style.display = "none";
  document.getElementById("map").style.visibility = "visible";
}

function displayError(msg) {
  document.getElementById("map").innerHTML = `<div style="border: 3px solid red;
      padding: 10px;
      border-radius: 5px;
      width: 300px;
      margin: 0 auto;
      box-shadow: 4px 10px 22px -17px;">
  <h3 style="font-size: 18px;">Error initializing map:</h3>
  <p style="font-size: 16px;">${msg}</p>
  </div>`;
}