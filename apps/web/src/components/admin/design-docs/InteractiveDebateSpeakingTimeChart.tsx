"use client";

/* eslint-disable @next/next/no-img-element */

import { DEBATE_SPEAKING_TIME } from "./debate-speaking-time-data";

interface InteractiveDebateSpeakingTimeChartProps {
  title: string;
  note: string;
  accessibilityLabels?: {
    timelineRowTemplate?: string;
    timelinePortraitTemplate?: string;
  } | null;
}

const FRANKLIN_STACK = '"nyt-franklin", arial, helvetica, sans-serif';
const SOURCE_WIDTH = 1050;
const SOURCE_HEIGHT = 480;
const TIMELINE_GROUP_X = 174;
const TIMELINE_GROUP_Y = 25;
const TIMELINE_AXIS_BASELINE_Y = 30;
const TIMELINE_AXIS_TOP_Y = 24;
const TIMELINE_IMAGE_X = 0;
const TIMELINE_IMAGE_Y = 6.428;
const TIMELINE_NAME_X = 50;
const TIMELINE_TOTAL_X = 171;
const TIMELINE_ROW_CENTER_Y = 31.428;
const TOPIC_MAP = new Map(
  DEBATE_SPEAKING_TIME.legendTopics.map((topic) => [topic.id, topic]),
);

function tickX(index: number) {
  return index * DEBATE_SPEAKING_TIME.timelineTickSpacing;
}

export default function InteractiveDebateSpeakingTimeChart({
  title,
  note,
  accessibilityLabels,
}: InteractiveDebateSpeakingTimeChartProps) {
  const timelineRowTemplate =
    accessibilityLabels?.timelineRowTemplate ??
    "Speaking time timeline for {candidate}; total speaking time {total}";
  const timelinePortraitTemplate =
    accessibilityLabels?.timelinePortraitTemplate ?? "{candidate} portrait";

  function fillTemplate(
    template: string,
    values: Record<string, string>,
  ) {
    return Object.entries(values).reduce(
      (result, [key, value]) => result.replaceAll(`{${key}}`, value),
      template,
    );
  }

  return (
    <div
      data-testid="debate-speaking-time-chart"
      style={{
        width: "100%",
        maxWidth: SOURCE_WIDTH,
        margin: "0 auto",
        color: "#121212",
      }}
    >
      <h2
        style={{
          margin: "0 0 12px",
          fontFamily: FRANKLIN_STACK,
          fontSize: 18,
          fontWeight: 700,
          lineHeight: "24px",
        }}
      >
        {title}
      </h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px 12px",
          maxWidth: 650,
          margin: "0 auto 14px",
        }}
      >
        {DEBATE_SPEAKING_TIME.legendTopics.map((topic) => (
          <div
            key={topic.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: topic.color,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: FRANKLIN_STACK,
                fontSize: 15,
                fontWeight: 500,
                lineHeight: "19px",
                color: "#333333",
              }}
            >
              {topic.label}
            </span>
          </div>
        ))}
      </div>

      <div
        data-testid="debate-speaking-time-chart-frame"
        style={{ width: "100%" }}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${SOURCE_WIDTH} ${SOURCE_HEIGHT}`}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <path
            d={`M${TIMELINE_GROUP_X + 0.5} ${TIMELINE_AXIS_TOP_Y}V${TIMELINE_AXIS_BASELINE_Y + 0.5}H${TIMELINE_GROUP_X + DEBATE_SPEAKING_TIME.timelineInnerWidth + 0.5}V${TIMELINE_AXIS_TOP_Y}`}
            fill="none"
            stroke="#121212"
            strokeWidth="1"
          />

          {DEBATE_SPEAKING_TIME.axisTicks.map((tick, index) => {
            const x = TIMELINE_GROUP_X + tickX(index) + 0.5;
            return (
              <g key={tick} transform={`translate(${x}, 0)`}>
                <line
                  y1={TIMELINE_AXIS_TOP_Y}
                  y2={TIMELINE_AXIS_BASELINE_Y}
                  stroke="#121212"
                  strokeWidth="1"
                />
                <text
                  y={18}
                  textAnchor={index === 0 ? "start" : "middle"}
                  fontFamily={FRANKLIN_STACK}
                  fontSize="14"
                  fontWeight="700"
                  fill="#000000"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {DEBATE_SPEAKING_TIME.timelineRows.map((row, rowIndex) => {
            const rowCenterY =
              TIMELINE_GROUP_Y +
              TIMELINE_ROW_CENTER_Y +
              rowIndex * DEBATE_SPEAKING_TIME.timelineRowStep;
            const imageY =
              TIMELINE_GROUP_Y +
              TIMELINE_IMAGE_Y +
              rowIndex * DEBATE_SPEAKING_TIME.timelineRowStep;

            return (
              <g key={row.id}>
                <image
                  href={row.imageUrl}
                  x={TIMELINE_IMAGE_X}
                  y={imageY}
                  width="50"
                  height="50"
                />

                <text
                  x={TIMELINE_NAME_X}
                  y={rowCenterY + 5}
                  fontFamily={FRANKLIN_STACK}
                  fontSize="14"
                  fontWeight="500"
                  fill="#000000"
                >
                  {row.label}
                </text>

                <text
                  x={TIMELINE_TOTAL_X}
                  y={rowCenterY + 6}
                  textAnchor="end"
                  fontFamily={FRANKLIN_STACK}
                  fontSize="16"
                  fontWeight="700"
                  fill="#121212"
                >
                  {row.total}
                </text>

                <g
                  aria-label={fillTemplate(timelineRowTemplate, {
                    candidate: row.label,
                    total: row.total,
                  })}
                >
                  {row.segments.map((segment, index) => {
                    const topic = TOPIC_MAP.get(segment.topicId);
                    if (!topic) return null;

                    return (
                      <rect
                        key={`${row.id}-${segment.topicId}-${index}`}
                        x={TIMELINE_GROUP_X + segment.x}
                        y={rowCenterY - DEBATE_SPEAKING_TIME.timelineBarHeight / 2}
                        width={segment.width}
                        height={DEBATE_SPEAKING_TIME.timelineBarHeight}
                        rx={segment.width < 8 ? 2 : 4}
                        fill={topic.color}
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    );
                  })}
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        {DEBATE_SPEAKING_TIME.timelineRows.map((row) => (
          <img
            key={row.id}
            src={row.imageUrl}
            alt={fillTemplate(timelinePortraitTemplate, {
              candidate: row.label,
            })}
          />
        ))}
      </div>

      <p
        style={{
          margin: "10px 0 0",
          fontFamily: FRANKLIN_STACK,
          fontSize: 15,
          fontWeight: 500,
          lineHeight: "19px",
          color: "#666666",
        }}
      >
        {note}
      </p>
    </div>
  );
}
