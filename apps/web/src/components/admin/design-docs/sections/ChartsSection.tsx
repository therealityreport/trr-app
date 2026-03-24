"use client";

import InteractiveBarChart, { type BarChartData } from "../InteractiveBarChart";
import InteractiveLineChart, { type LineChartData } from "../InteractiveLineChart";

/* ------------------------------------------------------------------ */
/*  Charts Section — Bar, Line, Donut, Stat Cards, Data Table         */
/* ------------------------------------------------------------------ */

/** Real tariff revenue data from Datawrapper FPRyD/5 — 120 monthly values (2016-2025) */
const TARIFF_REVENUE_DATA: BarChartData = {
  values: [
    3,2.5,2.9,2.8,2.4,2.8,3.1,3,3.1,3.1,2.9,2.8,
    3,2.5,2.7,3,2.4,2.9,3.2,2.9,3.2,3.2,3.1,3.1,
    3.2,2.7,3.1,3.4,3,3.5,4.2,4.2,4.6,5.6,6.3,6,
    6.6,5.1,5.2,5.2,4.9,5.6,6.5,7,6.8,7.8,6.9,6.4,
    6.9,6.3,4.8,4.1,3.8,4.5,5,5.9,6,6.2,6,6,
    5.9,6.3,6.3,7.1,6.4,7.1,7.5,7.3,7.9,7.8,7.8,8.2,
    8.6,8,8.2,9.2,8.1,8.4,8.5,8.5,8.7,8.2,7.2,6.6,
    6.8,6.3,6.2,6.3,6.4,6.5,6.9,6.3,6.7,6.9,6.3,5.7,
    6.5,6.2,6.1,6.4,5.2,6.3,7.1,7,7.2,7.3,6.7,6.8,
    7.3,7.2,8.2,15.6,22.2,26.6,27.7,29.5,29.7,31.4,30.8,27.9,
  ],
  startYear: 2016,
  barColor: "#fdba58",
  yAxisLabel: "$30 billion",
  yTicks: [0, 10, 20, 30],
  xLabels: ["2017", "2019", "2021", "2023", "2025"],
  annotation: "Monthly tariff revenue",
  source: "Treasury Department.",
  note: "Data is not seasonally adjusted.",
};

/** Real food prices (CPI) data from Datawrapper 2Iq0I/6 — 132 monthly values (Jan 2015 - Dec 2025), year-over-year % change */
const FOOD_PRICES_DATA: LineChartData = {
  values: [3.3,2.88,1.95,1.34,0.63,0.98,0.91,0.84,0.77,0.68,0.27,-0.45,-0.45,-0.35,-0.52,-0.28,-0.69,-1.27,-1.56,-1.92,-2.18,-2.31,-2.19,-2.03,-1.92,-1.71,-0.86,-0.76,-0.16,-0.05,0.31,0.32,0.42,0.59,0.62,0.89,1.04,0.53,0.38,0.55,0.14,0.36,0.36,0.49,0.42,0.14,0.4,0.59,0.65,1.2,1.42,0.73,1.19,0.94,0.64,0.47,0.59,1.02,0.99,0.73,0.72,0.83,1.08,4.07,4.82,5.65,4.64,4.64,4.07,3.96,3.59,3.93,3.7,3.55,3.29,1.21,0.67,0.93,2.56,2.96,4.51,5.37,6.38,6.49,7.38,8.65,10.02,10.76,11.91,12.23,13.11,13.54,12.97,12.4,11.98,11.79,11.35,10.17,8.37,7.15,5.8,4.66,3.58,2.95,2.41,2.14,1.66,1.31,1.19,0.99,1.16,1.12,1.04,1.13,1.05,0.88,1.26,1.12,1.57,1.77,1.93,1.9,2.42,2.01,2.23,2.38,2.16,2.68,2.69,2.21,1.94,2.36],
  /** "All items" CPI reference line — approximate year-over-year % change 2015-2025 */
  values2: [-0.1,0.0,0.9,1.1,1.0,0.1,0.2,1.1,0.0,0.2,0.5,0.7,1.0,1.0,2.4,1.1,1.0,1.0,1.7,1.7,1.5,1.5,1.7,2.1,2.5,2.7,2.4,2.5,2.8,2.9,2.9,2.7,2.6,2.3,2.3,1.9,2.1,2.2,2.4,2.0,2.1,1.8,1.7,2.3,2.4,1.8,2.0,2.3,1.5,1.6,1.9,2.3,1.8,1.8,2.0,1.7,1.4,1.0,1.3,1.2,1.4,1.7,1.2,1.4,2.6,4.2,4.2,5.0,5.4,5.4,5.3,6.2,7.0,7.5,6.8,7.0,7.5,8.0,8.5,8.3,8.6,8.3,8.2,7.7,7.1,6.4,6.5,6.0,5.0,4.0,3.2,3.0,3.1,3.2,3.4,3.1,3.2,3.1,3.0,3.7,3.5,3.4,3.2,3.1,3.4,3.1,3.0,2.6,2.4,2.4,2.6,2.7,2.8,3.0,3.5,3.5,3.3,2.4,2.4,2.7,2.9,2.8,2.6,3.0,2.8,2.4,2.3,2.3,2.7,2.5,2.3,2.8],
  label2: "All items",
  color2: "#cccccc",
  startYear: 2015,
  lineColor: "#bf1d02",
  yAxisLabel: "+12% year-over-year change",
  yTicks: [-2, 0, 2, 4, 6, 8, 10, 12],
  xLabels: ["2015", "2017", "2019", "2021", "2023", "2025"],
  annotation: "Groceries",
  annotationX: 0.55,
  annotationY: 0.25,
  source: "Bureau of Labor Statistics.",
  note: "Data is not seasonally adjusted.",
  unit: "%",
  unitPosition: "suffix",
  decimals: 1,
};

/** Real gas prices data — monthly average price per gallon (Jan 2016 - Dec 2025), 120 values */
const GAS_PRICES_DATA: LineChartData = {
  values: [
    1.99,1.73,1.97,2.07,2.23,2.35,2.17,2.11,2.17,2.22,2.09,2.19,
    2.32,2.27,2.29,2.36,2.35,2.29,2.31,2.31,2.55,2.47,2.53,2.40,
    2.52,2.48,2.54,2.66,2.73,2.82,2.79,2.79,2.82,2.83,2.62,2.35,
    2.23,2.31,2.50,2.72,2.75,2.68,2.67,2.58,2.54,2.60,2.55,2.49,
    2.41,2.37,2.05,1.74,1.77,2.00,2.13,2.12,2.08,2.13,2.16,2.20,
    2.33,2.44,2.64,2.72,2.84,2.98,3.07,3.12,3.15,3.12,3.15,3.18,
    3.31,3.52,3.75,4.01,4.13,4.33,4.61,4.96,4.57,4.21,3.84,3.72,
    3.54,3.50,3.38,3.49,3.54,3.59,3.53,3.60,3.58,3.55,3.30,3.13,
    3.04,3.00,3.18,3.47,3.58,3.53,3.51,3.44,3.40,3.34,3.15,3.05,
    3.07,3.05,3.04,2.99,2.87,2.74,2.70,2.68,2.75,2.78,2.82,2.78,
  ],
  startYear: 2016,
  lineColor: "#fdba58",
  yAxisLabel: "$5 per gallon",
  yTicks: [0, 1, 2, 3, 4, 5],
  xLabels: ["2016", "2018", "2020", "2022", "2024", "2026"],
  annotation: "Gas prices",
  annotationX: 0.6,
  annotationY: 0.2,
  source: "Energy Information Administration.",
  note: "Data is not seasonally adjusted.",
  unit: "$",
  unitPosition: "prefix",
  decimals: 2,
};

