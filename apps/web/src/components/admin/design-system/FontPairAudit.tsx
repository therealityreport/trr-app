"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { GENERATED_GLYPH_COMPARISON_ARTIFACT } from "@/lib/fonts/brand-fonts/glyph-comparison.ts";
import type { ResolvedFontAsset } from "@/lib/fonts/brand-fonts/types";

const SAMPLE_TEXT_HEADING = "The Reality Report";
const SAMPLE_TEXT_BODY =
  "Rank the cast, predict the drama, and compare your take with fans nationwide.";

function scoreBadgeClass(score: number): string {
  if (score >= 85) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (score >= 70) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-rose-50 text-rose-800 ring-rose-200";
}

function scoreBarColor(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-rose-500";
}

function glyphClass(similarity: number): string {
  return similarity >= 75
    ? "bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-200"
    : "bg-rose-50 text-rose-900 ring-1 ring-inset ring-rose-200";
}

function kerningDeltaClass(deltaEm: number): string {
  if (Math.abs(deltaEm) <= 0.02) return "text-zinc-500";
  return deltaEm < 0 ? "text-rose-700" : "text-sky-700";
}

function candidateSourceLabel(value: "metadata" | "current-substitute"): string {
  return value === "current-substitute" ? "current substitute" : "metadata";
}

function pairId(pair: (typeof GENERATED_GLYPH_COMPARISON_ARTIFACT.pairs)[number]): string {
  return `${pair.brandId}:${pair.roleLabel}:${pair.candidateFamily}`;
}

function closestWeight(pair: (typeof GENERATED_GLYPH_COMPARISON_ARTIFACT.pairs)[number]): number {
  const sourceWeight = pair.sourceWeight ?? 400;
  return (
    [...pair.perWeight].sort((left, right) => {
      const leftDiff = Math.abs(left.weight - sourceWeight);
      const rightDiff = Math.abs(right.weight - sourceWeight);
      if (leftDiff !== rightDiff) return leftDiff - rightDiff;
      return right.overallScore - left.overallScore;
    })[0]?.weight ?? pair.perWeight[0]?.weight ?? 400
  );
}

function formatResolvedAsset(asset?: ResolvedFontAsset): string | null {
  if (!asset) return null;
  const width = asset.resolvedWidth === "normal" ? "" : ` · ${asset.resolvedWidth}`;
  return `${asset.resolvedFamilyName} · ${asset.resolvedWeight} ${asset.resolvedStyle}${width}`;
}

