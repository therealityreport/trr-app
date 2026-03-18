"use client";

interface YearBadgeProps {
  year: number;
  isCorrect: boolean | null;
  revealed: boolean;
}

export default function YearBadge({ year, isCorrect, revealed }: YearBadgeProps) {
  if (!revealed) return null;

  const bgColor =
    isCorrect === true
      ? "var(--fb-correct)"
      : isCorrect === false
        ? "var(--fb-incorrect)"
        : "var(--fb-accent)";

  return (
    <span
      className="animate-badge-appear inline-flex items-center justify-center rounded-full px-3 py-0.5 text-xs font-bold text-white"
      style={{ backgroundColor: bgColor }}
    >
      {year}
    </span>
  );
}
