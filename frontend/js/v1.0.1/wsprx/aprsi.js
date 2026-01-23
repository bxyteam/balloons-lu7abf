// ===== CONFIGURATION =====
window.APRS_CONFIG = {
    endpoint: '/api/v1/aprs',
    uploadCheckIntervalMinutes: 10,
    maxSpeedKmh: 301,
    productionUrl: `${window.HOST_URL}/wsprx`
};

// ===== UTILITY FUNCTIONS =====

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatCoordinate(value, isLatitude) {
    const absValue = Math.abs(value);
    const degrees = Math.floor(absValue);
    const minutes = (absValue - degrees) * 60;
    const formatted = (degrees * 100 + minutes).toFixed(2);
    const length = isLatitude ? 7 : 8;
    return formatted.padStart(length, '0');
}

// ===== APRS PACKET BUILDER =====
function buildAprsPacket(beaconData, locationData, lanzamiento, distanciatotal) {
    const callsign = window.getParamSafe("other", "LU1ESY").toUpperCase().split("/")[0];
    const ssid = window.getParamSafe("SSID");

    if (!ssid || !beaconData || beaconData.length === 0 || !locationData || locationData.length === 0) {
        console.warn("Cannot build APRS packet - missing required data");
        return null;
    }

    // Extract location from first beacon
    const location = locationData[0][0].substring(0, 6);
    const altitudeMatch = locationData[0][1].match(/(?<=Alt\.:\s*).*?(?=\s*&nbsp;)/gs);
    const Alturareportadametros = parseFloat(altitudeMatch?.[0] || 0);
    const Alturareportadapies = (Alturareportadametros * 3.28084).toFixed(0);

    // Get coordinates
    const latboya = window.loc2latlon(location).loclat;
    const lonboya = window.loc2latlon(location).loclon;

    const latpos = latboya < 0 ? "S" : "N";
    const lonpos = lonboya < 0 ? "W" : "E";

    const lat = Math.abs(latboya);
    const lon = Math.abs(lonboya);

    // Format coordinates using gradosminutos
    let lata = (window.gradosminutos(lat) + 0.000).toString();
    let lona = (window.gradosminutos(lon) + 0.000).toString();

    lata = ((lata * 1) + 0.000).toFixed(2).toString();
    lona = ((lona * 1) + 0.000).toFixed(2).toString();

    lata = ("000" + lata).slice(-7);
    lona = ("000" + lona).slice(-8);

    // Time from beacon
    const horaspot = beaconData[0][0].substring(8, 10) +
        beaconData[0][0].substring(11, 13) +
        beaconData[0][0].substring(14, 16) + "z";

    // Determine symbol (Buoy vs PicoBalloon)
    const callsignFull = window.getParamSafe("other").toUpperCase();
    const isBuoy = callsignFull.slice(-2) === "/B" && callsignFull.substring(0, 2) === "LU";
    const tok1 = isBuoy ? "\\" : "/";
    const tok2 = isBuoy ? "N" : "O";
    const tok3 = isBuoy ? "Buoy" : "PicoBalloon";

    // Build base packet
    let aprs4 = `${callsign}-${ssid}>APRS,TCPIP*,qAR,LU7AA:/${horaspot}${lata}${latpos}${tok1}${lona}${lonpos}${tok2}000/000/A=${("000000" + Alturareportadapies).slice(-6)} ${location}`;

    // Add telemetry if available
    if (beaconData.length > 1) {
        // Temperature
        if (beaconData[0][2] !== "" && beaconData[0][2] !== "? ") {
            aprs4 += ` ${(beaconData[0][2] * 1).toFixed(0)}C`;
        }

        // Voltage
        if (beaconData[0][4] !== "" && beaconData[0][4] !== "? ") {
            aprs4 += ` ${(beaconData[0][4].replace(/V/, "") * 1).toFixed(1)}V`;
        }

        // Calculate course and speed between points
        let r = 0;
        let rumbo, seconds, distancia;

        do {
            r = r + 1;
            rumbo = window.crsdist(
                window.loc2latlon(beaconData[r][1]).loclat,
                window.loc2latlon(beaconData[r][1]).loclon,
                window.loc2latlon(beaconData[0][1]).loclat,
                window.loc2latlon(beaconData[0][1]).loclon
            ).bearing.toFixed(0);

            seconds = (new Date(window.redate(beaconData[0][0])) -
                new Date(window.redate(beaconData[r][0]))) / 1000;

            distancia = window.crsdist(
                window.loc2latlon(beaconData[0][1]).loclat,
                window.loc2latlon(beaconData[0][1]).loclon,
                window.loc2latlon(beaconData[r][1]).loclat,
                window.loc2latlon(beaconData[r][1]).loclon
            ).distance * 1.852; // nm to km

        } while (distancia < 100 && r < (beaconData.length - 1));

        const velocidad = ((distancia * 3600) / seconds).toFixed(0);
        distancia = distancia.toFixed(0);

        const rtxt = isNaN(rumbo) ? "?" : rumbo + "";
        const rumboact = rtxt;
        const velocidadact = velocidad;
        const secondsact = seconds;
        const distanciact = distancia;

        // Add bearing
        if (rumboact !== "" && rumboact !== "?") {
            aprs4 += ` To:${rumboact}`;
        }

        // Calculate ascent rate
        let ascent;
        if (seconds) {
            ascent = ((beaconData[0][3] - beaconData[r][3]) / seconds).toFixed(2) + "m/s";
        } else {
            ascent = "";
        }

        if (ascent === "0.00m/s") {
            ascent = "0m/s";
        }

        if (ascent && ascent !== "") {
            aprs4 += ` Up:${ascent}`;
        }

        // Additional calculations matching original
        const hoursfirst = new Date(window.redate(beaconData[beaconData.length - 1][0]));

        const distanciaBetweenFirst = window.crsdist(
            window.loc2latlon(beaconData[0][1]).loclat,
            window.loc2latlon(beaconData[0][1]).loclon,
            window.loc2latlon(beaconData[1][1]).loclat,
            window.loc2latlon(beaconData[1][1]).loclon
        ).distance * 1.852;

        const hoursactual = (new Date(window.redate(beaconData[0][0])) -
            new Date(window.redate(beaconData[1][0]))) / 1000 / 60 / 60;

        let hourstotal = 0;
        if (beaconData.length > 0) {
            hourstotal = (new Date(window.redate(beaconData[0][0])) -
                new Date(window.redate(beaconData[beaconData.length - 1][0]))) / 1000 / 60 / 60;
        }

        // Duration since launch
        let durax = 0;
        if (lanzamiento) {
            durax = (new Date(window.redate(beaconData[0][0])) - lanzamiento) / 1000 / 60;
        }

        // Total distance calculations (if provided)
        if (distanciatotal && hourstotal) {
            const TotalKm = distanciatotal / hourstotal / 60;
            const velocidadTotal = distanciatotal / hourstotal;
        }

        // Add speed - NOTE: Original divides by 1.852 (converts km/h back to knots)
        // but still labels as Km/h. This appears intentional in the original.
        if (velocidadact !== "" && !isNaN(velocidadact)) {
            aprs4 += ` V:${(velocidadact / 1.852).toFixed(0)}Km/h`;
        }

        // Add sun elevation
        if (window.SunCalc && window.loctolatlon) {
            try {
                const radian = 180 / Math.PI;
                const Sunelevadosave = (window.SunCalc.getPosition(
                    new Date(beaconData[0][0].replace(/ /, "T").replace(/z/, "Z")),
                    window.loctolatlon(beaconData[0][1]).lat,
                    window.loctolatlon(beaconData[0][1]).lon
                ).altitude * radian).toFixed(0);

                if (Sunelevadosave !== "") {
                    aprs4 += ` Sun:${Sunelevadosave.toString()}`;
                }
            } catch (e) {
                console.warn("Error calculating sun position:", e);
            }
        }
    }

    // Build URL with all parameters
    const params = new URLSearchParams();
    params.append("other", getParamSafe("other"));
    if (getParamSafe("launch")) params.append("launch", getParamSafe("launch"));
    if (getParamSafe("detail")) params.append("detail", getParamSafe("detail"));
    if (getParamSafe("SSID")) params.append("SSID", getParamSafe("SSID"));
    if (getParamSafe("banda")) params.append("banda", getParamSafe("banda"));
    if (getParamSafe("balloonid")) params.append("balloonid", getParamSafe("balloonid"));
    if (getParamSafe("timeslot")) params.append("timeslot", getParamSafe("timeslot"));
    if (getParamSafe("tracker")) params.append("tracker", getParamSafe("tracker"));

    aprs4 += ` WSPR ${tok3} ${APRS_CONFIG.productionUrl}?${params.toString()}`;
    aprs4 = aprs4.replace(/#/g, "");

    return aprs4;
}

// ===== UPLOAD FUNCTIONALITY =====
async function uploadToAprs(aprsPacket) {
    const btn = document.getElementById("btnUpload");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "UPLOADING...";
    }

    try {
        const response = await fetch(APRS_CONFIG.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ datos: aprsPacket })
        });

        const result = await response.json();

        if (result.status === "success") {
            if (btn) {
                btn.style.background = "#90ee90";
                btn.textContent = "✓ UPLOADED";
                setTimeout(() => {
                    btn.disabled = false;
                    btn.style.background = "gold";
                    btn.textContent = "UPLOAD TO APRS.FI";
                }, 3000);
            }
            console.log("APRS upload successful:", result);
            return true;
        } else {
            throw new Error(result.message || "Upload failed");
        }
    } catch (err) {
        console.error("APRS upload error:", err);
        if (btn) {
            btn.disabled = false;
            btn.style.background = "#ff6666";
            btn.textContent = "⚠ RETRY";
        }
        alert("Failed to upload to APRS: " + err.message);
        return false;
    }
}

