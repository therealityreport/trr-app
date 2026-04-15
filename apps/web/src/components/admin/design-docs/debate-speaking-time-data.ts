"use client";

export type DebateTopic = {
  id: string;
  label: string;
  color: string;
};

export type DebateTopicColumn = DebateTopic & {
  left: number;
};

export type DebateCandidate = {
  id: string;
  label: string;
  colorImageUrl: string;
  grayscaleImageUrl: string;
  rowTop: number;
};

export type DebateTimelineSegment = {
  topicId: string;
  x: number;
  width: number;
};

export type DebateTimelineRow = {
  id: string;
  label: string;
  total: string;
  imageUrl: string;
  segments: DebateTimelineSegment[];
};

export type DebateBubble = {
  candidateId: string;
  topicId: string;
  diameter: number;
};

const LOCAL_ASSET_BASE = "/design-docs/nyt/debate-speaking-time";

export const DEBATE_SPEAKING_TIME = {
  maxTimelineExtent: 830.984,
  timelineInnerWidth: 830.984,
  timelineTickSpacing: 118.712,
  timelineRowStep: 62.857,
  timelineBarHeight: 18,
  bubbleColumnCenterOffset: 52.92,
  bubbleRowCenterOffset: 52.92,
  bubbleChartWidth: 1068,
  bubbleChartHeight: 680,
  axisTicks: ["0", "4 min.", "8 min.", "12 min.", "16 min.", "20 min.", "24 min.", "28 min."],
  legendTopics: [
    { id: "electability", label: "Electability", color: "#8fbacc" },
    { id: "health-care", label: "Health care", color: "#436f82" },
    { id: "racial-justice", label: "Racial justice", color: "#ae4544" },
    { id: "sexism", label: "Sexism", color: "#f9e280" },
    { id: "gun-control", label: "Gun control", color: "#cc7c3a" },
    { id: "economy", label: "Economy", color: "#d8cb98" },
    { id: "education", label: "Education", color: "#617bb5" },
    { id: "criminal-justice", label: "Criminal justice", color: "#a4ad6f" },
    { id: "coronavirus", label: "Coronavirus", color: "#c98d8d" },
    { id: "foreign-policy", label: "Foreign policy", color: "#7C5981" },
    { id: "other", label: "Other", color: "#d9d9d9" },
  ] as const satisfies readonly DebateTopic[],
  bubbleTopicOrder: [
    { id: "electability", label: "Electability", color: "#8fbacc", left: 1.069 },
    { id: "foreign-policy", label: "Foreign policy", color: "#7C5981", left: 107.962 },
    { id: "gun-control", label: "Gun control", color: "#cc7c3a", left: 214.855 },
    { id: "racial-justice", label: "Racial justice", color: "#ae4544", left: 321.748 },
    { id: "health-care", label: "Health care", color: "#436f82", left: 428.641 },
    { id: "economy", label: "Economy", color: "#d8cb98", left: 535.534 },
    { id: "education", label: "Education", color: "#617bb5", left: 642.428 },
    { id: "coronavirus", label: "Coronavirus", color: "#c98d8d", left: 749.321 },
    { id: "sexism", label: "Sexism", color: "#f9e280", left: 856.214 },
    { id: "criminal-justice", label: "Criminal justice", color: "#a4ad6f", left: 963.107 },
  ] as const satisfies readonly DebateTopicColumn[],
  candidateOrder: [
    {
      id: "sanders",
      label: "Sanders",
      colorImageUrl: `${LOCAL_ASSET_BASE}/candidates/color/sanders.png`,
      grayscaleImageUrl: `${LOCAL_ASSET_BASE}/candidates/grayscale/sanders.png`,
      rowTop: 0.97,
    },
    {
      id: "bloomberg",
      label: "Bloomberg",
      colorImageUrl: `${LOCAL_ASSET_BASE}/candidates/color/bloomberg.png`,
      grayscaleImageUrl: `${LOCAL_ASSET_BASE}/candidates/grayscale/bloomberg.png`,
      rowTop: 97.974,
    },
    {
      id: "klobuchar",
      label: "Klobuchar",
      colorImageUrl: `${LOCAL_ASSET_BASE}/candidates/color/klobuchar.png`,
      grayscaleImageUrl: `${LOCAL_ASSET_BASE}/candidates/grayscale/klobuchar.png`,
      rowTop: 194.979,
    },
    {
      id: "warren",
      label: "Warren",
      colorImageUrl: `${LOCAL_ASSET_BASE}/candidates/color/warren.png`,
      grayscaleImageUrl: `${LOCAL_ASSET_BASE}/candidates/grayscale/warren.png`,
      rowTop: 291.983,
    },
    {
      id: "biden",
      label: "Biden",
      colorImageUrl: `${LOCAL_ASSET_BASE}/candidates/color/biden.png`,
      grayscaleImageUrl: `${LOCAL_ASSET_BASE}/candidates/grayscale/biden.png`,
      rowTop: 388.987,
    },
    {
      id: "buttigieg",
      label: "Buttigieg",
      colorImageUrl: `${LOCAL_ASSET_BASE}/candidates/color/buttigieg.png`,
      grayscaleImageUrl: `${LOCAL_ASSET_BASE}/candidates/grayscale/buttigieg.png`,
      rowTop: 485.991,
    },
    {
      id: "steyer",
      label: "Steyer",
      colorImageUrl: `${LOCAL_ASSET_BASE}/candidates/color/steyer.png`,
      grayscaleImageUrl: `${LOCAL_ASSET_BASE}/candidates/grayscale/steyer.png`,
      rowTop: 582.996,
    },
  ] as const satisfies readonly DebateCandidate[],
  timelineRows: [
    {
      id: "sanders",
      label: "Sanders",
      total: "15:28",
      imageUrl: `${LOCAL_ASSET_BASE}/candidates/color/sanders.png`,
      segments: [
        { topicId: "economy", x: 0.0, width: 53.616 },
        { topicId: "foreign-policy", x: 53.616, width: 26.714 },
        { topicId: "electability", x: 80.329, width: 54.072 },
        { topicId: "health-care", x: 134.402, width: 60.746 },
        { topicId: "health-care", x: 195.148, width: 32.796 },
        { topicId: "electability", x: 227.945, width: 45.123 },
        { topicId: "gun-control", x: 273.068, width: 51.394 },
        { topicId: "gun-control", x: 324.462, width: 42.937 },
        { topicId: "education", x: 367.399, width: 45.625 },
        { topicId: "health-care", x: 413.024, width: 50.032 },
        { topicId: "criminal-justice", x: 463.056, width: 51.94 },
        { topicId: "coronavirus", x: 514.997, width: 51.519 },
        { topicId: "foreign-policy", x: 566.516, width: 62.019 },
        { topicId: "foreign-policy", x: 628.535, width: 20.237 },
        { topicId: "electability", x: 648.771, width: 39.291 },
        { topicId: "electability", x: 688.063, width: 33.361 },
        { topicId: "foreign-policy", x: 721.424, width: 52.576 },
        { topicId: "other", x: 774.0, width: 56.984 },
      ],
    },
    {
      id: "bloomberg",
      label: "Bloomberg",
      total: "13:33",
      imageUrl: `${LOCAL_ASSET_BASE}/candidates/color/bloomberg.png`,
      segments: [
        { topicId: "foreign-policy", x: 0.0, width: 18.741 },
        { topicId: "racial-justice", x: 18.741, width: 66.596 },
        { topicId: "racial-justice", x: 85.337, width: 11.072 },
        { topicId: "electability", x: 96.41, width: 34.516 },
        { topicId: "sexism", x: 130.926, width: 7.346 },
        { topicId: "sexism", x: 138.272, width: 54.888 },
        { topicId: "sexism", x: 193.16, width: 19.35 },
        { topicId: "electability", x: 212.51, width: 54.915 },
        { topicId: "electability", x: 267.424, width: 6.432 },
        { topicId: "gun-control", x: 273.856, width: 26.06 },
        { topicId: "education", x: 299.916, width: 47.21 },
        { topicId: "electability", x: 347.126, width: 65.011 },
        { topicId: "health-care", x: 412.137, width: 83.725 },
        { topicId: "criminal-justice", x: 495.862, width: 41.997 },
        { topicId: "foreign-policy", x: 537.858, width: 48.294 },
        { topicId: "foreign-policy", x: 586.153, width: 61.311 },
        { topicId: "electability", x: 647.464, width: 18.812 },
        { topicId: "foreign-policy", x: 666.276, width: 49.369 },
        { topicId: "other", x: 715.645, width: 13.025 },
      ],
    },
    {
      id: "klobuchar",
      label: "Klobuchar",
      total: "13:26",
      imageUrl: `${LOCAL_ASSET_BASE}/candidates/color/klobuchar.png`,
      segments: [
        { topicId: "racial-justice", x: 0.0, width: 61.266 },
        { topicId: "health-care", x: 61.266, width: 63.326 },
        { topicId: "electability", x: 124.592, width: 60.594 },
        { topicId: "gun-control", x: 185.187, width: 21.599 },
        { topicId: "gun-control", x: 206.785, width: 45.069 },
        { topicId: "economy", x: 251.855, width: 65.145 },
        { topicId: "economy", x: 317.0, width: 76.244 },
        { topicId: "criminal-justice", x: 393.244, width: 61.777 },
        { topicId: "coronavirus", x: 455.021, width: 73.906 },
        { topicId: "electability", x: 528.927, width: 66.56 },
        { topicId: "foreign-policy", x: 595.487, width: 76.441 },
        { topicId: "other", x: 671.929, width: 49.746 },
      ],
    },
    {
      id: "warren",
      label: "Warren",
      total: "12:53",
      imageUrl: `${LOCAL_ASSET_BASE}/candidates/color/warren.png`,
      segments: [
        { topicId: "electability", x: 0.0, width: 69.078 },
        { topicId: "electability", x: 69.078, width: 74.73 },
        { topicId: "sexism", x: 143.808, width: 51.134 },
        { topicId: "sexism", x: 194.942, width: 29.482 },
        { topicId: "sexism", x: 224.424, width: 9.308 },
        { topicId: "electability", x: 233.732, width: 62.395 },
        { topicId: "gun-control", x: 296.127, width: 53.866 },
        { topicId: "education", x: 349.993, width: 44.684 },
        { topicId: "racial-justice", x: 394.677, width: 49.217 },
        { topicId: "foreign-policy", x: 443.894, width: 72.957 },
        { topicId: "electability", x: 516.851, width: 37.123 },
        { topicId: "foreign-policy", x: 553.974, width: 56.357 },
        { topicId: "foreign-policy", x: 610.331, width: 39.981 },
        { topicId: "other", x: 650.312, width: 42.14 },
      ],
    },
    {
      id: "biden",
      label: "Biden",
      total: "12:33",
      imageUrl: `${LOCAL_ASSET_BASE}/candidates/color/biden.png`,
      segments: [
        { topicId: "gun-control", x: 0.0, width: 46.727 },
        { topicId: "electability", x: 46.727, width: 51.976 },
        { topicId: "electability", x: 98.703, width: 72.527 },
        { topicId: "gun-control", x: 171.23, width: 54.288 },
        { topicId: "gun-control", x: 225.517, width: 19.027 },
        { topicId: "racial-justice", x: 244.545, width: 78.565 },
        { topicId: "health-care", x: 323.109, width: 44.505 },
        { topicId: "coronavirus", x: 367.614, width: 57.378 },
        { topicId: "foreign-policy", x: 424.992, width: 46.942 },
        { topicId: "foreign-policy", x: 471.934, width: 37.571 },
        { topicId: "foreign-policy", x: 509.505, width: 60.173 },
        { topicId: "foreign-policy", x: 569.678, width: 62.225 },
        { topicId: "other", x: 631.903, width: 42.436 },
      ],
    },
    {
      id: "buttigieg",
      label: "Buttigieg",
      total: "11:34",
      imageUrl: `${LOCAL_ASSET_BASE}/candidates/color/buttigieg.png`,
      segments: [
        { topicId: "electability", x: 0.0, width: 52.496 },
        { topicId: "electability", x: 52.496, width: 44.854 },
        { topicId: "racial-justice", x: 97.35, width: 61.687 },
        { topicId: "electability", x: 159.037, width: 52.989 },
        { topicId: "gun-control", x: 212.026, width: 68.648 },
        { topicId: "education", x: 280.674, width: 48.482 },
        { topicId: "economy", x: 329.156, width: 53.141 },
        { topicId: "foreign-policy", x: 382.297, width: 67.77 },
        { topicId: "electability", x: 450.067, width: 44.129 },
        { topicId: "foreign-policy", x: 494.195, width: 69.687 },
        { topicId: "other", x: 563.882, width: 57.808 },
      ],
    },
    {
      id: "steyer",
      label: "Steyer",
      total: "7:03",
      imageUrl: `${LOCAL_ASSET_BASE}/candidates/color/steyer.png`,
      segments: [
        { topicId: "economy", x: 0.0, width: 58.767 },
        { topicId: "electability", x: 58.767, width: 45.231 },
        { topicId: "racial-justice", x: 103.997, width: 42.149 },
        { topicId: "gun-control", x: 146.146, width: 55.076 },
        { topicId: "racial-justice", x: 201.222, width: 58.543 },
        { topicId: "foreign-policy", x: 259.765, width: 47.031 },
        { topicId: "foreign-policy", x: 306.796, width: 58.623 },
        { topicId: "other", x: 365.419, width: 13.617 },
      ],
    },
  ] as const satisfies readonly DebateTimelineRow[],
  bubbles: [
    { candidateId: "warren", topicId: "electability", diameter: 85.545 },
    { candidateId: "warren", topicId: "sexism", diameter: 52.004 },
    { candidateId: "warren", topicId: "gun-control", diameter: 40.249 },
    { candidateId: "warren", topicId: "education", diameter: 36.659 },
    { candidateId: "warren", topicId: "racial-justice", diameter: 38.473 },
    { candidateId: "warren", topicId: "foreign-policy", diameter: 71.354 },
    { candidateId: "steyer", topicId: "economy", diameter: 42.04 },
    { candidateId: "steyer", topicId: "electability", diameter: 36.882 },
    { candidateId: "steyer", topicId: "racial-justice", diameter: 55.03 },
    { candidateId: "steyer", topicId: "gun-control", diameter: 40.699 },
    { candidateId: "steyer", topicId: "foreign-policy", diameter: 56.369 },
    { candidateId: "sanders", topicId: "economy", diameter: 40.156 },
    { candidateId: "sanders", topicId: "foreign-policy", diameter: 69.702 },
    { candidateId: "sanders", topicId: "electability", diameter: 71.89 },
    { candidateId: "sanders", topicId: "health-care", diameter: 65.711 },
    { candidateId: "sanders", topicId: "gun-control", diameter: 53.263 },
    { candidateId: "sanders", topicId: "education", diameter: 37.042 },
    { candidateId: "sanders", topicId: "criminal-justice", diameter: 39.523 },
    { candidateId: "sanders", topicId: "coronavirus", diameter: 39.363 },
    { candidateId: "klobuchar", topicId: "racial-justice", diameter: 42.925 },
    { candidateId: "klobuchar", topicId: "health-care", diameter: 43.641 },
    { candidateId: "klobuchar", topicId: "electability", diameter: 61.839 },
    { candidateId: "klobuchar", topicId: "gun-control", diameter: 44.777 },
    { candidateId: "klobuchar", topicId: "economy", diameter: 65.209 },
    { candidateId: "klobuchar", topicId: "criminal-justice", diameter: 43.103 },
    { candidateId: "klobuchar", topicId: "coronavirus", diameter: 47.145 },
    { candidateId: "klobuchar", topicId: "foreign-policy", diameter: 47.947 },
    { candidateId: "buttigieg", topicId: "electability", diameter: 76.476 },
    { candidateId: "buttigieg", topicId: "racial-justice", diameter: 43.072 },
    { candidateId: "buttigieg", topicId: "gun-control", diameter: 45.437 },
    { candidateId: "buttigieg", topicId: "education", diameter: 38.185 },
    { candidateId: "buttigieg", topicId: "economy", diameter: 39.977 },
    { candidateId: "buttigieg", topicId: "foreign-policy", diameter: 64.296 },
    { candidateId: "bloomberg", topicId: "foreign-policy", diameter: 73.108 },
    { candidateId: "bloomberg", topicId: "racial-justice", diameter: 48.331 },
    { candidateId: "bloomberg", topicId: "electability", diameter: 73.512 },
    { candidateId: "bloomberg", topicId: "sexism", diameter: 49.534 },
    { candidateId: "bloomberg", topicId: "gun-control", diameter: 27.995 },
    { candidateId: "bloomberg", topicId: "education", diameter: 37.681 },
    { candidateId: "bloomberg", topicId: "health-care", diameter: 50.179 },
    { candidateId: "bloomberg", topicId: "criminal-justice", diameter: 35.539 },
    { candidateId: "biden", topicId: "gun-control", diameter: 60.085 },
    { candidateId: "biden", topicId: "electability", diameter: 61.191 },
    { candidateId: "biden", topicId: "racial-justice", diameter: 48.609 },
    { candidateId: "biden", topicId: "health-care", diameter: 36.585 },
    { candidateId: "biden", topicId: "coronavirus", diameter: 41.541 },
    { candidateId: "biden", topicId: "foreign-policy", diameter: 78.884 },
  ] as const satisfies readonly DebateBubble[],
} as const;
