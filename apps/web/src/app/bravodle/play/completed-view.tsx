"use client";

import { Fragment } from "react";
import { BRAVODLE_BOARD_COLUMNS, type BravodleStatsSummary } from "@/lib/bravodle/types";
import type { BravodleGuess } from "@/lib/bravodle/types";

const TILE_SUCCESS_COLOR = "#60811F";
const TILE_NEUTRAL_COLOR = "#5D5F63";
const DEFAULT_SHARE_COLUMNS = BRAVODLE_BOARD_COLUMNS.filter((column) => column.key !== "guess");

const VERDICT_EMOJI_MAP: Record<string, string> = {
  correct: "🟩",
  partial: "🟨",
  incorrect: "⬛",
  multi: "🟪",
  unknown: "⬜",
  guess: "⬜",
};

export type ShareStatus = "idle" | "success" | "error";

export interface BravodleCompletedViewProps {
  open: boolean;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  stats: BravodleStatsSummary | null;
  todayGuessNumber: number | null;
  maxGuesses: number;
  isWin: boolean;
  onShare: () => void;
  shareStatus: ShareStatus;
  shareDisabled?: boolean;
  shareColumns?: Array<{ key: string; label: string }>;
  hideGuessDistribution?: boolean;
}

export function buildShareText(
  puzzleDate: string | null,
  guesses: BravodleGuess[],
  maxGuesses: number,
  solvedGuessNumber: number | null,
  columns: Array<{ key: string; label: string }> = DEFAULT_SHARE_COLUMNS,
): string {
  const header = `Bravodle ${puzzleDate ?? ""}`.trim();
  const resultToken = `${solvedGuessNumber !== null ? solvedGuessNumber : "X"}/${maxGuesses}`;
  const grid = guesses
    .map((guess) => {
      const verdicts = columns.map((column) => {
        const field = guess.fields.find((entry) => entry.key === column.key);
        const verdictKey = field?.verdict ?? "unknown";
        return VERDICT_EMOJI_MAP[verdictKey] ?? VERDICT_EMOJI_MAP.unknown;
      }).join("");
      return verdicts;
    })
    .join("\n");

  return `${header} ${resultToken}`.trim() + (grid ? `\n${grid}` : "");
}