// ===== UI RENDERING =====
function renderUploadUI(aprsPacket, shouldAutoUpload = false) {
    const container = document.getElementById("aprsfi");
    if (!container) return;

    const callsign = window.getParamSafe("other", "LU1ESY").toUpperCase().split("/")[0];
    const ssid = window.getParamSafe("SSID");
    const fcentral = window.getFrequency ? window.getFrequency() : 0;

    const uploadText = shouldAutoUpload
        ? `CLICK HERE TO UPLOAD ${callsign}-${ssid}`
        : `DOUBLE CLICK TO UPLOAD ${callsign}-${ssid}`;

    container.innerHTML = `
        <label>
          Wide: <input type="checkbox" id="wide" name="wide" ${window.getParamSafe("wide") === "on" ? "checked" : ""} title="Check for wider reception for your second TLM use if your emission is way off frequency">
        </label>

        <span>Central QRG: <b id="hz-feq">${AppState.config.fcentral}</b> Hz</span>

        <button class="upload-button" id="btnUpload">
          ⬆️ ${uploadText} TO APRS.FI & SONDEHUB
        </button>

        <label>
          REPEAT UPLOADS <input type="checkbox" name="repito" id="repito" ${window.getParamSafe("repito") === "on" ? "checked" : ""}> ON ${APRS_CONFIG.uploadCheckIntervalMinutes}' AUTO-UPDATE
        </label>`;

    // Attach event listeners
    const uploadBtn = document.getElementById("btnUpload");
    if (shouldAutoUpload) {
        uploadBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            uploadToAprs(aprsPacket);
        });
    } else {
        uploadBtn.addEventListener("dblclick", (ev) => {
            ev.preventDefault();
            showUploadConfirmation(aprsPacket);
        });
    }

    document.getElementById("wide")?.addEventListener("change", updateUrlParams);
    document.getElementById("repito")?.addEventListener("change", updateUrlParams);
}