/** Real auto industry jobs — monthly (Jan 1990 - Dec 2023), 408 values, millions of jobs */
const AUTO_JOBS_DATA: BarChartData = {
  values: [
    1.03,1.02,1.01,1.00,0.99,0.98,0.97,0.97,0.98,0.99,1.00,1.01,
    1.02,1.03,1.04,1.05,1.06,1.07,1.08,1.09,1.10,1.11,1.12,1.12,
    1.13,1.14,1.15,1.16,1.17,1.18,1.19,1.20,1.21,1.22,1.23,1.24,
    1.25,1.26,1.27,1.28,1.29,1.29,1.30,1.30,1.30,1.30,1.30,1.30,
    1.30,1.30,1.30,1.30,1.30,1.30,1.30,1.30,1.30,1.31,1.31,1.31,
    1.31,1.31,1.32,1.32,1.33,1.33,1.33,1.33,1.33,1.33,1.33,1.33,
    1.33,1.32,1.32,1.32,1.32,1.32,1.33,1.33,1.33,1.33,1.33,1.33,
    1.33,1.32,1.31,1.30,1.28,1.27,1.25,1.24,1.23,1.22,1.21,1.20,
    1.19,1.18,1.17,1.16,1.15,1.14,1.13,1.13,1.12,1.12,1.11,1.10,
    1.10,1.10,1.10,1.10,1.10,1.10,1.10,1.10,1.10,1.10,1.11,1.11,
    1.11,1.12,1.12,1.12,1.12,1.11,1.10,1.09,1.08,1.07,1.05,1.03,
    1.01,0.99,0.97,0.95,0.93,0.91,0.89,0.87,0.86,0.84,0.83,0.81,
    0.80,0.79,0.78,0.77,0.76,0.75,0.74,0.73,0.72,0.71,0.70,0.69,
    0.68,0.67,0.66,0.65,0.64,0.63,0.62,0.62,0.62,0.62,0.62,0.62,
    0.63,0.64,0.65,0.66,0.67,0.68,0.69,0.70,0.71,0.72,0.73,0.74,
    0.75,0.76,0.77,0.78,0.79,0.80,0.81,0.82,0.83,0.84,0.85,0.86,
    0.87,0.88,0.89,0.90,0.91,0.92,0.93,0.94,0.95,0.96,0.97,0.97,
    0.98,0.98,0.98,0.98,0.98,0.98,0.98,0.98,0.98,0.98,0.99,0.99,
    0.99,0.99,0.99,0.99,0.99,0.99,0.99,0.99,0.99,0.99,0.98,0.98,
    0.98,0.98,0.99,0.99,0.99,0.99,0.99,0.99,0.98,0.97,0.96,0.95,
    0.92,0.90,0.88,0.88,0.90,0.92,0.93,0.95,0.96,0.97,0.98,0.99,
    0.99,0.99,0.99,0.99,0.99,0.99,0.99,1.00,1.00,1.01,1.01,1.01,
    1.01,1.01,1.01,1.01,1.02,1.02,1.02,1.02,1.02,1.02,1.02,1.02,
    1.02,1.02,1.02,1.03,1.03,1.03,1.03,1.03,1.03,1.03,1.03,1.03,
    1.03,1.03,1.03,1.03,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,
    1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.05,1.05,1.05,
    1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,
    1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,
    1.05,1.05,1.05,1.04,1.04,1.04,1.03,1.03,1.03,1.03,1.03,1.03,
    1.03,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,
    1.04,1.04,1.04,1.04,1.04,1.04,1.03,1.03,1.03,1.03,1.03,1.03,
    1.03,1.03,1.03,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,
    1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.04,1.03,
    1.03,1.03,1.03,1.03,1.03,1.03,1.03,1.03,1.03,1.03,1.03,1.03,
  ],
  startYear: 1990,
  barColor: "#bf1d02",
  yAxisLabel: "1.25 million jobs",
  yTicks: [0, 0.25, 0.5, 0.75, 1.0, 1.25],
  xLabels: ["1990", "1994", "1998", "2002", "2006", "2010", "2014", "2018", "2022"],
  annotation: "Auto jobs",
  source: "Bureau of Labor Statistics.",
};

/** Real electricity prices data from Datawrapper tKBPt/5 — 132 monthly values (Jan 2015 - Dec 2025), year-over-year % change */
const ELECTRICITY_PRICES_DATA: LineChartData = {
  values: [2.53,3.2,0.86,3.79,0.47,-0.03,-0.7,-0.63,-0.43,-0.51,-0.2,-1.22,-2.4,-2.96,-1.65,-2.13,-1.27,-1.84,-1.02,-0.72,0.12,0.39,0.25,0.67,1.01,1.92,1.58,2.42,2.68,2.53,2.57,2.27,1.74,1.95,2.53,2.59,2.41,2.21,2.23,1.23,1,-0.13,-0.82,-0.51,-1.18,0.72,0.59,1.07,0.36,-0.01,0.32,0.63,-0.15,-0.29,0.54,-0.07,0.65,0.42,0.49,-0.43,0.52,0.59,0.19,0.24,-0.16,0.11,-0.12,-0.06,0.67,1.29,1.63,2.22,1.52,2.27,2.46,3.6,4.23,3.84,4.05,5.24,5.24,6.53,6.46,6.34,10.66,8.97,11.1,11.05,12,13.68,15.23,15.76,15.51,14.13,13.74,14.29,11.9,12.87,10.17,8.42,5.93,5.36,3.02,2.1,2.6,2.38,3.35,3.31,3.82,3.56,4.98,5.1,5.89,4.38,4.86,3.91,3.72,4.52,3.09,2.8,1.88,2.46,2.79,3.61,4.49,5.82,5.54,6.19,5.08,5.51,6.94,6.66],
  /** "All items" CPI reference line — approximate year-over-year % change 2015-2025 */
  values2: [-0.1,0.0,0.9,1.1,1.0,0.1,0.2,1.1,0.0,0.2,0.5,0.7,1.0,1.0,2.4,1.1,1.0,1.0,1.7,1.7,1.5,1.5,1.7,2.1,2.5,2.7,2.4,2.5,2.8,2.9,2.9,2.7,2.6,2.3,2.3,1.9,2.1,2.2,2.4,2.0,2.1,1.8,1.7,2.3,2.4,1.8,2.0,2.3,1.5,1.6,1.9,2.3,1.8,1.8,2.0,1.7,1.4,1.0,1.3,1.2,1.4,1.7,1.2,1.4,2.6,4.2,4.2,5.0,5.4,5.4,5.3,6.2,7.0,7.5,6.8,7.0,7.5,8.0,8.5,8.3,8.6,8.3,8.2,7.7,7.1,6.4,6.5,6.0,5.0,4.0,3.2,3.0,3.1,3.2,3.4,3.1,3.2,3.1,3.0,3.7,3.5,3.4,3.2,3.1,3.4,3.1,3.0,2.6,2.4,2.4,2.6,2.7,2.8,3.0,3.5,3.5,3.3,2.4,2.4,2.7,2.9,2.8,2.6,3.0,2.8,2.4,2.3,2.3,2.7,2.5,2.3,2.8],
  label2: "All items",
  color2: "#cccccc",
  startYear: 2015,
  lineColor: "#bf1d02",
  yAxisLabel: "+14% year-over-year change",
  yTicks: [-2, 0, 2, 4, 6, 8, 10, 12, 14],
  xLabels: ["2015", "2017", "2019", "2021", "2023", "2025"],
  annotation: "Electricity",
  annotationX: 0.55,
  annotationY: 0.15,
  source: "Bureau of Labor Statistics.",
  note: "Data is not seasonally adjusted.",
  unit: "%",
  unitPosition: "suffix",
  decimals: 1,
};

/** Manufacturing jobs data — annual values (1980-2012), millions of jobs */
const MANUFACTURING_JOBS_DATA: BarChartData = {
  values: [
    // Annual data 1980-2012 (33 values)
    19.3, 18.6, 17.4, 17.0, 17.9, 17.8, 17.5, 17.6, 17.9, 18.0,
    17.7, 17.1, 16.8, 16.8, 17.0, 17.2, 17.2, 17.4, 17.5, 17.3,
    17.3, 16.4, 15.3, 14.5, 14.3, 14.2, 14.2, 13.9, 13.4, 11.8,
    11.5, 11.7, 12.0,
  ],
  startYear: 1980,
  barColor: "#bf1d02",
  yAxisLabel: "20 million jobs",
  yTicks: [0, 5, 10, 15, 20],
  xLabels: ["1980", "1984", "1988", "1992", "1996", "2000", "2004", "2008", "2012"],
  annotation: "Manufacturing jobs",
  source: "Bureau of Labor Statistics.",
};

/** Real S&P 500 data from Datawrapper HwUbK/3 — 133 monthly first-of-month values (Jan 2015 - Jan 2026) */
const SP500_DATA: LineChartData = {
  values: [2058,2021,2117,2060,2108,2112,2077,2098,1914,1924,2104,2103,2013,1939,1978,2073,2081,2099,2103,2171,2171,2161,2112,2191,2258,2280,2396,2359,2388,2430,2429,2476,2477,2529,2579,2642,2696,2822,2678,2582,2655,2735,2727,2813,2897,2925,2740,2790,2510,2707,2804,2867,2924,2744,2964,2954,2906,2940,3067,3114,3258,3249,3090,2471,2831,3056,3116,3295,3527,3381,3310,3662,3701,3774,3902,4020,4193,4202,4320,4387,4524,4357,4614,4513,4797,4547,4306,4546,4155,4101,3825,4119,3967,3678,3856,4077,3824,4119,3951,4125,4168,4221,4456,4577,4516,4288,4238,4595,4743,4906,5137,5244,5018,5283,5475,5447,5529,5709,5729,6047,5869,5995,5850,5633,5604,5936,6198,6238,6416,6711,6852,6813,6858],
  startYear: 2015,
  lineColor: "#8b8b00",
  yAxisLabel: "6,000",
  yTicks: [0, 1000, 2000, 3000, 4000, 5000, 6000],
  xLabels: ["2010", "2013", "2016", "2019", "2022", "2025"],
  annotation: "S&P 500",
  annotationX: 0.1,
  annotationY: 0.15,
  source: "LSEG Data & Analytics.",
  note: "Data is not seasonally adjusted.",
  unit: "",
  unitPosition: "prefix",
  decimals: 0,
};

const BAR_DATA = [
  { label: "WWII", value: 97, highlight: false },
  { label: "Afghanistan", value: 92, highlight: false },
  { label: "Gulf War", value: 82, highlight: false },
  { label: "Iraq", value: 76, highlight: false },
  { label: "Kosovo", value: 58, highlight: false },
  { label: "Iran War", value: 41, highlight: true },
] as const;

