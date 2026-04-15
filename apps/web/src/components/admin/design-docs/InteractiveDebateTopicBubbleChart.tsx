"use client";

import { DEBATE_SPEAKING_TIME } from "./debate-speaking-time-data";

interface InteractiveDebateTopicBubbleChartProps {
  title: string;
  note: string;
  accessibilityLabels?: {
    bubbleTemplate?: string;
  } | null;
}

const FRANKLIN_STACK = '"nyt-franklin", arial, helvetica, sans-serif';
const SOURCE_WIDTH = 1150;
const SOURCE_HEIGHT = 680;
const BUBBLE_GROUP_X = 80;
const BUBBLE_LABEL_X = 71;
const BUBBLE_TOPIC_Y = 11;
const BUBBLE_CIRCLE_CENTER_X = 52.912;
const BUBBLE_CANDIDATE_CENTER_Y = 48.017;
const TOPIC_LOOKUP = new Map(
  DEBATE_SPEAKING_TIME.bubbleTopicOrder.map((topic) => [topic.id, topic]),
);
const CANDIDATE_LOOKUP = new Map(
  DEBATE_SPEAKING_TIME.candidateOrder.map((candidate) => [
    candidate.id,
    candidate,
  ]),
);

function splitTopicLabel(label: string) {
  const words = label.split(" ");
  if (words.length === 1) return [label];
  if (words.length === 2) return words;
  return [words.slice(0, 1).join(" "), words.slice(1).join(" ")];
}

export default function InteractiveDebateTopicBubbleChart({
  title,
  note,
  accessibilityLabels,
}: InteractiveDebateTopicBubbleChartProps) {
  const bubbleTemplate =
    accessibilityLabels?.bubbleTemplate ??
    "Speaking time by topic: {candidate} on {topic}";

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
      data-testid="debate-topic-bubble-chart"
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
        data-testid="debate-topic-bubble-chart-frame"
        style={{ width: "100%" }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: `${SOURCE_WIDTH} / ${SOURCE_HEIGHT}`,
          }}
        >
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${SOURCE_WIDTH} ${SOURCE_HEIGHT}`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          >
            {DEBATE_SPEAKING_TIME.bubbleTopicOrder.map((topic) => {
              const labelLines = splitTopicLabel(topic.label);
              const x = BUBBLE_GROUP_X + topic.left + BUBBLE_CIRCLE_CENTER_X;

              return (
                <text
                  key={topic.id}
                  x={x}
                  y={BUBBLE_TOPIC_Y}
                  textAnchor="middle"
                  fontFamily={FRANKLIN_STACK}
                  fontSize="14"
                  fontWeight="700"
                  fill="#000000"
                >
                  {labelLines.map((line, index) => (
                    <tspan
                      key={`${topic.id}-${line}`}
                      x={x}
                      dy={index === 0 ? 0 : 16}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            })}

            {DEBATE_SPEAKING_TIME.candidateOrder.map((candidate) => (
              <text
                key={candidate.id}
                x={BUBBLE_LABEL_X}
                y={candidate.rowTop + BUBBLE_CANDIDATE_CENTER_Y + 5}
                textAnchor="end"
                fontFamily={FRANKLIN_STACK}
                fontSize="14"
                fontWeight="500"
                fill="#000000"
              >
                {candidate.label}
              </text>
            ))}
          </svg>

          <div
            style={{
              position: "absolute",
              inset: 0,
            }}
          >
            {DEBATE_SPEAKING_TIME.bubbles.map((bubble) => {
              const topic = TOPIC_LOOKUP.get(bubble.topicId);
              const candidate = CANDIDATE_LOOKUP.get(bubble.candidateId);
              if (!topic || !candidate) return null;

              const size = bubble.diameter;
              const left =
                BUBBLE_GROUP_X + topic.left + BUBBLE_CIRCLE_CENTER_X - size / 2;
              const top =
                candidate.rowTop + BUBBLE_CANDIDATE_CENTER_Y - size / 2;

              return (
                <div
                  key={`${bubble.candidateId}-${bubble.topicId}`}
                  aria-label={fillTemplate(bubbleTemplate, {
                    candidate: candidate.label,
                    topic: topic.label,
                  })}
                  title={fillTemplate(bubbleTemplate, {
                    candidate: candidate.label,
                    topic: topic.label,
                  })}
                  style={{
                    position: "absolute",
                    left: `${(left / SOURCE_WIDTH) * 100}%`,
                    top: `${(top / SOURCE_HEIGHT) * 100}%`,
                    width: `${(size / SOURCE_WIDTH) * 100}%`,
                    height: `${(size / SOURCE_HEIGHT) * 100}%`,
                    borderRadius: "50%",
                    backgroundColor: topic.color,
                    backgroundImage: `url(${candidate.grayscaleImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.18)",
                  }}
                />
              );
            })}
          </div>
        </div>
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