function showUploadConfirmation(aprsPacket) {
    const popup = window.open("", "uploadConfirm", "width=400,height=350,top=200,left=200");
    if (!popup) {
        alert("Please allow popups for this site");
        return;
    }

    popup.document.write(`
        <html>
        <head><title>Upload Confirmation</title></head>
        <body style="background: #172447; color: cyan; font-family: Tahoma; text-align: center; padding: 20px;">
            <h3>Upload Position Anyway?</h3>
            <p>Speed or position may be duplicate</p>
            <button onclick="window.opener.uploadToAprs(\`${aprsPacket.replace(/`/g, "\\`")}\`); window.close();" 
                    style="padding: 10px 20px; background: gold; cursor: pointer;">
                Upload Anyway
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; margin-left: 10px;">
                Cancel
            </button>
        </body>
        </html>
    `);
    setTimeout(() => popup.close(), 15000);
}

function updateUrlParams() {
    const params = new URLSearchParams(window.parent.window.location.search);
    const wideCheckbox = document.getElementById("wide");
    const repitoCheckbox = document.getElementById("repito");

    if (wideCheckbox) {
        params.set("wide", wideCheckbox.checked ? "on" : "off");
    }
    if (repitoCheckbox) {
        params.set("repito", repitoCheckbox.checked ? "on" : "off");
    }

    window.parent.window.history.replaceState({}, "", `${window.parent.window.location.pathname}?${params.toString()}`);
}

// ===== MAIN FUNCTION =====
async function aprsend(beaconData, locationData, trajectoryData, lanzamiento = null, distanciatotal = null) {
    await sleep(200);

    const aprsPacket = buildAprsPacket(beaconData, locationData, lanzamiento, distanciatotal);
    if (!aprsPacket) {
        console.warn("Cannot build APRS packet - missing data");
        return;
    }

    // Check if upload should be allowed based on time since last report
    const lastTrajectoryDate = new Date(window.redate(trajectoryData[0][0]));
    const now = new Date();
    const minutesSinceLastReport = (now - lastTrajectoryDate) / (1000 * 60);

    const shouldAutoUpload = minutesSinceLastReport < APRS_CONFIG.uploadCheckIntervalMinutes;

    renderUploadUI(aprsPacket, shouldAutoUpload);

    // Auto-upload if repito is checked and within time window
    if (window.getParamSafe("repito") === "on" && shouldAutoUpload) {
        await uploadToAprs(aprsPacket);
    }
}

// Export for global use
window.aprsend = aprsend;
window.uploadToAprs = uploadToAprs;
window.buildAprsPacket = buildAprsPacket;