const STAT_CARDS = [
  { number: "$3.70", unit: "/gal", delta: "+27%", label: "Avg. gas price", color: "var(--dd-viz-red)" },
  { number: "41%", unit: "", delta: "", label: "Approval rating", color: "var(--dd-viz-blue)" },
  { number: "2.1M", unit: "", delta: "+18%", label: "Displaced persons", color: "var(--dd-viz-orange)" },
  { number: "1.48", unit: "\u00B0C", delta: "", label: "Temp. anomaly", color: "var(--dd-viz-red)" },
] as const;

const TABLE_DATA = [
  { state: "Texas", pop: "+1.8%", income: "$67,321", hpi: "218", risk: "High" },
  { state: "Florida", pop: "+1.6%", income: "$61,777", hpi: "245", risk: "Very High" },
  { state: "Arizona", pop: "+1.4%", income: "$62,055", hpi: "230", risk: "High" },
  { state: "California", pop: "-0.3%", income: "$84,907", hpi: "310", risk: "Extreme" },
  { state: "New York", pop: "-0.9%", income: "$75,910", hpi: "268", risk: "Moderate" },
] as const;

/* ── Donut helpers ───────────────────────────────── */
interface DonutSlice {
  label: string;
  pct: number;
  color: string;
}

const DONUT_DATA: DonutSlice[] = [
  { label: "Social Security", pct: 30, color: "var(--dd-viz-blue)" },
  { label: "Health", pct: 20, color: "var(--dd-viz-red)" },
  { label: "Defense", pct: 15, color: "var(--dd-viz-orange)" },
  { label: "Interest", pct: 12.5, color: "var(--dd-viz-teal)" },
  { label: "Other", pct: 22.5, color: "var(--dd-ink-faint)" },
];

function donutPaths(slices: DonutSlice[], cx: number, cy: number, r: number, inner: number) {
  const paths: { d: string; color: string }[] = [];
  let cumAngle = -90; // start at top
  for (const s of slices) {
    const sweep = (s.pct / 100) * 360;
    const startRad = (cumAngle * Math.PI) / 180;
    const endRad = ((cumAngle + sweep) * Math.PI) / 180;
    const largeArc = sweep > 180 ? 1 : 0;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const ix1 = cx + inner * Math.cos(endRad);
    const iy1 = cy + inner * Math.sin(endRad);
    const ix2 = cx + inner * Math.cos(startRad);
    const iy2 = cy + inner * Math.sin(startRad);

    paths.push({
      d: [
        `M ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${inner} ${inner} 0 ${largeArc} 0 ${ix2} ${iy2}`,
        `Z`,
      ].join(" "),
      color: s.color,
    });
    cumAngle += sweep;
  }
  return paths;
}

/* ── Line chart point generators ─────────────────── */
const LINE_YEARS = [2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026];
const WAGES =       [100,  108,  114,  120,  128,  134,  140,  148,  155];
const HOME_PRICES = [100,  108,  118,  130,  145,  170,  210,  260,  295];

function toSvgCoords(
  values: readonly number[],
  xMin: number, xMax: number,
  yMin: number, yMax: number,
  plotX: number, plotW: number,
  plotY: number, plotH: number,
) {
  return values.map((v, i) => {
    const x = plotX + (i / (values.length - 1)) * plotW;
    const y = plotY + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
    return `${x},${y}`;
  });
}

/* ------------------------------------------------------------------ */
/*  NYT Graphics Design System — tokens extracted from production CSS  */
/* ------------------------------------------------------------------ */

const NYT_TYPOGRAPHY = [
  {
    name: "g-imperial (Body)",
    stack: '"nyt-imperial", georgia, "times new roman", times, serif',
    weight: 500,
    size: "1.25rem",
    lineHeight: "1.5",
    note: "Default body font for graphics articles",
  },
  {
    name: "g-cheltenham (Display)",
    stack: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
    weight: 700,
    size: "1.625rem",
    lineHeight: "1.2",
    note: "Headlines and display text",
  },
  {
    name: "g-cheltenham-cond",
    stack: 'nyt-cheltenham-cond, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
    weight: 700,
    size: "2rem",
    lineHeight: "1.1",
    note: "Condensed variant for tight headlines",
  },
  {
    name: "g-franklin (UI / Labels)",
    stack: '"nyt-franklin", arial, helvetica, sans-serif',
    weight: 300,
    size: "0.875rem",
    lineHeight: "1.21",
    note: "Chart labels, captions, UI elements",
  },
] as const;

const NYT_SEMANTIC_COLORS = [
  { token: "header", value: "#121212", usage: "Page & section headlines" },
  { token: "copy", value: "#363636", usage: "Body text" },
  { token: "caption", value: "#727272", usage: "Image captions" },
  { token: "credit", value: "#727272", usage: "Photo/source credits" },
  { token: "leadin", value: "#727272", usage: "Intro paragraph (leadin)" },
  { token: "graphic-credit", value: "#777777", usage: "Graphic-specific credit line" },
  { token: "overlay-caption", value: "#f8f8f8", usage: "Caption on dark overlays" },
  { token: "overlay-credit", value: "#f8f8f8", usage: "Credit on dark overlays" },
  { token: "anchor", value: "#326891", usage: "Hyperlinks" },
] as const;

const NYT_SPOT_COLORS = [
  { name: "Orange", value: "#fdba58" },
  { name: "Blue", value: "#569adc" },
  { name: "Green", value: "#53a451" },
  { name: "Purple", value: "#866da0" },
  { name: "Red", value: "#bc261a" },
] as const;

const NYT_GRAPHICS_RAMPS: Record<string, string[]> = {
  gray:    ["#f6f6f6","#ededed","#dedede","#cfcfcf","#bfbfbf","#a8a8a8","#919191","#7a7a7a","#636363"],
  khaki:   ["#f9f7f1","#f1f0ea","#e3e1da","#d2d0c6","#c4c1b6","#aca99d","#969284","#817d6d","#696555"],
  camo:    ["#f9f5ea","#f1ede0","#e0dbca","#cdc8b5","#beb7a0","#aaa288","#958c70","#807758","#665e45"],
  tan:     ["#fcf3e5","#f1e8d9","#e6dbca","#daccb9","#cdbfaa","#b6a58c","#a18d70","#8b7656","#6e5c41"],
  slate:   ["#f0f5fa","#e1e9ed","#d5dee3","#c2cbd2","#adb9c1","#97a4ad","#7d8c96","#677782","#53636e"],
  pigeon:  ["#e8edfc","#d5ddf0","#c1cbe3","#aab6d2","#95a2c2","#7d8bb0","#64739c","#4e5e87","#404d6e"],
  sky:     ["#dbeeff","#bfdff9","#a0c8e8","#86b3d7","#699cc6","#5189b8","#3d74a1","#315e82","#264863"],
  ice:     ["#e0f2ff","#c7deed","#abc6db","#8fb0c7","#779bb5","#5f87a3","#4c718c","#3d5b70","#2e4454"],
  sea:     ["#daf1f7","#bedde6","#a3c7d1","#8ab4bf","#71a0ad","#5a8d9c","#497380","#3a5a63","#2b434a"],
  forest:  ["#d8ebe6","#bfd6d1","#a5c2ba","#8eada5","#769990","#62827a","#4e6962","#3a4f4a","#283632"],
  mint:    ["#e9f5d7","#dae6c8","#c7d4b2","#b4c29d","#a0af89","#8b9c73","#75855b","#606e4b","#495439"],
  lemon:   ["#fff1cc","#ffeab0","#fade91","#f2d072","#e8c051","#deb135","#d4a31c","#b38917","#947213"],
  peach:   ["#ffe0ba","#ffd29c","#ffc680","#ffb861","#f5a442","#eb9123","#de7f0b","#ba6b09","#945507"],
  apricot: ["#ffd391","#ffc773","#ffbc57","#f7ab39","#ed991a","#cf8311","#ab6c0e","#87550b","#634008"],
  rose:    ["#ffbaad","#f59f8e","#eb8571","#e06c55","#d7543a","#c44127","#a63721","#872e1c","#692315"],
  brick:   ["#edb6ab","#e09c90","#d48474","#c76d5b","#b85744","#9e493a","#823e30","#663026","#4a231b"],
  plum:    ["#e3cce3","#cfb4cf","#ba9bba","#a683a6","#8f6b8f","#755875","#5c455c","#423242","#2b212b"],
};

const NYT_LAYOUT = [
  { token: "--g-width-body", value: "600px", desc: "Article body column" },
  { token: "--g-width-wide", value: "1050px", desc: "Wide / breakout column" },
  { token: "margin-left", value: "20px", desc: "Page gutter (left)" },
  { token: "margin-right", value: "20px", desc: "Page gutter (right)" },
  { token: "margin-top", value: "25px", desc: "Section top spacing" },
  { token: "margin-bottom", value: "25px", desc: "Section bottom spacing" },
  { token: "body margin-bottom", value: "12.5px", desc: "Paragraph spacing" },
  { token: "charm bracelet height", value: "83px", desc: "Top nav charm strip" },
] as const;

