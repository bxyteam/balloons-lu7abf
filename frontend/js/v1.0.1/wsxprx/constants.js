
const bandDict = {
  "2200m": "0.13",
  "630m": "0.47",
  "160m": "1.8",
  "60m": "5",
  "40m": "7",
  "30m": "10",
  "20m": "14",
  "17m": "18",
  "15m": "21",
  "12m": "24",
  "10m": "28",
  "6m": "50",
  "4m": "70",
  "2m": "144",
  18: "432",
  19: "1296"
};

const ori = {
  0: 0,
  3: 500,
  7: 1000,
  10: 1500,
  13: 2000,
  17: 2500,
  20: 3000,
  23: 4000,
  27: 5000,
  30: 6000,
  33: 7000,
  37: 8000,
  40: 8500,
  43: 9000,
  47: 9500,
  50: 10000,
  53: 10500,
  57: 11000,
  60: 15000,
};

const xsnr = {
  0: 0,
  3: 1000,
  7: 2000,
  10: 3000,
  13: 4000,
  17: 5000,
  20: 6000,
  23: 7000,
  27: 8000,
  30: 9000,
  33: 10000,
  37: 11000,
  40: 12000,
  43: 13000,
  47: 14000,
  50: 15000,
  53: 16000,
  57: 17000,
  60: 18000,
  63: 19000,
  67: 20000,
  70: 21000,
  73: 22000,
  77: 23000,
  80: 24000,
};

// Month names (ASP lines 13-15)
const mes = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Set", "Oct", "Nov", "Dec"
];

const tbanda = [
  { band: "All", label: "All", frequency: 14097100 },
  { band: "LF", label: "-1", frequency: 137500 },
  { band: "LF", label: "-1", frequency: 137500 },
  { band: "MF", label: "0", frequency: 475700 },
  { band: "1", label: "160m", frequency: 1838100 },
  { band: "3", label: "80m", frequency: 3570100 },
  { band: "5", label: "60m", frequency: 5288700 },
  { band: "7", label: "40m", frequency: 7040100 },
  { band: "10", label: "30m", frequency: 10140200 },
  { band: "14", label: "20m", frequency: 14097100 },
  { band: "18", label: "17m", frequency: 18106100 },
  { band: "21", label: "15m", frequency: 21096100 },
  { band: "24", label: "12m", frequency: 24926100 },
  { band: "28", label: "10m", frequency: 28126100 },
  { band: "50", label: "6m", frequency: 50294500 },
  { band: "70", label: "4m", frequency: 70089500 },
  { band: "144", label: "2m", frequency: 144487500 },
  { band: "432", label: "70cm", frequency: 432298500 },
  { band: "1296", label: "23cm", frequency: 1296498500 },
]


// Power lookup dictionary (ASP line 319)
const powerDict = {
  0: 0, 3: 1, 7: 2, 10: 3, 13: 4, 17: 5, 20: 6, 23: 7, 27: 8,
  30: 9, 33: 10, 37: 11, 40: 12, 43: 13, 47: 14, 50: 15,
  53: 16, 57: 17, 60: 18
};

const pwrToMw = {
  0: 0, 3: 2, 7: 5, 10: 10, 13: 20, 17: 30, 20: 50, 23: 100,
  27: 200, 30: 300, 33: 500, 37: 1000, 40: 2000, 43: 3000
};

// Default coordinates (ASP lines 16-17)
const Glatdeg = -34;
const Glondeg = -58;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { bandDict, mes, tbanda, powerDict, pwrToMw, xsnr, ori, Glatdeg, Glondeg };
}

