// ============================================================================
// DATA-FETCHER.JS - Data Fetching Layer (CORRECTED)
// Fetches picoss.txt and WSPR reports from db1.wspr.live
// ============================================================================


// Helper functions provided by user
async function getURL(url, responseType = "text") {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result =
      responseType === "text" ? await response.text() : await response.json();
    return result;
  } catch (error) {
    console.error("Error fetching URL:", error);
    return "";
  }
}

async function getURLXform(url, body = null, headers = {}) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...headers,
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return text;
  } catch (error) {
    console.error("Error fetching URL:", error);
    return "";
  }
}

async function readShareAsset({ assetOutputType, assetUrl }) {
  try {
    return await window.parent.window.readAssetFile({
      assetOutputType,
      assetUrl,
    });
  } catch (error) {
    return { statusCode: 400, data: null, error: "Something went wrong." };
  }
}

async function getShareResource(file, outputType = "txt") {
  try {
    const assetUrl = `${encodeURIComponent(`/${file}`)}`;
    let serverResponse;
    const response = await readShareAsset({
      assetOutputType: outputType,
      assetUrl,
    });
    serverResponse = response.data;
    return serverResponse;
  } catch (error) {
    console.error(error);
    return "";
  }
}

// Fetch picoss.txt (ASP lines 52-200+)
async function fetchPicossTxt() {
  try {
    // Try to fetch from share/assets first, then fallback to text/picoss.txt
    let content = await getShareResource("picoss.txt");

    if (!content || content === "") {
      // Fallback to direct URL
      content = await getURL("picoss.txt", "text");
    }

    return content;
  } catch (error) {
    console.error("Error fetching picoss.txt:", error);
    return "";
  }
}

async function fetchJsonData() {
  try {
    // Try to fetch from share/assets first, then fallback to text/picoss.txt
    let content = await getShareResource("datatracker.json", "json");

    if (!content || content === "") {
      // Fallback to direct URL
      content = await getURL(`/api/v1/getAsset?file=${encodeURIComponent("share/assets/datatracker.json")}`, "json");
    }

    return content;
  } catch (error) {
    console.error("Error fetching datatracker.json:", error);
    return "";
  }
}

// Parse picoss.txt content (ASP lines 69-200+)
function parsePicossTxt(content) {
  const lines = content.split(/\r?\n/);
  const balloons = [];
  const callsurl = [];
  let z = 0;

  for (let i = 0; i < lines.length; i++) {
    let linea = lines[i];
    const lineasave = linea;

    // Skip empty lines or comments
    if (!linea || linea.trim() === "" || linea.startsWith("//")) {
      continue;
    }

    // Parse URL parameters from each line
    try {
      const url = new URL(linea.replace("http://lu7aa.org/wsprx.asp", "http://localhost:9090/wsprx"));
      const params = new URLSearchParams(url.search);


      const balloonData = {
        url: lineasave,
        other: params.get("other") || "",
        banda: params.get("banda") || "",
        balloonid: params.get("balloonid") || "",
        timeslot: params.get("timeslot") || "",
        detail: params.get("detail") || "",
        launch: params.get("launch") || "",
        SSID: params.get("SSID") || "",
        tracker: params.get("tracker") || "",
        qrpid: params.get("qrpid") || "",
        repito: params.get("repito") || "",
        qp: params.get("qp") || "",
        telen: params.get("telen") || "",
        comments: decodeURIComponent(params.get("comments") || "")
      };

      balloons.push(balloonData);

      // Store in callsurl array format [callsign, url]
      callsurl[z] = [balloonData.other, lineasave];
      z++;
    } catch (error) {
      console.warn("Error parsing line:", linea, error);
    }
  }

  return { balloons, callsurl };
}


