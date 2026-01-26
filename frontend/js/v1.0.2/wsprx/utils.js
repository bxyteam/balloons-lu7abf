function getParamSafe(key, defaultValue = "", encode = false)  {
  const params = new URLSearchParams(window.parent.window.location.search);
  const value = params.get(key);
  if (value === null || value.trim() === "") return defaultValue;
  return encode ? encodeURIComponent(value) : value.trim();
};

function getLaunchDate() {
  if (getParamSafe("launch").length > 0) {
    const launchd = getParamSafe("launch");
    return `${launchd.substring(0, 4)}-${launchd.substring(4, 6)}-${launchd.substring(6, 8)} ${launchd.substring(8, 10)}:${launchd.substring(10, 12)}:${launchd.substring(12, 14)}`;
  }
  const now = new Date();
  const fe = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const pad = (n) => String(n).padStart(2, "0");
  return `${fe.getFullYear()}-${pad(fe.getMonth() + 1)}-${pad(fe.getDate())} 00:00:00`;
};

function getFrequency() {
  let fd = 0;
  if (
    getParamSafe("tracker") === "qrplabs" ||
    getParamSafe("tracker") === "traquito"
  ) {
    const modulo = Math.floor(((getParamSafe("qrpid") * 1) % 20) / 5);
    if (modulo === 0) fd = -80;
    if (modulo === 1) fd = -40;
    if (modulo === 2) fd = +40;
    if (modulo === 3) fd = +80;
  }

  let frecu = 0;

  if (getParamSafe("banda").length > 0) {
    const requestedBanda = getParamSafe("banda").toUpperCase();
    const match = tbanda.find(
      (entry) => entry.label.toUpperCase() === requestedBanda.toUpperCase(),
    );
    if (match) {
      frecu = match.frequency;
    }
  }
  return frecu + fd;
};

function ucase(str) {
  return str ? str.toString().toUpperCase() : "";
}

function lcase(str) {
  return str ? str.toString().toLowerCase() : "";
}

function left(str, length) {
  return str.toString().substring(0, length);
}

function right(str, length) {
  return str.toString().slice(-length);
}

function mid(str, start, length) {
  return str.toString().substr(start - 1, length);
}

function trim(str) {
  return str ? str.toString().trim() : "";
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

function capitalizeFirstLetter(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function replace(
  str,
  find,
  replaceWith,
  start = 1,
  count = -1,
  compareType = 0,
) {
  if (!str) return "";
  let result = str.toString();
  if (count === -1) {
    // Replace all occurrences
    result = result.split(find).join(replaceWith);
  } else {
    // Replace limited occurrences
    let replaceCount = 0;
    let index = result.indexOf(find);
    while (index !== -1 && replaceCount < count) {
      result =
        result.substring(0, index) +
        replaceWith +
        result.substring(index + find.length);
      replaceCount++;
      index = result.indexOf(find, index + replaceWith.length);
    }
  }
  return result;
}

function chr(code) {
  return String.fromCharCode(code);
}

function isNumeric(value) {
  return !isNaN(value) && !isNaN(parseFloat(value));
}

function ubound(arr) {
  return arr ? arr.length - 1 : -1;
}

function cDate(dateString) {
  try {
    return new Date(dateString);
  } catch (error) {
    return new Date();
  }
}

function isDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}

function dateAdd(interval, number, date) {
  const result = new Date(date);
  switch (interval.toLowerCase()) {
    case "d":
      result.setDate(result.getDate() + number);
      break;
    case "m":
      result.setMonth(result.getMonth() + number);
      break;
    case "y":
      result.setFullYear(result.getFullYear() + number);
      break;
    case "n": // minutes
      result.setMinutes(result.getMinutes() + number);
      break;
    case "h": // hours
      result.setHours(result.getHours() + number);
      break;
    case "d": // days
      result.setDate(result.getDate() + number);
      break;
    case "yyyy": // years
      result.setFullYear(result.getFullYear() + number);
      break;
  }
  return result;
}

function dateDiff(unidad, fecha1, fecha2) {
  const f1 = new Date(fecha1);
  const f2 = new Date(fecha2);
  const msDiff = f2 - f1; // Diferencia en milisegundos

  switch (unidad) {
    case "s":
      return msDiff / 1000; // segundos
    case "n":
      return msDiff / (1000 * 60); // minutos
    case "h":
      return msDiff / (1000 * 60 * 60); // horas
    case "d":
      return msDiff / (1000 * 60 * 60 * 24); // días
    case "m": // meses aproximados
      return (
        (f2.getFullYear() - f1.getFullYear()) * 12 +
        (f2.getMonth() - f1.getMonth())
      );
    case "y": // años
      return f2.getFullYear() - f1.getFullYear();
    default:
      throw new Error("Unidad de diferencia no válida");
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDateTimeFormat(date, format) {
  switch (format) {
    case 4: // Time format HH:MM
      return (
        date.getHours().toString().padStart(2, "0") +
        ":" +
        date.getMinutes().toString().padStart(2, "0")
      );
    case 1: // General date format
      return date.toLocaleString();
    case 2: // Short date format
      return date.toLocaleDateString();
    case 3: // Long date format
      return date.toDateString();
    // Add more formats as needed
    default:
      return date.toString();
  }
}

function dateDiffMinutes(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60)); // Convert milliseconds to minutes
}

function split(str, delimiter, limit = -1, compareType = 0) {
  if (!str) return [];
  let parts = str.split(delimiter);
  if (limit > 0 && parts.length > limit) {
    parts = parts.slice(0, limit);
  }
  return parts;
}

function xsnrFun(dbm) {
  try {
    return xsnr[dbm] || 0;
  } catch (error) {
    console.error("Error in xsnr:", error);
    return 0;
  }
}

function oriFun(dbm) {
  try {
    return ori[dbm];
  } catch (error) {
    console.error("Error in ori:", error);
    return 0;
  }
}

function getHeightPercentage(x) {
  if (typeof x !== "number" || x < 0) {
    console.error("Input must be a non-negative number");
    return 500;
  }

  const screenHeight = window.innerHeight; // Height of the viewport in pixels
  const result = (x / 100) * screenHeight;
  return result;
}

function getWidthPercentage(x) {
  if (typeof x !== "number" || x < 0) {
    console.error("Input must be a non-negative number");
    return 500;
  }

  const screenWidth = window.innerWidth; // Width of the viewport in pixels
  const result = (x / 100) * screenWidth;
  return result;
}

function checkdate() {
  var fechaingresada = formu.limit.value;
  var fecha = new Date(
    fechaingresada.substring(0, 4) +
    "/" +
    fechaingresada.substring(4, 6) +
    "/" +
    fechaingresada.substring(6, 8),
  );
  if (isNaN(fecha)) {
    alert("Entered date " + fechaingresada + " is invalid, cleared");
    formu.limit.value = "";
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getParamSafe,
    getLaunchDate,
    getFrequency,
    ucase,
    lcase,
    left,
    right,
    mid,
    trim,
    capitalizeWords,
    capitalizeFirstLetter,
    replace,
    chr,
    isNumeric,
    ubound,
    cDate,
    isDate,
    dateAdd,
    dateDiff,
    formatDate,
    formatDateTime,
    formatDateTimeFormat,
    dateDiffMinutes,
    split,
    xsnrFun,
    oriFun,
    getWidthPercentage,
    getHeightPercentage,
    checkdate
  };
}