export function BravodleCompletedView({
  open,
  loading,
  error,
  onClose,
  stats,
  todayGuessNumber,
  maxGuesses,
  isWin,
  onShare,
  shareStatus,
  shareDisabled = false,
  hideGuessDistribution = false,
}: BravodleCompletedViewProps) {
  if (!open) return null;

  const played = stats?.played ?? 0;
  const winPercent = stats?.winPercent ?? 0;
  const currentStreak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;
  const guessDistribution = stats?.guessDistribution ?? {};

  const distributionRows = Array.from({ length: maxGuesses }, (_, index) => {
    const guessNumber = index + 1;
    const count = guessDistribution[guessNumber] ?? 0;
    return { guessNumber, count };
  });

  const maxDistributionCount = Math.max(...distributionRows.map((row) => row.count), 1);

  const headingText = isWin ? "Congratulations!" : "Nice try!";
  const badgeColor = isWin ? TILE_SUCCESS_COLOR : TILE_NEUTRAL_COLOR;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 px-4 py-10">
      <div className="relative w-full max-w-[520px] rounded-lg bg-white px-8 pt-10 pb-12 shadow-[0px_4px_23px_rgba(0,0,0,0.2)] outline outline-1 outline-offset-[-1px] outline-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-black transition hover:opacity-80"
        >
          <span>Back to puzzle</span>
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.2364 6.05781L15.0614 4.88281L10.4031 9.54115L5.74475 4.88281L4.56975 6.05781L9.22808 10.7161L4.56975 15.3745L5.74475 16.5495L10.4031 11.8911L15.0614 16.5495L16.2364 15.3745L11.5781 10.7161L16.2364 6.05781Z" fill="currentColor" />
          </svg>
        </button>

        <div className="flex flex-col items-center gap-6 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-sm"
            style={{ backgroundColor: badgeColor }}
          />

          <div className="space-y-1">
            <h2 className="font-['NYTKarnak_Condensed'] text-3xl font-bold leading-none text-black">{headingText}</h2>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-black">Statistics</p>
          </div>

          {loading ? (
            <p className="py-6 text-sm text-gray-600">Loading your stats…</p>
          ) : error ? (
            <p className="py-6 text-sm text-red-600">{error}</p>
          ) : (
            <Fragment>
              <div className="grid w-full grid-cols-4 gap-3">
                <StatBlock label="Played" value={played} />
                <StatBlock label="Win %" value={winPercent} />
                <StatBlock label="Current Streak" value={currentStreak} multiline />
                <StatBlock label="Max Streak" value={longestStreak} multiline />
              </div>

              {hideGuessDistribution ? (
                <p className="w-full text-sm text-gray-600">
                  Guess distribution updates after you finish today&apos;s puzzle.
                </p>
              ) : (
                <div className="w-full text-left">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-black">Guess Distribution</p>
                  <div className="mt-4 space-y-2">
                    {distributionRows.map(({ guessNumber, count }) => {
                      const isToday = todayGuessNumber === guessNumber && isWin;
                      return (
                        <GuessDistributionRow
                          key={guessNumber}
                          guessNumber={guessNumber}
                          count={count}
                          maxCount={maxDistributionCount}
                          highlight={isToday}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </Fragment>
          )}

          <div className="mt-6 w-full">
            <button
              type="button"
              onClick={onShare}
              disabled={loading || shareDisabled}
              className="mx-auto flex h-11 w-48 items-center justify-center gap-2 rounded-full bg-[#60811F] text-base font-bold uppercase tracking-wide text-white transition hover:bg-[#4e6d18] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Share
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.92 14.1103C15.2866 14.1103 14.72 14.3603 14.2867 14.752L8.34498 11.2936C8.38665 11.102 8.41998 10.9103 8.41998 10.7103C8.41998 10.5103 8.38665 10.3186 8.34498 10.127L14.22 6.70195C14.67 7.11862 15.2616 7.37695 15.92 7.37695C17.3033 7.37695 18.42 6.26029 18.42 4.87695C18.42 3.49362 17.3033 2.37695 15.92 2.37695C14.5366 2.37695 13.42 3.49362 13.42 4.87695C13.42 5.07695 13.4533 5.26862 13.495 5.46029L7.61998 8.88529C7.16998 8.46862 6.57832 8.21029 5.91998 8.21029C4.53665 8.21029 3.41998 9.32695 3.41998 10.7103C3.41998 12.0936 4.53665 13.2103 5.91998 13.2103C6.57832 13.2103 7.16998 12.952 7.61998 12.5353L13.5533 16.002C13.5116 16.177 13.4866 16.3603 13.4866 16.5436C13.4866 17.8853 14.5783 18.977 15.92 18.977C17.2616 18.977 18.3533 17.8853 18.3533 16.5436C18.3533 15.202 17.2616 14.1103 15.92 14.1103ZM15.92 4.04362C16.3783 4.04362 16.7533 4.41862 16.7533 4.87695C16.7533 5.33529 16.3783 5.71029 15.92 5.71029C15.4616 5.71029 15.0866 5.33529 15.0866 4.87695C15.0866 4.41862 15.4616 4.04362 15.92 4.04362ZM5.91998 11.5436C5.46165 11.5436 5.08665 11.1686 5.08665 10.7103C5.08665 10.252 5.46165 9.87695 5.91998 9.87695C6.37832 9.87695 6.75332 10.252 6.75332 10.7103C6.75332 11.1686 6.37832 11.5436 5.91998 11.5436ZM15.92 17.3936C15.4616 17.3936 15.0866 17.0186 15.0866 16.5603C15.0866 16.102 15.4616 15.727 15.92 15.727C16.3783 15.727 16.7533 16.102 16.7533 16.5603C16.7533 17.0186 16.3783 17.3936 15.92 17.3936Z" fill="white" />
              </svg>
            </button>
            {shareStatus === "success" && (
              <p className="mt-2 text-center text-xs font-semibold text-[#60811F]">Copied to clipboard!</p>
            )}
            {shareStatus === "error" && (
              <p className="mt-2 text-center text-xs font-semibold text-red-600">Unable to share result.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: number | string;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <span className="font-['TN_Web_Use_Only'] text-5xl font-medium tracking-[0.2em] text-black">
        {value}
      </span>
      <span
        className={`text-center text-xs font-medium uppercase tracking-[0.28em] text-black ${
          multiline ? "leading-tight" : "leading-none"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function GuessDistributionRow({
  guessNumber,
  count,
  maxCount,
  highlight,
}: {
  guessNumber: number;
  count: number;
  maxCount: number;
  highlight: boolean;
}) {
  const baseWidth = maxCount > 0 ? Math.max((count / maxCount) * 100, 10) : 10;
  const backgroundColor = highlight ? TILE_SUCCESS_COLOR : TILE_NEUTRAL_COLOR;

  return (
    <div className="flex items-center gap-3">
      <span className="w-3 text-right text-xs font-bold uppercase tracking-[0.2em] text-black">{guessNumber}</span>
      <div className="flex-1">
        <div
          className="relative flex h-5 items-center justify-end rounded-sm px-2 text-xs font-bold text-white"
          style={{
            width: `${baseWidth}%`,
            maxWidth: "100%",
            backgroundColor,
          }}
        >
          <span>{count}</span>
        </div>
      </div>
    </div>
  );
}

export default BravodleCompletedView;