function buildWSPRQuery() {
  //let timeLimit = "604800";

  //   const launchdate = window.getLaunchDate();
  //   const balloonid = getParamSafe("balloonid");
  //   const other = getParamSafe("other");
  //   const callsign = other.toUpperCase();
  //   const detail = getParamSafe("detail");



  for (let g = 0; g < tbanda.length; g++) {
    if (AppState.config.banda.toUpperCase() === tbanda[g].label.toUpperCase()) {
      bandasearch = " band = " + tbanda[g].band + " and ";
    }
  }

  if (AppState.config.detail !== "") {
    cuenta = AppState.config.countSize1Tele1;
  }

  // Callsign fallback
  const callsignm = AppState.config.callsign === "" ? "XYZ123" : AppState.config.callsign;

  // Dates
  let finicio = dateAdd("d", -7, new Date());
  let fim = [finicio.getMonth() + 1, finicio.getDate(), finicio.getFullYear()];
  let filive =
    fim[2] + "-" + right("00" + fim[0], 2) + "-" + right("00" + fim[1], 2);

  if (AppState.config.launchdate !== "") {
    filive = left(trim(AppState.config.launchdate), 19);
  }

  if (AppState.config.launchdate !== "") {
    filive = left(trim(AppState.config.launchdate), 19);
  }

  let filive2 = filive;

  try {
    let finicio2d = dateAdd("d", -3, new Date(left(trim(AppState.config.launchdate), 19)));
    filive2 =
      finicio2d.getFullYear() +
      "-" +
      right("00" + (finicio2d.getMonth() + 1), 2) +
      "-" +
      right("00" + finicio2d.getDate(), 2) +
      " 00:00:00";
  } catch (error) {
    // Error handling
    console.warn("Date processing error:", error);
  }

  let now = new Date();
  let futureDate = dateAdd("d", 2, now);
  let filast =
    futureDate.getFullYear() +
    "-" +
    right("00" + (futureDate.getMonth() + 1), 2) +
    "-" +
    right("00" + futureDate.getDate(), 2);

  let limit = getParamSafe("limit");
  if (limit !== "") {
    filast = left(limit, 4) + "-" + mid(limit, 5, 2) + "-" + mid(limit, 7, 2);
  }
  // Frequency filter
  let frecsearch = "";

  if (AppState.config.tracker === "qrplabs" || AppState.config.tracker === "traquito") {
    const base = Math.floor(AppState.config.fcentral / 1000) * 1000;
    frecsearch =
      AppState.config.wide === "on"
        ? ` and frequency > ${base - 25} and frequency < ${base + 225} `
        : ` and frequency > ${AppState.config.fcentral - 25} and frequency < ${AppState.config.fcentral + 25} `;
  }

  // -------- QUERY 1 (callsign) --------
  const q1 =
    AppState.config.detail === "on"
      ? `select time,tx_sign,frequency,snr,drift,tx_loc,power,rx_sign,rx_loc,distance,azimuth,code 
         from rx where ${bandasearch}
         time >= '${filive}' and time <= '${filast} 23:59:59'
         and tx_sign = '${callsignm}'
         order by time desc LIMIT ${AppState.config.limitUrl1}`
      : `select time,any(tx_sign),cast(avg(frequency) AS DECIMAL(8,0)),
         max(snr),any(drift),any(tx_loc),any(power),any(rx_sign),
         max(rx_loc),max(distance),max(azimuth),any(code)
         from rx where ${bandasearch}
         time >= '${filive}' and time <= '${filast} 23:59:59'
         and tx_sign = '${callsignm}'
         group by time order by time desc LIMIT ${AppState.config.limitUrl1}`;

  // -------- QUERY 2 (balloon) --------
  let q2 = "";
  if (AppState.config.balloonid !== "") {
    q2 =
      AppState.config.detail === "on"
        ? `select time,tx_sign,frequency,snr,drift,tx_loc,power,rx_sign,rx_loc,distance,azimuth,code
           from rx where ${bandasearch}
           time > '${filive2}' and time <= '${filast} 23:59:59'
           and SUBSTRING(tx_sign,1,1)='${ucase(left(AppState.config.balloonid, 1))}'
           and SUBSTRING(tx_sign,3,1)='${right(AppState.config.balloonid, 1)}'
           ${frecsearch}
           order by time desc LIMIT ${AppState.config.limitUrl2}`
        : `select time,any(tx_sign),cast(avg(frequency) AS DECIMAL(8,0)),
           max(snr),min(drift),any(tx_loc),min(power),any(rx_sign),
           max(rx_loc),max(distance),max(azimuth),any(code)
           from rx where ${bandasearch}
           time > '${filive2}' and time <= '${filast} 23:59:59'
           and SUBSTRING(tx_sign,1,1)='${ucase(left(AppState.config.balloonid, 1))}'
           and SUBSTRING(tx_sign,3,1)='${right(AppState.config.balloonid, 1)}'
           ${frecsearch}
           group by time order by time desc LIMIT ${AppState.config.limitUrl2}`;
  }

  const baseURL = "https://db1.wspr.live/";
  return { query1: `${baseURL}?query=${encodeURIComponent(q1)}`, query2: q2 ? `${baseURL}?query=${encodeURIComponent(q2)}` : "" };
}

