/**
 * Shared chart data constants — used by both ChartsSection and ArticleDetailPage.
 * Data extracted from actual Datawrapper embeds on nytimes.com articles.
 */

export type { BarChartData } from "./InteractiveBarChart";
export type { LineChartData } from "./InteractiveLineChart";
export type { HorizontalStackedBarData } from "./InteractiveHorizontalBarChart";

/** Filter card tracker — player card data for The Athletic free agent trackers */
export interface FilterCardPlayerData {
  rank: number;
  name: string;
  position: string;
  status: "Agreed" | "Still available";
  fromTeam: string;
  toTeam: string;
  contractYears: string;
  contractValue: string;
  teamLogoUrl: string;
  age: number;
  height: string;
  weight: number;
  contractProjection: string;
  reportedContract: string;
  scouting: string;
  headshot: string;
  stats: readonly { label: string; value: string }[];
}

export interface FilterCardTrackerData {
  title: string;
  colorScheme: string;
  players: readonly FilterCardPlayerData[];
  positionBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

/** Datawrapper heatmap table data — rows with labeled columns and a heatmap-enabled metric column */
export interface DatawrapperTableData {
  title: string;
  subtitle: string;
  columns: readonly { key: string; label: string; align: "left" | "right"; heatmap?: boolean }[];
  rows: readonly Record<string, string | number>[];
  heatmapGradient?: readonly string[];
  note: string;
  source: string;
  sourceUrl: string;
  credit: string;
}
export type {
  MedalTableData,
  MedalTableGridData,
  MedalTableInteractiveData,
} from "./InteractiveMedalTable";

import type { BarChartData } from "./InteractiveBarChart";
import type { LineChartData } from "./InteractiveLineChart";
import type { HorizontalStackedBarData } from "./InteractiveHorizontalBarChart";
import type {
  MedalTableData,
  MedalTableGridData,
  MedalTableInteractiveData,
} from "./InteractiveMedalTable";

/** State tax revenue breakdown — Birdkit stacked bar from sweepstakes article */
export const STATE_TAX_GAMBLING_DATA: HorizontalStackedBarData = {
  title: "Breakdown of tax revenue from online casino and sports gambling in six states",
  rows: [
    { label: "W. Va.", segments: [{ value: 86, color: "#353D4C", label: "Online Casino Gaming" }, { value: 14, color: "#CCCCCC", label: "Online Sports Gambling" }], total: "$35 mil." },
    { label: "Pa.", segments: [{ value: 84, color: "#353D4C", label: "Online Casino Gaming" }, { value: 16, color: "#CCCCCC", label: "Online Sports Gambling" }], total: "$1,138 mil." },
    { label: "Conn.", segments: [{ value: 77, color: "#353D4C", label: "Online Casino Gaming" }, { value: 23, color: "#CCCCCC", label: "Online Sports Gambling" }], total: "$106 mil." },
    { label: "Mich.", segments: [{ value: 75, color: "#353D4C", label: "Online Casino Gaming" }, { value: 25, color: "#CCCCCC", label: "Online Sports Gambling" }], total: "$598 mil." },
    { label: "N.J.", segments: [{ value: 70, color: "#353D4C", label: "Online Casino Gaming" }, { value: 30, color: "#CCCCCC", label: "Online Sports Gambling" }], total: "$356 mil." },
    { label: "Del.", segments: [{ value: 44, color: "#353D4C", label: "Online Casino Gaming" }, { value: 56, color: "#CCCCCC", label: "Online Sports Gambling" }], total: "$16 mil." },
  ],
  source: "Source: State financial reports for year 2024. Fiscal year used for Delaware and West Virginia based on data availability. Rhode Island not included because less than a year\u2019s worth of data was available.",
};

/** Real tariff revenue data from Datawrapper FPRyD/5 — 120 monthly values (2016-2025) */
export const TARIFF_REVENUE_DATA: BarChartData = {
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
export const FOOD_PRICES_DATA: LineChartData = {
  values: [3.3,2.88,1.95,1.34,0.63,0.98,0.91,0.84,0.77,0.68,0.27,-0.45,-0.45,-0.35,-0.52,-0.28,-0.69,-1.27,-1.56,-1.92,-2.18,-2.31,-2.19,-2.03,-1.92,-1.71,-0.86,-0.76,-0.16,-0.05,0.31,0.32,0.42,0.59,0.62,0.89,1.04,0.53,0.38,0.55,0.14,0.36,0.36,0.49,0.42,0.14,0.4,0.59,0.65,1.2,1.42,0.73,1.19,0.94,0.64,0.47,0.59,1.02,0.99,0.73,0.72,0.83,1.08,4.07,4.82,5.65,4.64,4.64,4.07,3.96,3.59,3.93,3.7,3.55,3.29,1.21,0.67,0.93,2.56,2.96,4.51,5.37,6.38,6.49,7.38,8.65,10.02,10.76,11.91,12.23,13.11,13.54,12.97,12.4,11.98,11.79,11.35,10.17,8.37,7.15,5.8,4.66,3.58,2.95,2.41,2.14,1.66,1.31,1.19,0.99,1.16,1.12,1.04,1.13,1.05,0.88,1.26,1.12,1.57,1.77,1.93,1.9,2.42,2.01,2.23,2.38,2.16,2.68,2.69,2.21,1.94,2.36],
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
export const GAS_PRICES_DATA: LineChartData = {
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
export const AUTO_JOBS_DATA: BarChartData = {
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
export const ELECTRICITY_PRICES_DATA: LineChartData = {
  values: [2.53,3.2,0.86,3.79,0.47,-0.03,-0.7,-0.63,-0.43,-0.51,-0.2,-1.22,-2.4,-2.96,-1.65,-2.13,-1.27,-1.84,-1.02,-0.72,0.12,0.39,0.25,0.67,1.01,1.92,1.58,2.42,2.68,2.53,2.57,2.27,1.74,1.95,2.53,2.59,2.41,2.21,2.23,1.23,1,-0.13,-0.82,-0.51,-1.18,0.72,0.59,1.07,0.36,-0.01,0.32,0.63,-0.15,-0.29,0.54,-0.07,0.65,0.42,0.49,-0.43,0.52,0.59,0.19,0.24,-0.16,0.11,-0.12,-0.06,0.67,1.29,1.63,2.22,1.52,2.27,2.46,3.6,4.23,3.84,4.05,5.24,5.24,6.53,6.46,6.34,10.66,8.97,11.1,11.05,12,13.68,15.23,15.76,15.51,14.13,13.74,14.29,11.9,12.87,10.17,8.42,5.93,5.36,3.02,2.1,2.6,2.38,3.35,3.31,3.82,3.56,4.98,5.1,5.89,4.38,4.86,3.91,3.72,4.52,3.09,2.8,1.88,2.46,2.79,3.61,4.49,5.82,5.54,6.19,5.08,5.51,6.94,6.66],
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
export const MANUFACTURING_JOBS_DATA: BarChartData = {
  values: [
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
export const SP500_DATA: LineChartData = {
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

/* ================================================================== */
/*  Winter Olympics medal table data                                   */
/*  Source: NYT "Leaders and Nations of the 2026 Winter Olympics"       */
/* ================================================================== */

/** Table 1 — Number of Events Won (the Standard Count) */
export const MEDAL_TABLE_STANDARD: MedalTableData = {
  title: "Number of Events Won (the Standard Count)",
  rows: [
    { country: "Norway", gold: 18, silver: 12, bronze: 11, total: 41 },
    { country: "U.S.", gold: 12, silver: 12, bronze: 9, total: 33 },
    { country: "Italy", gold: 10, silver: 6, bronze: 14, total: 30 },
  ],
};

/** Table 2 — Snow / Ice Rink / Sliding Track / Judge (2x2 grid) */
export const MEDAL_TABLE_VENUE_GRID: MedalTableGridData = {
  title:
    "Events on Snow / Events on an Ice Rink / Events on Sliding Track / Events With a Judge",
  tables: [
    {
      subtitle: "Events on Snow",
      rows: [
        { country: "Norway", gold: 0, silver: 0, bronze: 0, total: 37 },
        { country: "France", gold: 0, silver: 0, bronze: 0, total: 22 },
        { country: "Switzerland", gold: 0, silver: 0, bronze: 0, total: 19 },
      ],
    },
    {
      subtitle: "Events on an Ice Rink",
      rows: [
        { country: "Netherlands", gold: 0, silver: 0, bronze: 0, total: 20 },
        { country: "Canada", gold: 0, silver: 0, bronze: 0, total: 15 },
        { country: "U.S.", gold: 0, silver: 0, bronze: 0, total: 12 },
      ],
    },
    {
      subtitle: "Events on Sliding Track",
      rows: [
        { country: "Germany", gold: 0, silver: 0, bronze: 0, total: 19 },
        { country: "Austria", gold: 0, silver: 0, bronze: 0, total: 5 },
        { country: "Italy", gold: 0, silver: 0, bronze: 0, total: 4 },
      ],
    },
    {
      subtitle: "Events With a Judge",
      rows: [
        { country: "Japan", gold: 0, silver: 0, bronze: 0, total: 21 },
        { country: "U.S.", gold: 0, silver: 0, bronze: 0, total: 13 },
        { country: "China", gold: 0, silver: 0, bronze: 0, total: 11 },
      ],
    },
  ],
};

/** Table 3 — Team / Individual / Men's / Women's (2x2 grid) */
export const MEDAL_TABLE_CATEGORY_GRID: MedalTableGridData = {
  title: "Team Events / Individual Events / Men\u2019s Events / Women\u2019s Events",
  tables: [
    {
      subtitle: "Team Events",
      rows: [
        { country: "Germany", gold: 0, silver: 0, bronze: 0, total: 16 },
        { country: "Italy", gold: 0, silver: 0, bronze: 0, total: 13 },
        { country: "U.S.", gold: 0, silver: 0, bronze: 0, total: 10 },
      ],
    },
    {
      subtitle: "Individual Events",
      rows: [
        { country: "Norway", gold: 0, silver: 0, bronze: 0, total: 33 },
        { country: "U.S.", gold: 0, silver: 0, bronze: 0, total: 23 },
        { country: "Japan", gold: 0, silver: 0, bronze: 0, total: 21 },
      ],
    },
    {
      subtitle: "Men\u2019s Events",
      rows: [
        { country: "Norway", gold: 0, silver: 0, bronze: 0, total: 27 },
        { country: "Switzerland", gold: 0, silver: 0, bronze: 0, total: 14 },
        { country: "U.S.", gold: 0, silver: 0, bronze: 0, total: 12 },
      ],
    },
    {
      subtitle: "Women\u2019s Events",
      rows: [
        { country: "U.S.", gold: 0, silver: 0, bronze: 0, total: 17 },
        { country: "Sweden", gold: 0, silver: 0, bronze: 0, total: 15 },
        { country: "Norway", gold: 0, silver: 0, bronze: 0, total: 13 },
      ],
    },
  ],
};

/** Table 4 — Number of Athletes Who Won Medals */
export const MEDAL_TABLE_ATHLETES: MedalTableData = {
  title: "Number of Athletes Who Won Medals",
  rows: [
    { country: "U.S.", gold: 64, silver: 9, bronze: 7, total: 80 },
    { country: "Canada", gold: 11, silver: 52, bronze: 8, total: 71 },
    { country: "Switzerland", gold: 5, silver: 11, bronze: 32, total: 48 },
  ],
};

/** Table 5 — Mid-Latitude Countries */
export const MEDAL_TABLE_MID_LATITUDE: MedalTableData = {
  title: "Mid-Latitude Countries",
  rows: [
    { country: "S. Korea", gold: 3, silver: 4, bronze: 3, total: 10 },
    { country: "Australia", gold: 3, silver: 2, bronze: 1, total: 6 },
    { country: "Spain", gold: 1, silver: 0, bronze: 2, total: 3 },
    { country: "Bulgaria", gold: 0, silver: 0, bronze: 2, total: 2 },
    { country: "Brazil", gold: 1, silver: 0, bronze: 0, total: 1 },
    { country: "Georgia", gold: 0, silver: 1, bronze: 0, total: 1 },
  ],
  source:
    "Countries whose inhabited territories are between 45 degrees north and 45 degrees south latitude.",
};

/** Table 6 — Choose Your Own Medal Table (interactive dropdown) */
export const MEDAL_TABLE_CHOOSE: MedalTableInteractiveData = {
  title: "Choose Your Own Medal Table",
  options: [
    {
      label: "All events",
      rows: [
        { country: "Norway", gold: 18, silver: 12, bronze: 11, total: 41 },
        { country: "United States", gold: 12, silver: 12, bronze: 9, total: 33 },
        { country: "Italy", gold: 10, silver: 6, bronze: 14, total: 30 },
        { country: "Germany", gold: 8, silver: 10, bronze: 8, total: 26 },
        { country: "Japan", gold: 5, silver: 7, bronze: 13, total: 25 },
        { country: "France", gold: 8, silver: 9, bronze: 6, total: 23 },
        { country: "Switzerland", gold: 6, silver: 9, bronze: 8, total: 23 },
        { country: "Canada", gold: 5, silver: 7, bronze: 9, total: 21 },
      ],
    },
    {
      label: "Team events",
      rows: [
        { country: "Germany", gold: 4, silver: 6, bronze: 6, total: 16 },
        { country: "Italy", gold: 4, silver: 3, bronze: 6, total: 13 },
        { country: "U.S.", gold: 4, silver: 4, bronze: 2, total: 10 },
      ],
    },
    {
      label: "Individual events",
      rows: [
        { country: "Norway", gold: 14, silver: 10, bronze: 9, total: 33 },
        { country: "U.S.", gold: 8, silver: 8, bronze: 7, total: 23 },
        { country: "Japan", gold: 4, silver: 6, bronze: 11, total: 21 },
      ],
    },
    {
      label: "Events with a judge",
      rows: [
        { country: "Japan", gold: 5, silver: 7, bronze: 9, total: 21 },
        { country: "U.S.", gold: 5, silver: 6, bronze: 2, total: 13 },
        { country: "China", gold: 4, silver: 3, bronze: 4, total: 11 },
      ],
    },
    { label: "Racing events", rows: [], source: "Data for this view requires the interactive Birdkit application." },
    {
      label: "Men\u2019s events",
      rows: [
        { country: "Norway", gold: 14, silver: 5, bronze: 8, total: 27 },
        { country: "Switzerland", gold: 4, silver: 3, bronze: 7, total: 14 },
        { country: "U.S.", gold: 4, silver: 7, bronze: 1, total: 12 },
      ],
    },
    {
      label: "Women\u2019s events",
      rows: [
        { country: "U.S.", gold: 6, silver: 3, bronze: 8, total: 17 },
        { country: "Sweden", gold: 6, silver: 6, bronze: 3, total: 15 },
        { country: "Norway", gold: 4, silver: 6, bronze: 3, total: 13 },
      ],
    },
    {
      label: "Events on snow",
      rows: [
        { country: "Norway", gold: 17, silver: 10, bronze: 10, total: 37 },
        { country: "France", gold: 7, silver: 9, bronze: 6, total: 22 },
        { country: "Switzerland", gold: 6, silver: 8, bronze: 5, total: 19 },
      ],
    },
    {
      label: "Events on an ice rink",
      rows: [
        { country: "Netherlands", gold: 10, silver: 7, bronze: 3, total: 20 },
        { country: "Canada", gold: 3, silver: 5, bronze: 7, total: 15 },
        { country: "U.S.", gold: 6, silver: 4, bronze: 2, total: 12 },
      ],
    },
    {
      label: "Events on sliding track",
      rows: [
        { country: "Germany", gold: 6, silver: 8, bronze: 5, total: 19 },
        { country: "Austria", gold: 1, silver: 3, bronze: 1, total: 5 },
        { country: "Italy", gold: 2, silver: 0, bronze: 2, total: 4 },
      ],
    },
    { label: "Events in the first Winter Olympics", rows: [], source: "Data for this view requires the interactive Birdkit application." },
    { label: "Events added this century", rows: [], source: "Data for this view requires the interactive Birdkit application." },
    { label: "Medals per capita", rows: [], source: "Data for this view requires the interactive Birdkit application." },
    { label: "Countries under 10 million people", rows: [], source: "Data for this view requires the interactive Birdkit application." },
    { label: "Lower-income countries", rows: [], source: "Data for this view requires the interactive Birdkit application." },
    { label: "Compared with 2022 Winter Olympics", rows: [], source: "Data for this view requires the interactive Birdkit application." },
    { label: "Compared with 2024 Summer Olympics", rows: [], source: "Data for this view requires the interactive Birdkit application." },
    {
      label: "Athletes",
      rows: [
        { country: "U.S.", gold: 64, silver: 9, bronze: 7, total: 80 },
        { country: "Canada", gold: 11, silver: 52, bronze: 8, total: 71 },
        { country: "Switzerland", gold: 5, silver: 11, bronze: 32, total: 48 },
      ],
    },
    { label: "Physical medals", rows: [], source: "Data for this view requires the interactive Birdkit application." },
    { label: "Versatility index", rows: [], source: "Data for this view requires the interactive Birdkit application." },
    { label: "Events going downhill", rows: [], source: "Data for this view requires the interactive Birdkit application." },
    {
      label: "Mid-latitude countries",
      rows: [
        { country: "S. Korea", gold: 3, silver: 4, bronze: 3, total: 10 },
        { country: "Australia", gold: 3, silver: 2, bronze: 1, total: 6 },
        { country: "Spain", gold: 1, silver: 0, bronze: 2, total: 3 },
        { country: "Bulgaria", gold: 0, silver: 0, bronze: 2, total: 2 },
        { country: "Brazil", gold: 1, silver: 0, bronze: 0, total: 1 },
        { country: "Georgia", gold: 0, silver: 1, bronze: 0, total: 1 },
      ],
    },
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   The Athletic — NFL fourth-down decisions
   Datawrapper UYsk6/7 — heatmap table, The Athletic theme
   Data: rbsdm.com regular-season results for 14 playoff coaches
   ══════════════════════════════════════════════════════════════════════ */

/** 2025 NFL fourth-down decisions — Datawrapper UYsk6/7, 14 playoff coaches, sorted by xGC+ descending */
export const ATHLETIC_NFL_FOURTH_DOWN_DATA: DatawrapperTableData = {
  title: "2025 NFL fourth-down decisions",
  subtitle: "Regular-season results by playoff coaches",
  columns: [
    { key: "coach", label: "Coach", align: "left" },
    { key: "xGO", label: "xGO", align: "right" },
    { key: "go_correct", label: "go_correct", align: "right" },
    { key: "go_correct_pct", label: "go_correct%", align: "right" },
    { key: "xGC_plus", label: "xGC+", align: "right", heatmap: true },
  ],
  rows: [
    { coach: "Matt LaFleur", team: "packers", xGO: 16, go_correct: 13, go_correct_pct: "81.3%", xGC_plus: "18.1%" },
    { coach: "Nick Sirianni", team: "eagles", xGO: 15, go_correct: 12, go_correct_pct: "80.0%", xGC_plus: "16.9%" },
    { coach: "Mike Vrabel", team: "patriots", xGO: 18, go_correct: 14, go_correct_pct: "77.8%", xGC_plus: "14.7%" },
    { coach: "Dave Canales", team: "panthers", xGO: 25, go_correct: 19, go_correct_pct: "76.0%", xGC_plus: "12.9%" },
    { coach: "Liam Coen", team: "jaguars", xGO: 16, go_correct: 12, go_correct_pct: "75.0%", xGC_plus: "11.9%" },
    { coach: "Sean McVay", team: "rams", xGO: 22, go_correct: 16, go_correct_pct: "72.7%", xGC_plus: "9.6%" },
    { coach: "Ben Johnson", team: "bears", xGO: 20, go_correct: 14, go_correct_pct: "70.0%", xGC_plus: "6.9%" },
    { coach: "Sean McDermott", team: "bills", xGO: 20, go_correct: 13, go_correct_pct: "65.0%", xGC_plus: "1.9%" },
    { coach: "Kyle Shanahan", team: "49ers", xGO: 16, go_correct: 10, go_correct_pct: "62.5%", xGC_plus: "-0.6%" },
    { coach: "Mike Mcdonald", team: "seahawks", xGO: 12, go_correct: 7, go_correct_pct: "58.3%", xGC_plus: "-4.8%" },
    { coach: "Sean Payton", team: "broncos", xGO: 20, go_correct: 10, go_correct_pct: "50.0%", xGC_plus: "-13.1%" },
    { coach: "Mike Tomlin", team: "steelers", xGO: 25, go_correct: 11, go_correct_pct: "44.0%", xGC_plus: "-19.1%" },
    { coach: "DeMeco Ryans", team: "texans", xGO: 20, go_correct: 8, go_correct_pct: "40.0%", xGC_plus: "-23.1%" },
    { coach: "Jim Harbaugh", team: "chargers", xGO: 18, go_correct: 7, go_correct_pct: "38.9%", xGC_plus: "-24.2%" },
  ],
  heatmapGradient: ["#904406", "#BD6910", "#F89A1E", "#FBC46D", "#98E9E7", "#409797", "#136060", "#002728"],
  note: "xGO \u2013 how many times a coach was expected to go on fourth down \u2022 xGC+ \u2013 percentage above/below the average playoff coach",
  source: "Source: rbsdm.com",
  sourceUrl: "https://rbsdm.com/",
  credit: "The Athletic",
};

/* ══════════════════════════════════════════════════════════════════════
   The Athletic — NFL Free Agent Tracker 2026
   Filter card system: 150 ranked players, 4 filters, searchable, expandable
   Data: contract projections + actuals from The Athletic staff
   ══════════════════════════════════════════════════════════════════════ */

/** 2026 NFL free agent tracker — top 20 representative sample from 150 total ranked players */
export const ATHLETIC_NFL_FREE_AGENT_TRACKER_DATA: FilterCardTrackerData = {
  title: "Top 150 NFL Free Agents",
  colorScheme: "green",
  players: [
    { rank: 1, name: "Trey Hendrickson", position: "Edge", status: "Agreed", fromTeam: "Bengals", toTeam: "Ravens", contractYears: "4 years", contractValue: "$112 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-33-300x300.png", age: 31, height: "6-4", weight: 265, contractProjection: "3 years, $99 million", reportedContract: "4 years, $112 million", scouting: "Hendrickson has been one of the most productive pass rushers in the NFL over the past five seasons. He has the third-most sacks in the league since 2020 with 74.5. Hendrickson is dominant with his hands to swipe past a tackle's strike. He also features numerous changeups off his wide moves, including lethal speed-to-power.", headshot: "https://cdn-headshots.theathletic.com/american_football/vg8hR3uJkLmXqY12_300x200.png", stats: [{ label: "Sacks (since 2020)", value: "74.5" }, { label: "Forced fumbles", value: "15" }, { label: "Games (2025)", value: "7" }, { label: "Snap rate", value: "82%" }] },
    { rank: 2, name: "Jaelan Phillips", position: "Edge", status: "Agreed", fromTeam: "Eagles", toTeam: "Panthers", contractYears: "4 years", contractValue: "$120 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-35-300x300.png", age: 27, height: "6-5", weight: 263, contractProjection: "4 years, $98 million", reportedContract: "4 years, $120 million", scouting: "Phillips is a young, ascending edge rusher who finished fourth in pressure rate last season. He is an explosive athlete with a violent play style, short-area burst as a rusher, particularly on swim moves.", headshot: "https://cdn-headshots.theathletic.com/american_football/pQ9xW2nTfKzRjL78_300x200.png", stats: [{ label: "Pressure rate rank", value: "4th" }, { label: "Sacks", value: "9.5" }, { label: "QB hits", value: "18" }, { label: "Snap rate", value: "76%" }] },
    { rank: 3, name: "Devin Lloyd", position: "LB", status: "Agreed", fromTeam: "Jaguars", toTeam: "Panthers", contractYears: "3 years", contractValue: "$45 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-35-300x300.png", age: 27, height: "6-3", weight: 237, contractProjection: "3 years, $42 million", reportedContract: "3 years, $45 million", scouting: "Lloyd is a versatile linebacker who can play all three downs. He finished top-10 in tackles and showed improved coverage skills in his third NFL season.", headshot: "https://cdn-headshots.theathletic.com/american_football/kM4bN7cHwPxSfE56_300x200.png", stats: [{ label: "Tackles", value: "142" }, { label: "Tackles for loss", value: "12" }, { label: "Pass deflections", value: "8" }, { label: "Snap rate", value: "94%" }] },
    { rank: 4, name: "Daniel Jones", position: "QB", status: "Agreed", fromTeam: "Colts", toTeam: "Colts", contractYears: "2 years", contractValue: "$88 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-41-300x300.png", age: 29, height: "6-5", weight: 220, contractProjection: "2 years, $70 million", reportedContract: "2 years, $88 million", scouting: "Jones had a resurgent season in Indianapolis, posting career-high efficiency numbers and leading the Colts to the playoffs for the first time in three years.", headshot: "https://cdn-headshots.theathletic.com/american_football/dJ3kL9mRtWxYzQ45_300x200.png", stats: [{ label: "Completion rate", value: "68.4%" }, { label: "Passing yards", value: "3,892" }, { label: "TD-INT", value: "28-9" }, { label: "EPA/dropback", value: "0.14" }] },
    { rank: 5, name: "Tyler Linderbaum", position: "C", status: "Agreed", fromTeam: "Ravens", toTeam: "Raiders", contractYears: "3 years", contractValue: "$81 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-53-300x300.png", age: 26, height: "6-2", weight: 302, contractProjection: "4 years, $72 million", reportedContract: "3 years, $81 million", scouting: "Linderbaum is the best center in football. His combination of athleticism, intelligence, and technique is unmatched at the position.", headshot: "https://cdn-headshots.theathletic.com/american_football/tL5nM8qFwCxSjK23_300x200.png", stats: [{ label: "PFF grade", value: "91.2" }, { label: "Sacks allowed", value: "0" }, { label: "Penalties", value: "2" }, { label: "Snap rate", value: "100%" }] },
    { rank: 6, name: "Mike Evans", position: "WR", status: "Agreed", fromTeam: "Buccaneers", toTeam: "49ers", contractYears: "3 years", contractValue: "$42.5 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-58-300x300.png", age: 33, height: "6-5", weight: 231, contractProjection: "2 years, $40 million", reportedContract: "3 years, $42.5 million", scouting: "Evans is an all-time great receiver who has posted 1,000+ receiving yards in every season of his career. His contested-catch ability remains elite.", headshot: "https://cdn-headshots.theathletic.com/american_football/mE6wR4hBnPxYqJ89_300x200.png", stats: [{ label: "Receiving yards", value: "1,054" }, { label: "Receptions", value: "68" }, { label: "TDs", value: "8" }, { label: "Yards/reception", value: "15.5" }] },
    { rank: 7, name: "Kenneth Walker III", position: "RB", status: "Agreed", fromTeam: "Seahawks", toTeam: "Chiefs", contractYears: "3 years", contractValue: "$43.1 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-39-300x300.png", age: 25, height: "5-9", weight: 211, contractProjection: "3 years, $36 million", reportedContract: "3 years, $43.1 million", scouting: "Walker is a dynamic runner with explosive speed and the vision to find running lanes. He led the Seahawks to a Super Bowl title and won Super Bowl LX MVP.", headshot: "https://cdn-headshots.theathletic.com/american_football/kW7yT2uJnLmXpR34_300x200.png", stats: [{ label: "Rushing yards", value: "1,341" }, { label: "Yards/carry", value: "5.1" }, { label: "TDs", value: "14" }, { label: "Broken tackles", value: "42" }] },
    { rank: 8, name: "Malik Willis", position: "QB", status: "Agreed", fromTeam: "Packers", toTeam: "Dolphins", contractYears: "3 years", contractValue: "$67.5 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-48-300x300.png", age: 27, height: "6-1", weight: 219, contractProjection: "3 years, $55 million", reportedContract: "3 years, $67.5 million", scouting: "Willis emerged as a legitimate starter in Green Bay, showing improved accuracy and decision-making. His athleticism remains a weapon in the run game.", headshot: "https://cdn-headshots.theathletic.com/american_football/mW8zU3vKoMnYsT56_300x200.png", stats: [{ label: "Completion rate", value: "64.7%" }, { label: "Passing yards", value: "3,210" }, { label: "TD-INT", value: "22-10" }, { label: "Rushing yards", value: "485" }] },
    { rank: 9, name: "Travis Etienne", position: "RB", status: "Agreed", fromTeam: "Jaguars", toTeam: "Saints", contractYears: "4 years", contractValue: "$48 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-52-300x300.png", age: 27, height: "5-10", weight: 215, contractProjection: "3 years, $39 million", reportedContract: "4 years, $48 million", scouting: "Etienne is a versatile back who can hurt defenses both on the ground and through the air. He has top-end speed and consistently breaks tackles.", headshot: "https://cdn-headshots.theathletic.com/american_football/tE9aV4wLpNoZuW78_300x200.png", stats: [{ label: "Rushing yards", value: "1,128" }, { label: "Receiving yards", value: "421" }, { label: "Total TDs", value: "11" }, { label: "Yards/carry", value: "4.6" }] },
    { rank: 10, name: "Alec Pierce", position: "WR", status: "Agreed", fromTeam: "Colts", toTeam: "Colts", contractYears: "4 years", contractValue: "$114 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-41-300x300.png", age: 25, height: "6-3", weight: 211, contractProjection: "4 years, $88 million", reportedContract: "4 years, $114 million", scouting: "Pierce broke out as one of the league's premier deep threats, leading the NFL in yards per reception. His speed and route-running have taken a massive leap.", headshot: "https://cdn-headshots.theathletic.com/american_football/aP1bX5yMqOrAvE90_300x200.png", stats: [{ label: "Receiving yards", value: "1,287" }, { label: "Yards/reception", value: "18.4" }, { label: "TDs", value: "11" }, { label: "Deep targets", value: "32" }] },
    { rank: 11, name: "Odafe Oweh", position: "Edge", status: "Agreed", fromTeam: "Chargers", toTeam: "Commanders", contractYears: "4 years", contractValue: "$100 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-61-300x300.png", age: 27, height: "6-5", weight: 257, contractProjection: "4 years, $84 million", reportedContract: "4 years, $100 million", scouting: "Oweh is an elite athlete who has developed into a complete edge rusher. His combination of speed and power makes him virtually unblockable one-on-one.", headshot: "", stats: [{ label: "Sacks", value: "12" }, { label: "QB hits", value: "22" }, { label: "Pressures", value: "58" }, { label: "Snap rate", value: "88%" }] },
    { rank: 12, name: "Rasheed Walker", position: "T", status: "Agreed", fromTeam: "Packers", toTeam: "Panthers", contractYears: "1 year", contractValue: "$4 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-35-300x300.png", age: 26, height: "6-6", weight: 314, contractProjection: "3 years, $30 million", reportedContract: "1 year, $4 million", scouting: "Walker is a talented young tackle with good feet and length. He started every game for the Packers and showed steady improvement.", headshot: "", stats: [{ label: "Games started", value: "17" }, { label: "Sacks allowed", value: "4" }, { label: "Penalties", value: "5" }, { label: "PFF grade", value: "72.1" }] },
    { rank: 13, name: "Khalil Mack", position: "Edge", status: "Agreed", fromTeam: "Chargers", toTeam: "Chargers", contractYears: "1 year", contractValue: "$18 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-56-300x300.png", age: 35, height: "6-3", weight: 267, contractProjection: "1 year, $14 million", reportedContract: "1 year, $18 million", scouting: "Mack continues to defy Father Time. He remains one of the most technically refined edge rushers in the NFL.", headshot: "", stats: [{ label: "Sacks", value: "8.5" }, { label: "QB hits", value: "14" }, { label: "Forced fumbles", value: "3" }, { label: "Snap rate", value: "68%" }] },
    { rank: 14, name: "Jermaine Eluemunor", position: "T", status: "Agreed", fromTeam: "Giants", toTeam: "Giants", contractYears: "3 years", contractValue: "$39 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-47-300x300.png", age: 30, height: "6-4", weight: 338, contractProjection: "3 years, $33 million", reportedContract: "3 years, $39 million", scouting: "Eluemunor has developed into one of the better right tackles in the NFL. His power at the point of attack is elite.", headshot: "", stats: [{ label: "Games started", value: "17" }, { label: "Sacks allowed", value: "3" }, { label: "PFF grade", value: "78.4" }, { label: "Penalties", value: "4" }] },
    { rank: 15, name: "John Franklin-Myers", position: "IDL", status: "Agreed", fromTeam: "Broncos", toTeam: "Titans", contractYears: "3 years", contractValue: "$63 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-60-300x300.png", age: 29, height: "6-4", weight: 288, contractProjection: "3 years, $51 million", reportedContract: "3 years, $63 million", scouting: "Franklin-Myers is a disruptive interior presence who can rush the passer and stop the run. He had a career year in Denver with 10 sacks.", headshot: "", stats: [{ label: "Sacks", value: "10" }, { label: "TFL", value: "14" }, { label: "QB hits", value: "19" }, { label: "Snap rate", value: "72%" }] },
    { rank: 16, name: "Kyler Murray", position: "QB", status: "Agreed", fromTeam: "Cardinals", toTeam: "Steelers", contractYears: "2 years", contractValue: "$50 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-55-300x300.png", age: 29, height: "5-10", weight: 207, contractProjection: "1 year, $20 million", reportedContract: "2 years, $50 million", scouting: "Murray is a dynamic playmaker whose dual-threat ability can open up any offense. His accuracy and arm talent are elite when healthy.", headshot: "", stats: [{ label: "Completion rate", value: "66.1%" }, { label: "Passing yards", value: "2,680" }, { label: "TD-INT", value: "18-8" }, { label: "Rushing yards", value: "340" }] },
    { rank: 17, name: "Nico Collins", position: "WR", status: "Agreed", fromTeam: "Texans", toTeam: "Texans", contractYears: "4 years", contractValue: "$100 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-43-300x300.png", age: 27, height: "6-4", weight: 215, contractProjection: "4 years, $92 million", reportedContract: "4 years, $100 million", scouting: "Collins is a big-bodied receiver who dominated as the Texans' No. 1 target. His combination of size, speed, and route-running makes him nearly impossible to cover.", headshot: "", stats: [{ label: "Receiving yards", value: "1,190" }, { label: "Receptions", value: "78" }, { label: "TDs", value: "9" }, { label: "Yards/reception", value: "15.3" }] },
    { rank: 18, name: "Chris Godwin", position: "WR", status: "Still available", fromTeam: "Buccaneers", toTeam: "", contractYears: "", contractValue: "", teamLogoUrl: "", age: 30, height: "6-1", weight: 209, contractProjection: "2 years, $36 million", reportedContract: "", scouting: "Godwin is one of the best slot receivers in the NFL. His route-running precision and catch-point ability remain elite despite his injury history.", headshot: "", stats: [{ label: "Receiving yards", value: "982" }, { label: "Receptions", value: "74" }, { label: "TDs", value: "6" }, { label: "Catch rate", value: "71.2%" }] },
    { rank: 19, name: "Kirk Cousins", position: "QB", status: "Still available", fromTeam: "Falcons", toTeam: "", contractYears: "", contractValue: "", teamLogoUrl: "", age: 38, height: "6-3", weight: 202, contractProjection: "1 year, $15 million", reportedContract: "", scouting: "Cousins is a veteran quarterback whose accuracy and processing speed remain assets. Finding a team willing to take a chance on him at his age will be the challenge.", headshot: "", stats: [{ label: "Completion rate", value: "65.8%" }, { label: "Passing yards", value: "3,100" }, { label: "TD-INT", value: "18-12" }, { label: "EPA/dropback", value: "-0.02" }] },
    { rank: 20, name: "Josh Jacobs", position: "RB", status: "Agreed", fromTeam: "Packers", toTeam: "Jaguars", contractYears: "3 years", contractValue: "$36 million", teamLogoUrl: "https://static01.nyt.com/athletic/logos/team/team-logo-45-300x300.png", age: 28, height: "5-10", weight: 220, contractProjection: "2 years, $24 million", reportedContract: "3 years, $36 million", scouting: "Jacobs is a physical runner who wears down defenses. His ability to convert short-yardage situations and pass-protect makes him a complete back.", headshot: "", stats: [{ label: "Rushing yards", value: "1,085" }, { label: "Yards/carry", value: "4.3" }, { label: "TDs", value: "10" }, { label: "Broken tackles", value: "34" }] },
  ],
  positionBreakdown: { Edge: 19, WR: 15, CB: 14, T: 13, S: 13, TE: 13, LB: 12, RB: 12, IDL: 12, G: 12, QB: 10, C: 5 },
  statusBreakdown: { Agreed: 117, "Still available": 33 },
};
