"use client";

import type { RoundResult } from "@/lib/flashback/manager";

const TOTAL_ROUNDS = 7; // 8 events minus anchor

interface ProgressBarProps {
  currentRound: number;
  roundResults: RoundResult[];
}

export default function ProgressBar({ currentRound, roundResults }: ProgressBarProps) {
  const segments: Array<"correct" | "incorrect" | "current" | "pending"> = [];

  for (let i = 1; i <= TOTAL_ROUNDS; i++) {
    const result = roundResults.find((r) => r.round === i);
    if (result) {
      segments.push(result.isCorrect ? "correct" : "incorrect");
    } else if (i === currentRound) {
      segments.push("current");
    } else {
      segments.push("pending");
    }
  }

  const completedCount = roundResults.length;

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--fb-text-muted)" }}
        >
          {completedCount} of {TOTAL_ROUNDS}
        </span>
      </div>
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
        {segments.map((seg, i) => {
          const color =
            seg === "correct"
              ? "var(--fb-correct)"
              : seg === "incorrect"
                ? "var(--fb-incorrect)"
                : seg === "current"
                  ? "var(--fb-accent)"
                  : "var(--fb-timeline)";
          return (
            <div
              key={i}
              className="flex-1 transition-colors duration-300"
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
    </div>
  );
}