async function processWSPRQuery1(query1, other, launchdate) {
  if (other === "") return "";

  let response = await getPageResponse(query1);
  let pag = response.statusCode === 200 ? response.content : "";

  if (pag.length < 10) {
    return {
      error: true,
      props: {
        other: other,
        launchdate: launchdate,
      }
    };
  }

  // retry once
  if (pag.length < 20) {
    response = await getPageResponse(query1);
    if (response.statusCode === 200) {
      pag = response.content;
    }
  }

  return { error: false, pag: pag.trim() };
}

async function processWSPRQuery2(query2, balloonid, other) {
  if (balloonid === "" || query2 === "") return "";

  let pag = "";

  if (balloonid !== "") {
    let response = await getPageResponse(query2);
    if (response.statusCode === 200) {
      pag = response.content;
    } else {
      alert("Error: " + response.message);
      pag = "";
    }
  }

  // Retry logic for balloon data
  if ((pag.length < 20 || pag === "") && balloonid !== "") {
    let response = await getPageResponse(query2);
    if (response.statusCode === 200) {
      pag = response.content;
      if ((pag.length < 20 || pag === "") && other !== "") {
        response = await getPageResponse(query2);
        if (response.statusCode === 200) {
          pag = response.content;
        } else {
          alert("Error: " + response.message);
          pag = "";
        }
      }
    } else {
      alert("Error: " + response.message);
      pag = "";
    }
  }

  return pag.trim();

}


async function getPageResponse(url) {
  try {
    const response = await fetch(url);

    if (response.ok) {
      const text = await response.text();
      return {
        statusCode: response.status,
        content: text,
      };
    }

    return {
      statusCode: response.status,
      message: response.statusText,
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      message: error,
    };
  }
}

async function processWSPRQuery() {
  const { query1, query2 } = buildWSPRQuery();

  const q1 = await processWSPRQuery1(query1, AppState.config.other, AppState.config.launchdate);
  if (q1.error) return q1;

  const q2 = await processWSPRQuery2(query2, AppState.config.balloonid, AppState.config.other);

  return {
    error: false,
    pag1: q1.pag,
    pag2: q2,
    cuenta: AppState.config.countSize1Tele1,
    query1,
    query2
  };
}

// Parse WSPR response (tab-separated values)
function parseWSPRResponse(text) {
  if (!text || text.trim() === "") {
    return [];
  }

  const lines = text.split(/\r?\n/);
  const reports = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by tab
    const fields = line.split('\t');

    if (fields.length >= 12) {
      reports.push({
        time: fields[0],           // time
        tx_sign: fields[1],        // tx_sign
        frequency: parseInt(fields[2]) || 0,  // frequency
        snr: parseInt(fields[3]) || 0,        // snr
        drift: parseInt(fields[4]) || 0,      // drift
        tx_loc: fields[5],         // tx_loc
        power: parseInt(fields[6]) || 0,      // power (dBm)
        rx_sign: fields[7],        // rx_sign
        rx_loc: fields[8],         // rx_loc
        distance: parseInt(fields[9]) || 0,   // distance
        azimuth: parseInt(fields[10]) || 0,   // azimuth
        code: fields[11]           // code
      });
    }
  }

  return reports;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getURL,
    getURLXform,
    getShareResource,
    fetchPicossTxt,
    parsePicossTxt,
    buildWSPRQuery,
    processWSPRQuery,
    fetchWSPRReports,
    parseWSPRResponse,
    fetchJsonData,
  };
}