export default function FontPairAudit() {
  const pairs = useMemo(
    () => [...GENERATED_GLYPH_COMPARISON_ARTIFACT.pairs].sort((left, right) => right.aggregateVisualAffinity - left.aggregateVisualAffinity),
    [],
  );
  const [activePairId, setActivePairId] = useState<string>(pairs[0] ? pairId(pairs[0]) : "");
  const [activeWeight, setActiveWeight] = useState<number>(pairs[0] ? closestWeight(pairs[0]) : 400);
  const [letterSpacingEm, setLetterSpacingEm] = useState(0);
  const [previewSize, setPreviewSize] = useState(28);

  const pair = useMemo(
    () => pairs.find((candidate) => pairId(candidate) === activePairId) ?? pairs[0] ?? null,
    [activePairId, pairs],
  );
  const weightComparison = useMemo(
    () => pair?.perWeight.find((candidate) => candidate.weight === activeWeight) ?? pair?.perWeight[0] ?? null,
    [activeWeight, pair],
  );

  useEffect(() => {
    if (!pair) return;
    const defaultWeight = closestWeight(pair);
    setActiveWeight(defaultWeight);
  }, [activePairId, pair]);

  useEffect(() => {
    setLetterSpacingEm(pair?.kerning.recommendedLetterSpacingEm ?? 0);
  }, [pair, activeWeight]);

  if (!pair || !weightComparison) {
    return (
      <section className="mb-8" data-testid="font-pair-audit">
        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <h2 className="text-[15px] font-bold tracking-tight text-zinc-950">Font pair audit</h2>
          <p className="mt-1 text-[13px] text-zinc-500">
            No glyph-comparison artifact is available yet. Run the glyph comparison script to populate this audit.
          </p>
        </div>
      </section>
    );
  }

  const spacingStyle: CSSProperties = {
    letterSpacing: letterSpacingEm === 0 ? "normal" : `${letterSpacingEm}em`,
  };
  const referenceFamily = pair.resolvedSourceFamily ?? pair.sourceFamily;
  const referenceWeight = pair.sourceWeight ?? 400;
  const upperGlyphs = weightComparison.glyphs.filter((glyph) => glyph.category === "upper");
  const lowerGlyphs = weightComparison.glyphs.filter((glyph) => glyph.category === "lower");
  const numeralGlyphs = weightComparison.glyphs.filter((glyph) => glyph.category === "numeral");

  return (
    <section className="mb-8" data-testid="font-pair-audit">
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-zinc-950">
              Font pair audit
            </h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">
              Computed glyph and kerning comparison from the offline visual-affinity artifact.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pairs.map((candidate) => (
              <button
                key={pairId(candidate)}
                type="button"
                onClick={() => setActivePairId(pairId(candidate))}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                  activePairId === pairId(candidate)
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {candidate.sourceFamily} → {candidate.candidateFamily}
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    activePairId === pairId(candidate)
                      ? "bg-white/20 text-white"
                      : `${scoreBadgeClass(candidate.aggregateVisualAffinity)} ring-1 ring-inset`
                  }`}
                >
                  {candidate.aggregateVisualAffinity}%
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-zinc-100 px-5 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                  {pair.brandLabel}
                </span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                  {pair.roleType}
                </span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                  {candidateSourceLabel(pair.candidateSource)}
                </span>
                <span>Reference: <span className="font-semibold text-zinc-900">{referenceFamily}</span></span>
                <span className="text-zinc-300">→</span>
                <span>Hosted: <span className="font-semibold text-zinc-900">{pair.candidateFamily}</span></span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                {pair.roleLabel} uses {referenceFamily} and is compared against {pair.candidateFamily} across the available hosted weights.
              </p>
              {pair.resolvedSourceAsset || pair.resolvedCandidateAsset ? (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-zinc-500">
                  {pair.resolvedSourceAsset ? (
                    <span className="rounded-md bg-white px-2 py-0.5 font-semibold ring-1 ring-inset ring-zinc-200">
                      source {formatResolvedAsset(pair.resolvedSourceAsset)}
                    </span>
                  ) : null}
                  {pair.resolvedCandidateAsset ? (
                    <span className="rounded-md bg-white px-2 py-0.5 font-semibold ring-1 ring-inset ring-zinc-200">
                      candidate {formatResolvedAsset(pair.resolvedCandidateAsset)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-shrink-0 flex-col items-end gap-1.5 lg:min-w-[180px]">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums tracking-tight text-zinc-950">
                  {pair.aggregateVisualAffinity}%
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  visual affinity
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full transition-all ${scoreBarColor(pair.aggregateVisualAffinity)}`}
                  style={{ width: `${pair.aggregateVisualAffinity}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-400">
                best weight {pair.kerning.weight} · recommended {pair.kerning.recommendedLetterSpacingEm >= 0 ? "+" : ""}{pair.kerning.recommendedLetterSpacingEm.toFixed(3)}em
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Uppercase</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-950">{weightComparison.uppercaseScore}%</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Lowercase</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-950">{weightComparison.lowercaseScore}%</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Numerals</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-950">{weightComparison.numeralScore}%</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Sentence</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-950">{weightComparison.sentenceScore}%</div>
            </div>
          </div>
        </div>

        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Candidate weights
            </p>
            {pair.perWeight.map((entry) => (
              <button
                key={entry.weight}
                type="button"
                onClick={() => setActiveWeight(entry.weight)}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold tabular-nums transition ${
                  activeWeight === entry.weight
                    ? "bg-zinc-950 text-white"
                    : "bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {entry.weight}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-zinc-400">
              source {referenceWeight} · active {weightComparison.weight}
            </span>
          </div>
        </div>

        <div className="border-b border-zinc-100 px-5 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Uppercase</p>
          <div className="grid gap-2 lg:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{referenceFamily}</div>
              <div className="flex flex-wrap gap-1">
                {upperGlyphs.map((glyph) => (
                  <span
                    key={`ref-upper-${glyph.char}`}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg ${glyphClass(glyph.similarity)}`}
                    style={{ fontFamily: `"${referenceFamily}", serif`, fontWeight: referenceWeight }}
                  >
                    {glyph.char}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{pair.candidateFamily}</div>
              <div className="flex flex-wrap gap-1">
                {upperGlyphs.map((glyph) => (
                  <span
                    key={`sub-upper-${glyph.char}`}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg ${glyphClass(glyph.similarity)}`}
                    style={{ fontFamily: `"${pair.candidateFamily}", serif`, fontWeight: weightComparison.weight, ...spacingStyle }}
                  >
                    {glyph.char}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-zinc-100 px-5 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Lowercase</p>
          <div className="grid gap-2 lg:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{referenceFamily}</div>
              <div className="flex flex-wrap gap-1">
                {lowerGlyphs.map((glyph) => (
                  <span
                    key={`ref-lower-${glyph.char}`}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg ${glyphClass(glyph.similarity)}`}
                    style={{ fontFamily: `"${referenceFamily}", serif`, fontWeight: referenceWeight }}
                  >
                    {glyph.char}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{pair.candidateFamily}</div>
              <div className="flex flex-wrap gap-1">
                {lowerGlyphs.map((glyph) => (
                  <span
                    key={`sub-lower-${glyph.char}`}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg ${glyphClass(glyph.similarity)}`}
                    style={{ fontFamily: `"${pair.candidateFamily}", serif`, fontWeight: weightComparison.weight, ...spacingStyle }}
                  >
                    {glyph.char}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-zinc-100 px-5 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Numerals</p>
          <div className="grid gap-2 lg:grid-cols-2">
            <div className="flex flex-wrap gap-1">
              {numeralGlyphs.map((glyph) => (
                <span
                  key={`num-ref-${glyph.char}`}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg ${glyphClass(glyph.similarity)}`}
                  style={{ fontFamily: `"${referenceFamily}", serif`, fontWeight: referenceWeight }}
                >
                  {glyph.char}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {numeralGlyphs.map((glyph) => (
                <span
                  key={`num-sub-${glyph.char}`}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg ${glyphClass(glyph.similarity)}`}
                  style={{ fontFamily: `"${pair.candidateFamily}", serif`, fontWeight: weightComparison.weight, ...spacingStyle }}
                >
                  {glyph.char}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="mb-3 flex flex-wrap items-end gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Kerning recommendation
            </p>
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="tabular-nums">letter-spacing: {letterSpacingEm.toFixed(3)}em</span>
              <input
                type="range"
                min={-0.05}
                max={0.1}
                step={0.001}
                value={letterSpacingEm}
                onChange={(event) => setLetterSpacingEm(Number(event.target.value))}
                className="h-1.5 w-32 cursor-pointer accent-zinc-900"
              />
            </label>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {pair.kerning.pairs.map((entry) => (
              <div key={entry.pair} className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-[12px]">
                <div className="font-semibold text-zinc-900">{entry.pair}</div>
                <div className="mt-1 text-zinc-500">source {entry.sourceKerning.toFixed(3)} · candidate {entry.candidateKerning.toFixed(3)}</div>
                <div className={`mt-1 font-medium ${kerningDeltaClass(entry.deltaEm)}`}>
                  delta {entry.deltaEm >= 0 ? "+" : ""}{entry.deltaEm.toFixed(3)}em
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Sample text
            </p>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
              letter-spacing: {letterSpacingEm >= 0 ? "+" : ""}{letterSpacingEm.toFixed(3)}em
            </span>
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="tabular-nums">size: {previewSize}px</span>
              <input
                type="range"
                min={14}
                max={64}
                step={1}
                value={previewSize}
                onChange={(event) => setPreviewSize(Number(event.target.value))}
                className="h-1.5 w-24 cursor-pointer accent-zinc-900"
              />
            </label>
          </div>

          <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-[12px] text-zinc-600">
            <span className="font-semibold text-zinc-900">Sentence comparison:</span>{" "}
            {weightComparison.sentenceComparison.text}
            <span className="ml-2 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-700 ring-1 ring-inset ring-zinc-200">
              {weightComparison.sentenceComparison.similarity}%
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                {referenceFamily}
              </div>
              <p
                className="text-zinc-950 leading-snug"
                style={{
                  fontFamily: `"${referenceFamily}", serif`,
                  fontWeight: referenceWeight,
                  fontSize: `${previewSize}px`,
                }}
              >
                {SAMPLE_TEXT_HEADING}
              </p>
              <p
                className="mt-2 text-zinc-700 leading-relaxed"
                style={{
                  fontFamily: `"${referenceFamily}", serif`,
                  fontWeight: 400,
                  fontSize: `${Math.max(14, previewSize * 0.55)}px`,
                }}
              >
                {SAMPLE_TEXT_BODY}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                {pair.candidateFamily}
              </div>
              <p
                className="text-zinc-950 leading-snug"
                style={{
                  fontFamily: `"${pair.candidateFamily}", serif`,
                  fontWeight: weightComparison.weight,
                  fontSize: `${previewSize}px`,
                  ...spacingStyle,
                }}
              >
                {SAMPLE_TEXT_HEADING}
              </p>
              <p
                className="mt-2 text-zinc-700 leading-relaxed"
                style={{
                  fontFamily: `"${pair.candidateFamily}", serif`,
                  fontWeight: 400,
                  fontSize: `${Math.max(14, previewSize * 0.55)}px`,
                  ...spacingStyle,
                }}
              >
                {SAMPLE_TEXT_BODY}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