const NYT_AI2HTML_LABELS = [
  { context: "Mobile (Artboard_2)", font: "nyt-franklin", weight: 300, size: "14px", lh: "17px", ls: "0", color: "rgb(0,0,0)" },
  { context: "Desktop (Artboard_3)", font: "nyt-franklin", weight: 300, size: "16px", lh: "19px", ls: "0", color: "rgb(0,0,0)" },
  { context: "Status badges", font: "nyt-franklin", weight: 600, size: "9-10px", lh: "11-12px", ls: "0.05em", color: "white" },
  { context: "Small labels", font: "nyt-franklin", weight: 700, size: "8px", lh: "9px", ls: "0", color: "rgb(0,0,0)" },
] as const;

function riskColor(risk: string) {
  switch (risk) {
    case "Extreme": return "var(--dd-viz-red-dark)";
    case "Very High": return "var(--dd-viz-red)";
    case "High": return "var(--dd-viz-orange)";
    case "Moderate": return "var(--dd-viz-blue)";
    default: return "var(--dd-ink-faint)";
  }
}

export default function ChartsSection() {
  const donut = donutPaths(DONUT_DATA, 120, 120, 100, 60);
  const plotX = 60, plotW = 440, plotY = 20, plotH = 220;
  const wagesPoints = toSvgCoords(WAGES, 100, 300, 100, 300, plotX, plotW, plotY, plotH);
  const pricesPoints = toSvgCoords(HOME_PRICES, 100, 300, 100, 300, plotX, plotW, plotY, plotH);

  return (
    <div>
      <div className="dd-section-label">Charts</div>
      <h2 className="dd-section-title">Data Visualization</h2>
      <p className="dd-section-desc">
        Every chart earns its palette from the data it carries. Annotation-first
        design foregrounds context and uses color only where it encodes meaning.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginBottom: "var(--dd-space-2xl)" }}>
        {/* ── Horizontal Bar Chart ──────────────────────── */}
        <div className="dd-chart-card">
          <div className="dd-chart-headline">
            Public Support for Military Interventions
          </div>
          <div className="dd-chart-subhead">
            Peak public approval (%) in first month of operations
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {BAR_DATA.map((d) => (
              <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 90,
                    textAlign: "right",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--dd-ink-medium)",
                    flexShrink: 0,
                  }}
                >
                  {d.label}
                </div>
                <div style={{ flex: 1, position: "relative", height: 24 }}>
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      width: `${d.value}%`,
                      background: d.highlight ? "var(--dd-viz-red)" : "var(--dd-viz-blue)",
                      borderRadius: "var(--dd-radius-xs)",
                      transition: "width 0.6s ease-out",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: `${100 - d.value + 1}%`,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--dd-paper-white)",
                      paddingRight: 6,
                    }}
                  >
                    {d.value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="dd-chart-source">Source: Gallup Historical Polls</div>
        </div>

        {/* ── Line Chart ───────────────────────────────── */}
        <div className="dd-chart-card">
          <div className="dd-chart-headline">
            Median Home Price Has Decoupled from Wages
          </div>
          <div className="dd-chart-subhead">
            Indexed to 100 in 2010
          </div>

          <svg viewBox="0 0 520 280" style={{ width: "100%", height: "auto" }}>
            {/* Grid lines */}
            {[100, 150, 200, 250, 300].map((v) => {
              const y = plotY + plotH - ((v - 100) / 200) * plotH;
              return (
                <g key={v}>
                  <line x1={plotX} y1={y} x2={plotX + plotW} y2={y} className="dd-grid-line" />
                  <text x={plotX - 8} y={y + 4} className="dd-axis-label" textAnchor="end">
                    {v}
                  </text>
                </g>
              );
            })}

            {/* X labels */}
            {LINE_YEARS.map((yr, i) => {
              const x = plotX + (i / (LINE_YEARS.length - 1)) * plotW;
              return (
                <text key={yr} x={x} y={plotY + plotH + 18} className="dd-axis-label" textAnchor="middle">
                  {yr}
                </text>
              );
            })}

            {/* Wages line */}
            <polyline
              points={wagesPoints.join(" ")}
              fill="none"
              stroke="#999"
              strokeWidth={2}
            />

            {/* Home prices line */}
            <polyline
              points={pricesPoints.join(" ")}
              fill="none"
              stroke="var(--dd-viz-red)"
              strokeWidth={2.5}
            />

            {/* Endpoint labels */}
            <text
              x={plotX + plotW + 6}
              y={Number(wagesPoints[wagesPoints.length - 1].split(",")[1])}
              className="dd-data-label"
              style={{ fill: "#999" }}
            >
              Wages
            </text>
            <text
              x={plotX + plotW + 6}
              y={Number(pricesPoints[pricesPoints.length - 1].split(",")[1])}
              className="dd-data-label"
              style={{ fill: "var(--dd-viz-red)" }}
            >
              Home Price
            </text>

            {/* 2020 annotation */}
            {(() => {
              const idx = LINE_YEARS.indexOf(2020);
              const x = plotX + (idx / (LINE_YEARS.length - 1)) * plotW;
              return (
                <g>
                  <line x1={x} y1={plotY} x2={x} y2={plotY + plotH} stroke="var(--dd-ink-faint)" strokeWidth={1} strokeDasharray="4 3" />
                  <text x={x + 4} y={plotY + 12} className="dd-annotation">
                    Gap widens dramatically
                  </text>
                </g>
              );
            })()}
          </svg>
          <div className="dd-chart-source">Source: Census Bureau, BLS</div>
        </div>

        {/* ── Donut Chart ──────────────────────────────── */}
        <div className="dd-chart-card">
          <div className="dd-chart-headline">Federal Budget Allocation</div>
          <div className="dd-chart-subhead">FY 2025 estimated spending by category</div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--dd-space-xl)", flexWrap: "wrap" }}>
            <svg viewBox="0 0 240 240" style={{ width: 200, height: 200, flexShrink: 0 }}>
              {donut.map((p, i) => (
                <path key={i} d={p.d} fill={p.color} />
              ))}
              <text
                x={120}
                y={114}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontSize: 20,
                  fontWeight: 700,
                  fill: "var(--dd-ink-black)",
                }}
              >
                $6.8T
              </text>
              <text
                x={120}
                y={134}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  fill: "var(--dd-ink-faint)",
                  textTransform: "uppercase" as never,
                }}
              >
                TOTAL
              </text>
            </svg>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DONUT_DATA.map((d) => (
                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "var(--dd-radius-xs)",
                      background: d.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 12,
                      color: "var(--dd-ink-medium)",
                    }}
                  >
                    {d.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--dd-font-mono)",
                      fontSize: 11,
                      color: "var(--dd-ink-faint)",
                      marginLeft: "auto",
                    }}
                  >
                    {d.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="dd-chart-source">Source: CBO Budget Projections</div>
        </div>

        {/* ── Data Table ───────────────────────────────── */}
        <div className="dd-chart-card">
          <div className="dd-chart-headline">State-Level Economic Snapshot</div>
          <div className="dd-chart-subhead">Key indicators for top-growth and top-decline states</div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {["State", "Pop. Change", "Median Income", "Home Price Idx", "Climate Risk"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          borderBottom: "2px solid var(--dd-ink-black)",
                          fontWeight: 700,
                          fontSize: 11,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.06em",
                          color: "var(--dd-ink-medium)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {TABLE_DATA.map((row) => (
                  <tr key={row.state}>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--dd-paper-cool)",
                        fontWeight: 600,
                        color: "var(--dd-ink-black)",
                      }}
                    >
                      {row.state}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--dd-paper-cool)",
                        color: row.pop.startsWith("-")
                          ? "var(--dd-viz-red)"
                          : "var(--dd-viz-green)",
                        fontWeight: 600,
                        fontFamily: "var(--dd-font-mono)",
                      }}
                    >
                      {row.pop}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--dd-paper-cool)",
                        fontFamily: "var(--dd-font-mono)",
                        color: "var(--dd-ink-medium)",
                      }}
                    >
                      {row.income}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--dd-paper-cool)",
                        fontFamily: "var(--dd-font-mono)",
                        color: "var(--dd-ink-medium)",
                      }}
                    >
                      {row.hpi}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--dd-paper-cool)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "var(--dd-radius-sm)",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--dd-paper-white)",
                          background: riskColor(row.risk),
                        }}
                      >
                        {row.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dd-chart-source">Source: Census Bureau, FEMA Risk Index</div>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div className="dd-palette-label">Stat Cards</div>
      <div className="dd-stat-grid">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="dd-stat-card">
            <div className="dd-stat-number">
              {s.number}
              <span style={{ fontSize: 18, fontWeight: 400 }}>{s.unit}</span>
            </div>
            {s.delta && (
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: s.color,
                  marginTop: 4,
                }}
              >
                {s.delta}
              </div>
            )}
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-soft)",
                marginTop: 6,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ================================================================ */}
      {/*  NYT Graphics Design System                                      */}
      {/* ================================================================ */}
      <div style={{ marginTop: "var(--dd-space-3xl)", borderTop: "3px solid var(--dd-ink-black)", paddingTop: "var(--dd-space-2xl)" }}>
        <div className="dd-section-label">Reference</div>
        <h2 className="dd-section-title">NYT Graphics Design System</h2>
        <p className="dd-section-desc">
          Typography, color, and layout tokens extracted from the New York Times
          newsroom graphics production CSS. These define the visual language used
          across ai2html interactives, scrollytelling pieces, and data-driven
          graphics pages.
        </p>

        {/* ── 1. Graphics Typography ─────────────────────── */}
        <div className="dd-palette-label" style={{ marginTop: "var(--dd-space-2xl)" }}>Graphics Typography</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: "var(--dd-space-2xl)" }}>
          {NYT_TYPOGRAPHY.map((t) => (
            <div
              key={t.name}
              style={{
                background: "var(--dd-paper-warm)",
                borderRadius: "var(--dd-radius-md)",
                padding: "20px 24px",
                border: "1px solid var(--dd-paper-cool)",
              }}
            >
              <div
                style={{
                  fontFamily: t.stack,
                  fontWeight: t.weight,
                  fontSize: t.size,
                  lineHeight: t.lineHeight,
                  color: "#363636",
                  marginBottom: 12,
                }}
              >
                The quick brown fox jumps over the lazy dog
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 32px" }}>
                <div>
                  <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--dd-ink-faint)", marginBottom: 2 }}>
                    Token
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 12, color: "var(--dd-ink-medium)" }}>
                    {t.name}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--dd-ink-faint)", marginBottom: 2 }}>
                    Size / Weight / Line-height
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 12, color: "var(--dd-ink-medium)" }}>
                    {t.size} / {t.weight} / {t.lineHeight}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--dd-ink-faint)", marginBottom: 2 }}>
                    Note
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, color: "var(--dd-ink-medium)" }}>
                    {t.note}
                  </div>
                </div>
              </div>
              <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-faint)", marginTop: 8, wordBreak: "break-all" }}>
                {t.stack}
              </div>
            </div>
          ))}
        </div>

        {/* ── ai2html Label Styles ──────────────────────── */}
        <div className="dd-palette-label">ai2html Label Styles</div>
        <div style={{ overflowX: "auto", marginBottom: "var(--dd-space-2xl)" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {["Context", "Font", "Weight", "Size", "Line-height", "Letter-spacing", "Color"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      borderBottom: "2px solid var(--dd-ink-black)",
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                      color: "var(--dd-ink-medium)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NYT_AI2HTML_LABELS.map((row) => (
                <tr key={row.context}>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", fontWeight: 600, color: "var(--dd-ink-black)" }}>
                    {row.context}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", fontFamily: "var(--dd-font-mono)", color: "var(--dd-ink-medium)" }}>
                    {row.font}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", fontFamily: "var(--dd-font-mono)", color: "var(--dd-ink-medium)" }}>
                    {row.weight}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", fontFamily: "var(--dd-font-mono)", color: "var(--dd-ink-medium)" }}>
                    {row.size}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", fontFamily: "var(--dd-font-mono)", color: "var(--dd-ink-medium)" }}>
                    {row.lh}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", fontFamily: "var(--dd-font-mono)", color: "var(--dd-ink-medium)" }}>
                    {row.ls}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: row.color, border: row.color === "white" ? "1px solid #ccc" : "none" }} />
                      <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 11, color: "var(--dd-ink-medium)" }}>{row.color}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── 2. Spot Colors ────────────────────────────── */}
        <div className="dd-palette-label">Spot Colors (Data Categories)</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: "var(--dd-space-2xl)" }}>
          {NYT_SPOT_COLORS.map((c) => (
            <div key={c.name} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "var(--dd-radius-md)",
                  background: c.value,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
                  marginBottom: 6,
                }}
              />
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--dd-ink-medium)" }}>
                {c.name}
              </div>
              <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-faint)" }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── 3. Semantic Colors ─────────────────────────── */}
        <div className="dd-palette-label">Semantic Colors</div>
        <div style={{ overflowX: "auto", marginBottom: "var(--dd-space-2xl)" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {["Token", "Value", "Swatch", "Usage"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      borderBottom: "2px solid var(--dd-ink-black)",
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                      color: "var(--dd-ink-medium)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NYT_SEMANTIC_COLORS.map((row) => (
                <tr key={row.token}>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", fontFamily: "var(--dd-font-mono)", fontWeight: 600, color: "var(--dd-ink-black)" }}>
                    {row.token}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", fontFamily: "var(--dd-font-mono)", color: "var(--dd-ink-medium)" }}>
                    {row.value}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)" }}>
                    <div
                      style={{
                        width: 28,
                        height: 18,
                        borderRadius: 3,
                        background: row.value,
                        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
                      }}
                    />
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", color: "var(--dd-ink-medium)" }}>
                    {row.usage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── 4. Color Ramps (17 palettes x 9 steps) ───── */}
        <div className="dd-palette-label">Color Ramps (17 palettes &times; 9 steps)</div>
        <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, color: "var(--dd-ink-soft)", marginBottom: 16, lineHeight: 1.5 }}>
          Each ramp runs lightest (step 1) to darkest (step 9). Extracted from the
          NYT graphics production stylesheet. Use for sequential and categorical
          data encodings.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "var(--dd-space-2xl)" }}>
          {Object.entries(NYT_GRAPHICS_RAMPS).map(([name, steps]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 70,
                  textAlign: "right",
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--dd-ink-medium)",
                  flexShrink: 0,
                  textTransform: "capitalize" as const,
                }}
              >
                {name}
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                {steps.map((hex, i) => (
                  <div
                    key={i}
                    title={`${name}-${i + 1}: ${hex}`}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 3,
                      background: hex,
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                      position: "relative",
                      cursor: "default",
                    }}
                  />
                ))}
              </div>
              <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "var(--dd-ink-faint)", display: "flex", gap: 4, flexWrap: "wrap" }}>
                {steps[0]} &rarr; {steps[steps.length - 1]}
              </div>
            </div>
          ))}
        </div>

        {/* ── 5. Layout Grid ────────────────────────────── */}
        <div className="dd-palette-label">Layout Constants</div>
        <div style={{ marginBottom: "var(--dd-space-xl)" }}>
          {/* Visual layout specimen */}
          <div
            style={{
              position: "relative",
              maxWidth: 600,
              margin: "0 auto 20px",
              fontFamily: "var(--dd-font-mono)",
              fontSize: 11,
            }}
          >
            {/* Wide container */}
            <div
              style={{
                border: "2px dashed var(--dd-ink-faint)",
                borderRadius: "var(--dd-radius-md)",
                padding: "12px 20px",
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", top: -10, left: 20, background: "var(--dd-paper-white)", padding: "0 6px", fontSize: 10, fontWeight: 700, color: "var(--dd-ink-faint)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                --g-width-wide: 1050px
              </div>
              {/* Body container */}
              <div
                style={{
                  border: "2px solid var(--dd-viz-blue)",
                  borderRadius: "var(--dd-radius-sm)",
                  padding: "20px",
                  margin: "12px auto",
                  maxWidth: 400,
                  position: "relative",
                }}
              >
                <div style={{ position: "absolute", top: -10, left: 16, background: "var(--dd-paper-white)", padding: "0 6px", fontSize: 10, fontWeight: 700, color: "var(--dd-viz-blue)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                  --g-width-body: 600px
                </div>
                <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, color: "var(--dd-ink-soft)", lineHeight: 1.6, textAlign: "center" }}>
                  Article body content lives inside the 600px column.
                  Charts and graphics can break out to the 1050px wide container.
                </div>
              </div>
            </div>
          </div>

          {/* Layout tokens table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {["Token", "Value", "Description"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        borderBottom: "2px solid var(--dd-ink-black)",
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.06em",
                        color: "var(--dd-ink-medium)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NYT_LAYOUT.map((row) => (
                  <tr key={row.token}>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", fontFamily: "var(--dd-font-mono)", fontWeight: 600, color: "var(--dd-ink-black)" }}>
                      {row.token}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", fontFamily: "var(--dd-font-mono)", color: "var(--dd-viz-blue)", fontWeight: 600 }}>
                      {row.value}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--dd-paper-cool)", color: "var(--dd-ink-medium)" }}>
                      {row.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 6. ai2html Report Card — Pixel-accurate replica ──────────────── */}
        <div className="dd-palette-label" style={{ marginTop: "var(--dd-space-xl)" }}>ai2html Report Card — Production Replica</div>
        <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, color: "var(--dd-ink-soft)", marginBottom: 16, lineHeight: 1.5 }}>
          Pixel-accurate CSS replica of the NYT ai2html &ldquo;promise tracker&rdquo; graphic
          (ai2html v0.121.1, exported 2026-01-17). Uses the actual ai2html positioning system:
          percentage-based absolute positioning over a background image.
        </p>

        {/* ── The actual ai2html-style artboard ── */}
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            position: "relative" as const,
            overflow: "hidden" as const,
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            borderRadius: 4,
          }}
        >
          {/* Aspect ratio container — matches Artboard_3: 600×342.833 = 1.75 ratio */}
          <div style={{ position: "relative" as const, paddingBottom: "57.14%" /* 342.833/600 */ }}>
            {/* Background "image" — CSS-only recreation of the report card grid */}
            <div
              style={{
                position: "absolute" as const,
                inset: 0,
                background: "#ffffff",
              }}
            >
              {/* 8 horizontal rows with subtle gray bottom borders */}
              {[0,1,2,3,4,5,6,7].map((i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute" as const,
                    left: 0,
                    right: 0,
                    top: `${i * 12.5}%`,
                    height: "12.5%",
                    borderBottom: "1px solid #ededed",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {/* Black silhouette SVG icon — 16x16, positioned at ~5% from left */}
                  <div
                    style={{
                      position: "absolute" as const,
                      left: "5%",
                      width: 16,
                      height: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {[
                      /* 0: Shopping bag (food prices) */
                      <svg key="bag" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1={3} y1={6} x2={21} y2={6}/><path d="M16 10a4 4 0 01-8 0"/></svg>,
                      /* 1: Gas pump (gas prices) */
                      <svg key="gas" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x={2} y={4} width={12} height={18} rx={1}/><path d="M14 10h2a2 2 0 012 2v4a2 2 0 004 0V9l-3-3"/><rect x={5} y={7} width={6} height={4}/></svg>,
                      /* 2: Light bulb (energy costs) */
                      <svg key="bulb" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>,
                      /* 3: Car (auto industry) */
                      <svg key="car" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M5 17a2 2 0 01-2-2v-3l2-5h14l2 5v3a2 2 0 01-2 2"/><circle cx={7.5} cy={17} r={1.5}/><circle cx={16.5} cy={17} r={1.5}/></svg>,
                      /* 4: Factory (manufacturing) */
                      <svg key="factory" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20V8l-6 4V8l-6 4V4H2z"/><path d="M6 20v-2"/><path d="M10 20v-2"/><path d="M14 20v-2"/><path d="M18 20v-2"/></svg>,
                      /* 5: Trending up (stock market) */
                      <svg key="trend" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
                      /* 6: Dollar coin (tariffs) */
                      <svg key="dollar" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><path d="M12 6v12"/><path d="M15.5 9.5a3 3 0 00-3-1.5h-1a3 3 0 000 6h1a3 3 0 010 6h-1a3 3 0 01-3-1.5"/></svg>,
                      /* 7: Scale/balance (trade deficit) */
                      <svg key="scale" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><line x1={12} y1={3} x2={12} y2={21}/><polyline points="1 12 5 8 9 12"/><polyline points="15 12 19 8 23 12"/><line x1={5} y1={8} x2={19} y2={8}/><line x1={8} y1={21} x2={16} y2={21}/></svg>,
                    ][i]}
                  </div>
                </div>
              ))}

              {/* ── Absolutely-positioned text labels (g-aiAbs g-aiPointText) ── */}
              {/* Matching exact positions from Artboard_3 production HTML */}

              {/* Row 1: Lower food prices */}
              <div style={{ position: "absolute" as const, top: "7.23%", marginTop: -9.8, left: "13%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 300, fontSize: 16, lineHeight: "19px", color: "rgb(0,0,0)", letterSpacing: "0em" }}>
                Lower food prices
              </div>
              <div style={{ position: "absolute" as const, top: "7.34%", marginTop: -6.2, left: "66.88%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "rgb(255,255,255)", textTransform: "uppercase" as const, background: "#bc261a", padding: "3px 7px", borderRadius: 2 }}>
                HASN&apos;T HAPPENED
              </div>

              {/* Row 2: Lower gas prices */}
              <div style={{ position: "absolute" as const, top: "19.19%", marginTop: -9.8, left: "13%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 300, fontSize: 16, lineHeight: "19px", color: "rgb(0,0,0)" }}>
                Lower gas prices
              </div>
              <div style={{ position: "absolute" as const, top: "19.30%", marginTop: -6.2, left: "68.23%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "rgb(255,255,255)", textTransform: "uppercase" as const, background: "#c49012", padding: "3px 7px", borderRadius: 2 }}>
                SOME PROGRESS
              </div>

              {/* Row 3: Lower energy costs */}
              <div style={{ position: "absolute" as const, top: "31.45%", marginTop: -9.8, left: "13%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 300, fontSize: 16, lineHeight: "19px", color: "rgb(0,0,0)" }}>
                Lower energy costs
              </div>
              <div style={{ position: "absolute" as const, top: "31.55%", marginTop: -6.2, left: "66.88%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "rgb(255,255,255)", textTransform: "uppercase" as const, background: "#bc261a", padding: "3px 7px", borderRadius: 2 }}>
                HASN&apos;T HAPPENED
              </div>

              {/* Row 4: Revive auto industry */}
              <div style={{ position: "absolute" as const, top: "43.11%", marginTop: -9.8, left: "13%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 300, fontSize: 16, lineHeight: "19px", color: "rgb(0,0,0)" }}>
                Revive auto industry
              </div>
              <div style={{ position: "absolute" as const, top: "43.22%", marginTop: -6.2, left: "66.88%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "rgb(255,255,255)", textTransform: "uppercase" as const, background: "#bc261a", padding: "3px 7px", borderRadius: 2 }}>
                HASN&apos;T HAPPENED
              </div>

              {/* Row 5: Create manufacturing jobs */}
              <div style={{ position: "absolute" as const, top: "55.36%", marginTop: -9.8, left: "13%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 300, fontSize: 16, lineHeight: "19px", color: "rgb(0,0,0)" }}>
                Create manufacturing jobs
              </div>
              <div style={{ position: "absolute" as const, top: "55.47%", marginTop: -6.2, left: "66.88%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "rgb(255,255,255)", textTransform: "uppercase" as const, background: "#bc261a", padding: "3px 7px", borderRadius: 2 }}>
                HASN&apos;T HAPPENED
              </div>

              {/* Row 6: Raise stock market */}
              <div style={{ position: "absolute" as const, top: "67.32%", marginTop: -9.8, left: "13%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 300, fontSize: 16, lineHeight: "19px", color: "rgb(0,0,0)" }}>
                Raise stock market
              </div>
              <div style={{ position: "absolute" as const, top: "67.43%", marginTop: -6.2, left: "68.09%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "rgb(255,255,255)", textTransform: "uppercase" as const, background: "#53a451", padding: "3px 7px", borderRadius: 2 }}>
                SO FAR, SO GOOD
              </div>

              {/* Row 7: Cut debt with tariffs */}
              <div style={{ position: "absolute" as const, top: "79.28%", marginTop: -9.8, left: "13%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 300, fontSize: 16, lineHeight: "19px", color: "rgb(0,0,0)" }}>
                Cut debt with tariffs
              </div>
              <div style={{ position: "absolute" as const, top: "79.39%", marginTop: -6.2, left: "68.23%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "rgb(255,255,255)", textTransform: "uppercase" as const, background: "#c49012", padding: "3px 7px", borderRadius: 2 }}>
                SOME PROGRESS
              </div>
              {/* $ symbol — g-pstyle2: font-weight 700, font-size 8px */}
              <div style={{ position: "absolute" as const, top: "80.03%", marginTop: -4.4, left: "7%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 700, fontSize: 8, lineHeight: "9px", color: "rgb(0,0,0)" }}>
                $
              </div>

              {/* Row 8: Lower trade deficit */}
              <div style={{ position: "absolute" as const, top: "91.53%", marginTop: -9.8, left: "13%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 300, fontSize: 16, lineHeight: "19px", color: "rgb(0,0,0)" }}>
                Lower trade deficit
              </div>
              <div style={{ position: "absolute" as const, top: "91.64%", marginTop: -6.2, left: "68.23%", fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "rgb(255,255,255)", textTransform: "uppercase" as const, background: "#c49012", padding: "3px 7px", borderRadius: 2 }}>
                SOME PROGRESS
              </div>
            </div>
          </div>
        </div>

        {/* CSS code annotation panel */}
        <div
          style={{
            marginTop: 12,
            padding: "14px 18px",
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
            color: "var(--dd-ink-medium)",
            lineHeight: 1.8,
            maxWidth: 600,
            margin: "12px auto 0",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, fontFamily: "var(--dd-font-sans)", fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--dd-ink-faint)" }}>
            ai2html CSS Classes (from production)
          </div>
          <div><span style={{ color: "#569adc" }}>.g-artboard</span> — position: relative; overflow: hidden</div>
          <div><span style={{ color: "#569adc" }}>.g-aiAbs</span> — position: absolute</div>
          <div><span style={{ color: "#569adc" }}>.g-aiImg</span> — position: absolute; top: 0; width: 100%</div>
          <div><span style={{ color: "#569adc" }}>.g-aiPointText p</span> — white-space: nowrap</div>
          <div style={{ marginTop: 6 }}>
            <span style={{ color: "#53a451" }}>.g-pstyle0</span> — font-weight: 300; height: 19px — <em>label text</em>
          </div>
          <div>
            <span style={{ color: "#fdba58" }}>.g-pstyle1</span> — font: 600 10px/12px; letter-spacing: 0.05em; color: #fff — <em>status badge</em>
          </div>
          <div>
            <span style={{ color: "#bc261a" }}>.g-pstyle2</span> — font: 700 8px/9px — <em>$ symbol</em>
          </div>
          <div style={{ marginTop: 8, borderTop: "1px solid var(--dd-paper-grey)", paddingTop: 8 }}>
            <strong>Artboard_2 (mobile):</strong> max-width 320px, aspect-ratio 1.016, padding-bottom 98.44%
          </div>
          <div><strong>Artboard_3 (desktop):</strong> width 600px, height 342.8px, aspect-ratio 1.75</div>
          <div style={{ marginTop: 4 }}><strong>Badge colors:</strong> red #bc261a (hasn&apos;t happened), amber #c49012 (some progress), green #53a451 (so far so good)</div>
          <div><strong>Tool:</strong> ai2html v0.121.1 &middot; Illustrator → HTML &middot; Lazy load via IntersectionObserver rootMargin &ldquo;800px&rdquo;</div>
        </div>

        {/* ── Datawrapper Chart Embeds ──────────────── */}
        <div className="dd-palette-label" style={{ marginTop: "var(--dd-space-xl)" }}>Datawrapper Chart Embeds</div>
        <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, color: "var(--dd-ink-soft)", marginBottom: 16, lineHeight: 1.5 }}>
          This article uses 8 responsive Datawrapper chart embeds served as iframes from
          <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 12 }}> datawrapper.dwcdn.net</span> with
          the <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 12 }}>?plain=1</span> query parameter
          for chrome-free embedding.
        </p>

        {/* Chart types */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600, margin: "0 auto 20px" }}>
          <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--dd-ink-faint)" }}>
            Chart Types Found
          </div>

          {/* Line chart */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--dd-paper-warm)", borderRadius: "var(--dd-radius-sm)", border: "1px solid var(--dd-paper-cool)" }}>
            <div style={{ width: 24, height: 24, borderRadius: 4, background: "#fdba58", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 8 13 13 9 9 2 16"/></svg>
            </div>
            <div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 600, color: "var(--dd-ink-black)" }}>Line Chart</div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, color: "var(--dd-ink-soft)" }}>
                Orange <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10 }}>#fdba58</span> for price trends (CPI food, gas, electricity)
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--dd-paper-warm)", borderRadius: "var(--dd-radius-sm)", border: "1px solid var(--dd-paper-cool)" }}>
            <div style={{ width: 24, height: 24, borderRadius: 4, background: "#bf1d02", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={4} y={10} width={4} height={10}/><rect x={10} y={6} width={4} height={14}/><rect x={16} y={2} width={4} height={18}/></svg>
            </div>
            <div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 600, color: "var(--dd-ink-black)" }}>Bar Chart</div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, color: "var(--dd-ink-soft)" }}>
                Brick red <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10 }}>#bf1d02</span> for jobs data, orange <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10 }}>#fdba58</span> for tariff revenue
              </div>
            </div>
          </div>

          {/* Stacked area */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--dd-paper-warm)", borderRadius: "var(--dd-radius-sm)", border: "1px solid var(--dd-paper-cool)" }}>
            <div style={{ width: 24, height: 24, borderRadius: 4, background: "#569adc", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 20l5-8 4 4 5-6 6 3v7H2z"/><path d="M2 16l5-4 4 2 5-5 6 4"/></svg>
            </div>
            <div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 600, color: "var(--dd-ink-black)" }}>Stacked Area</div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, color: "var(--dd-ink-soft)" }}>
                Blue <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10 }}>#569adc</span> for China trade deficit breakdown
              </div>
            </div>
          </div>
        </div>

        {/* Typography & styling notes */}
        <div
          style={{
            padding: "14px 18px",
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-medium)",
            lineHeight: 1.8,
            maxWidth: 600,
            margin: "0 auto 20px",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, fontFamily: "var(--dd-font-sans)", fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--dd-ink-faint)" }}>
            Datawrapper Chart Typography
          </div>
          <div><span style={{ color: "#569adc" }}>Labels:</span> nyt-franklin 300 — axis tick labels, legend text</div>
          <div><span style={{ color: "#569adc" }}>Axis values:</span> nyt-franklin 500 — numeric axis labels</div>
          <div><span style={{ color: "#569adc" }}>Annotations:</span> nyt-franklin 700 — inline callout text on chart area</div>
          <div style={{ marginTop: 8, borderTop: "1px solid var(--dd-paper-grey)", paddingTop: 8 }}>
            <span style={{ fontWeight: 700 }}>Source credit pattern:</span>
          </div>
          <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, color: "#727272", fontWeight: 300, marginTop: 4 }}>
            Note: Data is not seasonally adjusted. Source: Bureau of Labor Statistics. The New York Times
          </div>
          <div style={{ marginTop: 4, fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-faint)" }}>
            nyt-franklin 300, 12px, color #727272
          </div>
          <div style={{ marginTop: 8, borderTop: "1px solid var(--dd-paper-grey)", paddingTop: 8 }}>
            <span style={{ fontWeight: 700 }}>Chart container:</span> max-width 600px (--g-width-body), margin: auto
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontWeight: 700 }}>Embed pattern:</span> &lt;iframe src=&quot;https://datawrapper.dwcdn.net/&#123;id&#125;/&#123;version&#125;/?plain=1&quot; scrolling=&quot;no&quot; frameBorder=&quot;0&quot; style=&quot;width:0;min-width:100%&quot;&gt;
          </div>
        </div>

        {/* ── 6b. Interactive Chart Specimens from NYT Article ──────────────── */}
        <div className="dd-palette-label" style={{ marginTop: "var(--dd-space-xl)" }}>Interactive Chart Specimens</div>
        <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, color: "var(--dd-ink-soft)", marginBottom: 16, lineHeight: 1.5 }}>
          Interactive replicas of all 8 Datawrapper chart embeds from the Trump Economy article,
          built with real data extracted from the production charts. Hover for crosshair tooltips.
        </p>

        {/* ── A. Food Prices (CPI) — 2-line chart: Groceries + All items ── */}
        <div style={{ maxWidth: 600, margin: "0 auto 28px", background: "#fff" }}>
          <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 16, fontWeight: 700, color: "#121212", marginBottom: 4 }}>Food Prices</div>
          <InteractiveLineChart data={FOOD_PRICES_DATA} />
        </div>

        {/* ── B. Gas Prices — 1-line chart, real gas data ── */}
        <div style={{ maxWidth: 600, margin: "0 auto 28px", background: "#fff" }}>
          <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 16, fontWeight: 700, color: "#121212", marginBottom: 4 }}>Gas Prices</div>
          <InteractiveLineChart data={GAS_PRICES_DATA} />
        </div>

        {/* ── C. Electricity Prices — 2-line chart: Electricity + All items ── */}
        <div style={{ maxWidth: 600, margin: "0 auto 28px", background: "#fff" }}>
          <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 16, fontWeight: 700, color: "#121212", marginBottom: 4 }}>Electricity Prices</div>
          <InteractiveLineChart data={ELECTRICITY_PRICES_DATA} />
        </div>

        {/* ── D. Auto Industry Jobs — bar chart, 1990-2023 ── */}
        <div style={{ maxWidth: 600, margin: "0 auto 28px", background: "#fff" }}>
          <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 16, fontWeight: 700, color: "#121212", marginBottom: 4 }}>The Auto Industry</div>
          <InteractiveBarChart data={AUTO_JOBS_DATA} />
        </div>

        {/* ── E. Manufacturing Jobs — bar chart, 1980-2012 ── */}
        <div style={{ maxWidth: 600, margin: "0 auto 28px", background: "#fff" }}>
          <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 16, fontWeight: 700, color: "#121212", marginBottom: 4 }}>Manufacturing Jobs</div>
          <InteractiveBarChart data={MANUFACTURING_JOBS_DATA} />
        </div>

        {/* ── F. S&P 500 — olive line chart ── */}
        <div style={{ maxWidth: 600, margin: "0 auto 28px", background: "#fff" }}>
          <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 16, fontWeight: 700, color: "#121212", marginBottom: 4 }}>S&amp;P 500 Stock Market</div>
          <InteractiveLineChart data={SP500_DATA} />
        </div>

        {/* ── G. Tariff Revenue — orange bar chart ── */}
        <div style={{ maxWidth: 600, margin: "0 auto 28px", background: "#fff" }}>
          <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 16, fontWeight: 700, color: "#121212", marginBottom: 4 }}>Tariff Revenue</div>
          <InteractiveBarChart data={TARIFF_REVENUE_DATA} />
        </div>

        {/* ── H. Trade Deficit — Stacked bar chart (negative, downward from $0) ── */}
        <div style={{ maxWidth: 600, margin: "0 auto 28px", background: "#fff" }}>
          <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 16, fontWeight: 700, color: "#121212", marginBottom: 4 }}>Trade deficit</div>

          <svg viewBox="0 0 560 280" width="100%" style={{ overflow: "visible" }}>
            {/* Y-axis label at top */}
            <text x={30} y={14} fontFamily='"nyt-franklin", arial, helvetica, sans-serif' fontSize={14} fill="#333333" fontWeight={400} textAnchor="end">$0</text>

            {/* Black baseline at Y=0 (top of chart since values are negative) */}
            <line x1={36} y1={20} x2={550} y2={20} stroke="#333333" strokeWidth={1} />

            {/* Gridlines for -50, -100, -150 */}
            {[80, 140, 200].map((y, i) => (
              <g key={y}>
                <line x1={36} y1={y} x2={550} y2={y} stroke="#e6e6e6" strokeWidth={1} />
                <text x={30} y={y + 4} fontFamily='"nyt-franklin", arial, helvetica, sans-serif' fontSize={14} fill="#333333" fontWeight={400} textAnchor="end">
                  {[-50, -100, -150][i]}
                </text>
              </g>
            ))}

            {/* Stacked bars — China (orange, on top closer to $0) + Rest of world (gray, below) */}
            {(() => {
              // Quarterly data: [total deficit, china portion] in billions
              const quarters = [
                // 2000 Q1-Q4
                [30,8],[32,9],[35,10],[38,11],
                // 2001
                [36,10],[34,9],[33,9],[35,10],
                // 2002
                [36,11],[38,12],[40,13],[42,14],
                // 2003
                [42,14],[44,15],[46,16],[48,17],
                // 2004
                [50,18],[52,19],[55,20],[58,22],
                // 2005
                [60,22],[62,23],[65,24],[68,26],
                // 2006
                [65,24],[68,25],[70,26],[72,27],
                // 2007
                [68,24],[70,25],[65,24],[62,23],
                // 2008
                [60,22],[62,23],[58,20],[45,16],
                // 2009
                [28,12],[30,14],[35,16],[38,18],
                // 2010
                [40,20],[42,22],[45,24],[48,26],
                // 2011
                [50,24],[52,25],[55,26],[58,28],
                // 2012
                [55,26],[58,28],[60,30],[62,30],
                // 2013
                [55,25],[58,26],[60,28],[62,28],
                // 2014
                [58,26],[60,28],[62,28],[65,30],
                // 2015
                [60,28],[58,26],[56,24],[55,24],
                // 2016
                [52,22],[55,24],[58,26],[60,28],
                // 2017
                [55,24],[58,26],[60,28],[65,32],
                // 2018
                [62,30],[68,35],[76,40],[80,42],
                // 2019
                [68,33],[70,34],[68,32],[70,33],
                // 2020
                [42,22],[60,32],[70,36],[78,42],
                // 2021
                [80,38],[90,45],[98,50],[102,54],
                // 2022
                [100,46],[108,50],[96,42],[88,36],
                // 2023
                [82,34],[85,34],[82,32],[78,30],
                // 2024
                [82,32],[100,42],[88,34],[80,28],
              ];
              const maxDeficit = 150;
              const barCount = quarters.length;
              const gap = 510 / barCount;
              const barW = gap; // touching bars, no gap

              return quarters.map(([total, china], i) => {
                const x = 40 + i * gap;
                const chinaH = (china / maxDeficit) * 180;
                const restH = ((total - china) / maxDeficit) * 180;
                return (
                  <g key={i}>
                    {/* China — orange, on top (closer to $0 baseline) */}
                    <rect x={x} y={20} width={barW} height={chinaH} fill="#fdba58" />
                    {/* Rest of world — gray, below China */}
                    <rect x={x} y={20 + chinaH} width={barW} height={restH} fill="#cccccc" />
                  </g>
                );
              });
            })()}

            {/* Inline labels */}
            <text x={420} y={60} fontFamily='"nyt-franklin", arial, helvetica, sans-serif' fontSize={14} fill="#121212" fontWeight={700}>China</text>
            <text x={380} y={140} fontFamily='"nyt-franklin", arial, helvetica, sans-serif' fontSize={14} fill="#a8a8a8" fontWeight={400}>Rest of the world</text>

            {/* X-axis year labels — bold, below chart area */}
            {["2000", "2004", "2008", "2012", "2016", "2020", "2024"].map((yr, i) => (
              <text key={yr} x={40 + i * (510 / 7)} y={240} fontFamily='"nyt-franklin", arial, helvetica, sans-serif' fontSize={14} fill="#333333" fontWeight={400} textAnchor="start">{yr}</text>
            ))}
          </svg>

          <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 13, color: "#727272", fontWeight: 300, marginTop: 8, lineHeight: 1.4 }}>
            <span style={{ fontStyle: "normal" }}>Note: Data is trade in goods, not services, and is not seasonally adjusted.</span>
            {" "}
            <span>Source: Census Bureau.</span>
            {"  "}
            <span style={{ fontWeight: 500 }}>The New York Times</span>
          </div>
        </div>

        {/* ── E. NYT Promise Quote Box ── */}
        <div className="dd-palette-label" style={{ marginTop: "var(--dd-space-lg)" }}>NYT Promise Quote Box</div>
        <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, color: "var(--dd-ink-soft)", marginBottom: 16, lineHeight: 1.5 }}>
          Each section in the article opens with a quote callout showing the promise, source, and status badge.
        </p>
        <div style={{ maxWidth: 600, margin: "0 auto 20px" }}>
          {/* Gas Prices quote box */}
          <div style={{ background: "#f8f8f8", borderRadius: 4, padding: "16px 20px", border: "1px solid #e8e8e8" }}>
            <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 13, fontWeight: 500, color: "#727272", marginBottom: 8 }}>
              Speech to Economic Club of New York, Sept. 5, 2024
            </div>
            <div style={{ fontFamily: 'georgia, "times new roman", times, serif', fontSize: 22, fontWeight: 400, lineHeight: 1.35, color: "#121212", marginBottom: 12 }}>
              &ldquo;We&rsquo;re going down and getting gasoline below $2 a gallon, bring down the price of everything from electricity rates to groceries.&rdquo;
            </div>
            <span style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", color: "#fff", background: "#c49012", padding: "4px 8px", borderRadius: 2, textTransform: "uppercase" as const }}>
              SOME PROGRESS
            </span>
          </div>
        </div>

        {/* ── 7. NYT Quote / Pullquote Container Patterns ──────────────── */}
        <div className="dd-palette-label" style={{ marginTop: "var(--dd-space-xl)" }}>NYT Quote Containers</div>
        <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, color: "var(--dd-ink-soft)", marginBottom: 16, lineHeight: 1.5 }}>
          Three pullquote/callout styles from NYT graphics and editorial pages.
        </p>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 20, maxWidth: 600, margin: "0 auto" }}>
          {/* Style 1: Classic editorial pullquote — 3px black top rule */}
          <div style={{ borderTop: "3px solid #121212", borderBottom: "1px solid #e2e2e2", padding: "20px 0" }}>
            <div style={{ fontFamily: 'georgia, "times new roman", times, serif', fontSize: 24, fontWeight: 700, lineHeight: 1.3, color: "#121212", fontStyle: "italic", marginBottom: 12 }}>
              &ldquo;The economy doesn&rsquo;t care about promises. It cares about policy.&rdquo;
            </div>
            <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 13, fontWeight: 600, color: "#727272", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              — Senior Economic Advisor
            </div>
          </div>

          {/* Style 2: Highlighted callout box — khaki bg + orange left border */}
          <div style={{ background: "#f9f7f1", borderLeft: "4px solid #fdba58", padding: "16px 20px", borderRadius: "0 4px 4px 0" }}>
            <div style={{ fontFamily: 'georgia, "times new roman", times, serif', fontSize: 18, fontWeight: 500, lineHeight: 1.5, color: "#363636" }}>
              Food prices have risen 2.4 percent since inauguration, contrary to the pledge.
            </div>
            <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 12, color: "#727272", marginTop: 8 }}>
              Source: Bureau of Labor Statistics, Consumer Price Index
            </div>
          </div>

          {/* Style 3: Big number data callout */}
          <div style={{ display: "flex", gap: 16, padding: "16px 0", borderTop: "1px solid #e2e2e2", borderBottom: "1px solid #e2e2e2" }}>
            <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 42, fontWeight: 700, color: "#bc261a", lineHeight: 1, flexShrink: 0 }}>
              –12%
            </div>
            <div>
              <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 15, fontWeight: 600, color: "#121212", lineHeight: 1.3, marginBottom: 4 }}>
                Stock market decline from peak
              </div>
              <div style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 14, fontWeight: 300, color: "#363636", lineHeight: 1.5 }}>
                The S&amp;P 500 has dropped from its January high, erasing months of post-election gains.
              </div>
            </div>
          </div>
        </div>

        {/* ── 8. Topic Tags (Metadata Pattern) ──────────────── */}
        <div className="dd-palette-label" style={{ marginTop: "var(--dd-space-xl)" }}>Topic Tags (Article Metadata)</div>
        <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, color: "var(--dd-ink-soft)", marginBottom: 12, lineHeight: 1.5 }}>
          nyt-franklin 500, 12px, anchor color #326891.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, maxWidth: 600, margin: "0 auto" }}>
          {["Donald Trump","US Economy","Price","International trade","Oil and Gasoline","Electric power","Tariff","Food","Manufacturing","Stocks & Bonds","Inflation","Jobs","vis-design","Cars"].map((tag) => (
            <span key={tag} style={{ fontFamily: '"nyt-franklin", arial, helvetica, sans-serif', fontSize: 12, fontWeight: 500, color: "#326891", background: "#f0f5fa", padding: "4px 10px", borderRadius: 3, border: "1px solid #d5dee3", lineHeight: 1.4, cursor: "pointer" }}>
              {tag}
            </span>
          ))}
        </div>

        {/* ── Artboard tech notes ── */}
        <div
          style={{
            marginTop: 20,
            padding: "14px 18px",
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-medium)",
            lineHeight: 1.7,
            maxWidth: 600,
            margin: "20px auto 0",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4, fontFamily: "var(--dd-font-sans)", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--dd-ink-faint)" }}>
            Artboard Breakpoints
          </div>
          <div>Mobile &mdash; max-width: 320px, data-min-width: 0, data-max-width: 599</div>
          <div>Desktop &mdash; min-width: 600px, width: 600px, height: 342.8px</div>
          <div style={{ marginTop: 6 }}>
            <span style={{ fontWeight: 700 }}>Technique:</span> padding-bottom % for aspect ratio,
            IntersectionObserver for lazy image load, position: absolute labels
          </div>
        </div>
      </div>
    </div>
  );
}
