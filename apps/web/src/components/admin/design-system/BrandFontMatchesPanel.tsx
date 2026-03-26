"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getGeneratedBrandFontMatchesApiResponse } from "@/lib/fonts/brand-fonts";
import type {
  BrandFontMatchesApiResponse,
  BrandFontMatchResult,
  ConfidenceLevel,
  Provenance,
  ResolvedFontAsset,
  ScoreBreakdown,
  ScoreBreakdownProfile,
  ScoringMode,
} from "@/lib/fonts/brand-fonts/types";

type Props = {
  comparisonIds: string[];
  onToggleComparison: (fontId: string) => void;
  onViewCatalog: (familyName: string) => void;
  refreshToken: number;
  onRefreshStateChange?: (isRefreshing: boolean) => void;
};

type MatchFilterMode = "all" | "current-substitute" | "warnings";

function badgeTone(kind: "provenance" | "confidence" | "fit", value: string): string {
  if (kind === "confidence") {
    if (value === "high") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (value === "medium") return "bg-amber-50 text-amber-700 ring-amber-200";
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  if (kind === "fit") {
    if (value === "strong") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (value === "acceptable") return "bg-amber-50 text-amber-700 ring-amber-200";
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  if (value === "explicit-mapping") return "bg-sky-50 text-sky-700 ring-sky-200";
  if (value === "design-doc-jsx") return "bg-violet-50 text-violet-700 ring-violet-200";
  if (value === "current-substitute") return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function rootSectionId(brandId: string): string {
  return brandId.split(":")[0] ?? brandId;
}

function summarizeEvidence(record: BrandFontMatchResult): string {
  if (record.evidencePath.type === "url") return record.evidencePath.href;
  const lineSuffix = record.evidencePath.lineHint ? `:${record.evidencePath.lineHint}` : "";
  return `${record.evidencePath.path}${lineSuffix}`;
}

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Font stack for the REFERENCE side — source font first, substitute as fallback only. */
function buildReferenceFontFamily(entry: BrandFontMatchResult): string {
  const generic = entry.roleType === "body" || entry.roleType === "caption" || entry.roleType === "ui" ? "Arial" : "Georgia";
  const families = [
    entry.sourceFontFamily,
    entry.currentReferenceSubstitute,
    generic,
    "serif",
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

  return families.map((family) => (family.includes(" ") ? `"${family}"` : family)).join(", ");
}

function inferSpecimenWeight(entry: BrandFontMatchResult): number {
  const signal = `${entry.evidenceExcerpt} ${entry.sourceFontFamily} ${entry.currentReferenceSubstitute ?? ""}`.toLowerCase();
  if (signal.includes("black") || signal.includes("extra bold") || signal.includes("extrabold") || signal.includes("ultra")) {
    return 800;
  }
  if (signal.includes("bold")) return 700;
  if (signal.includes("semi bold") || signal.includes("semibold") || signal.includes("demi")) return 600;
  if (signal.includes("medium")) return 500;
  return entry.roleType === "display" || entry.roleType === "headline" || entry.roleType === "logo-like" ? 700 : 400;
}

function inferSpecimenFontSize(entry: BrandFontMatchResult): string {
  if (entry.roleType === "display") return "1.75rem";
  if (entry.roleType === "headline") return "1.375rem";
  if (entry.roleType === "subhead") return "1.125rem";
  if (entry.roleType === "logo-like") return "1.5rem";
  return "1rem";
}

function inferSpecimenFontStyle(entry: BrandFontMatchResult): "normal" | "italic" {
  return entry.evidenceExcerpt.toLowerCase().includes("italic") ? "italic" : "normal";
}

/** Build CSS font-family for a matched hosted family name. */
function buildMatchFontFamily(familyName: string, roleType: string): string {
  const generic = roleType === "body" || roleType === "caption" || roleType === "ui" ? "sans-serif" : "serif";
  const quoted = familyName.includes(" ") ? `"${familyName}"` : familyName;
  return `${quoted}, ${generic}`;
}

const COMPARISON_SAMPLE = "The Reality Report";

function buildSpecimenText(entry: BrandFontMatchResult): string {
  const excerpt = entry.evidenceExcerpt.trim();
  if (!excerpt) return COMPARISON_SAMPLE;
  if (excerpt.length > 48) return COMPARISON_SAMPLE;
  if (/[|*]|→|&rarr;|https?:\/\//.test(excerpt)) return COMPARISON_SAMPLE;
  return excerpt;
}

const SCORE_BREAKDOWN_SECTIONS: Array<{
  title: string;
  totalKey: keyof Pick<ScoreBreakdown, "structuralTotal" | "identityTotal" | "visualTotal" | "penaltyTotal">;
  tone: "zinc" | "emerald" | "sky" | "rose";
  rows: Array<{
    key: keyof Pick<
      ScoreBreakdown,
      "classification" | "role" | "width" | "weightCoverage" | "styleSupport" | "traitCompatibility" | "familyName" | "visualAffinity" | "riskPenalty"
    >;
    label: string;
  }>;
}> = [
  {
    title: "Structural",
    totalKey: "structuralTotal",
    tone: "zinc",
    rows: [
      { key: "classification", label: "Classification" },
      { key: "role", label: "Role" },
      { key: "width", label: "Width" },
      { key: "weightCoverage", label: "Weight coverage" },
      { key: "styleSupport", label: "Style support" },
      { key: "traitCompatibility", label: "Trait compatibility" },
    ],
  },
  {
    title: "Identity",
    totalKey: "identityTotal",
    tone: "emerald",
    rows: [{ key: "familyName", label: "Family name" }],
  },
  {
    title: "Visual",
    totalKey: "visualTotal",
    tone: "sky",
    rows: [{ key: "visualAffinity", label: "Visual affinity" }],
  },
  {
    title: "Penalty",
    totalKey: "penaltyTotal",
    tone: "rose",
    rows: [{ key: "riskPenalty", label: "Risk penalty" }],
  },
];

function scoringModeLabel(value: ScoringMode | undefined): string {
  return value === "visual+metadata" ? "visual+metadata" : "metadata-only";
}

function profileLabel(value: ScoreBreakdownProfile): string {
  if (value === "explicit-mapping-visual") return "explicit-mapping-visual";
  if (value === "balanced-visual") return "balanced-visual";
  return "metadata-only";
}

function profileMaxima(profile: ScoreBreakdownProfile): Record<string, number> {
  if (profile === "explicit-mapping-visual") {
    return {
      classification: 6,
      role: 10,
      width: 10,
      weightCoverage: 7,
      styleSupport: 4,
      traitCompatibility: 3,
      familyName: 5,
      visualAffinity: 55,
      riskPenalty: 20,
      structuralTotal: 40,
      identityTotal: 5,
      visualTotal: 55,
      penaltyTotal: 20,
    };
  }
  if (profile === "balanced-visual") {
    return {
      classification: 12,
      role: 18,
      width: 14,
      weightCoverage: 10,
      styleSupport: 6,
      traitCompatibility: 5,
      familyName: 10,
      visualAffinity: 25,
      riskPenalty: 20,
      structuralTotal: 65,
      identityTotal: 10,
      visualTotal: 25,
      penaltyTotal: 20,
    };
  }
  return {
    classification: 17,
    role: 25,
    width: 19,
    weightCoverage: 14,
    styleSupport: 8,
    traitCompatibility: 7,
    familyName: 10,
    visualAffinity: 0,
    riskPenalty: 20,
    structuralTotal: 90,
    identityTotal: 10,
    visualTotal: 0,
    penaltyTotal: 20,
  };
}

function visualEvidenceTone(status: BrandFontMatchesApiResponse["visualEvidence"]["status"]): string {
  if (status === "fresh") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "stale") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-rose-50 text-rose-800 ring-rose-200";
}

function formatResolvedAsset(asset?: ResolvedFontAsset): string | null {
  if (!asset) return null;
  const width = asset.resolvedWidth === "normal" ? "" : ` · ${asset.resolvedWidth}`;
  return `${asset.resolvedFamilyName} · ${asset.resolvedWeight} ${asset.resolvedStyle}${width}`;
}

function sectionToneClass(tone: "zinc" | "emerald" | "sky" | "rose", negative = false): string {
  if (negative || tone === "rose") return "bg-rose-400";
  if (tone === "emerald") return "bg-emerald-500";
  if (tone === "sky") return "bg-sky-500";
  return "bg-zinc-900";
}

function ScoreBreakdownBars({ breakdown }: { breakdown: ScoreBreakdown }) {
  const maxima = profileMaxima(breakdown.profile);

  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-white/80 px-3 py-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          Weighted score breakdown
        </div>
        <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 ring-1 ring-inset ring-zinc-200">
          {profileLabel(breakdown.profile)}
        </span>
      </div>
      <div className="space-y-3">
        {SCORE_BREAKDOWN_SECTIONS.map((section) => {
          const sectionMax = maxima[section.totalKey];
          const sectionValue = Math.abs(breakdown[section.totalKey]);
          const sectionWidth = sectionMax > 0
            ? `${Math.min(100, Math.round((sectionValue / sectionMax) * 100))}%`
            : "0%";

          return (
            <div key={section.title} className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {section.title}
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-zinc-700">
                  {breakdown[section.totalKey]}/{section.title === "Penalty" ? `-${sectionMax}` : sectionMax}
                </span>
              </div>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${sectionToneClass(section.tone, section.title === "Penalty")}`}
                  style={{ width: sectionWidth }}
                />
              </div>
              <div className="space-y-2">
                {section.rows.map(({ key, label }) => {
                  const rawValue = breakdown[key];
                  const magnitude = Math.abs(rawValue);
                  const max = maxima[key];
                  const width = max > 0 ? `${Math.min(100, Math.round((magnitude / max) * 100))}%` : "0%";
                  const negative = rawValue < 0;

                  return (
                    <div key={key} className="grid grid-cols-[120px_minmax(0,1fr)_64px] items-center gap-2 text-[11px]">
                      <span className="text-zinc-500">{label}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className={`h-full rounded-full ${sectionToneClass(section.tone, negative)}`}
                          style={{ width }}
                        />
                      </div>
                      <span className="text-right tabular-nums text-zinc-600">
                        {rawValue}/{negative ? `-${max}` : max}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[12px] font-semibold text-zinc-900">
        <span>Total</span>
        <span className="tabular-nums">{breakdown.total}</span>
      </div>
    </div>
  );
}

export default function BrandFontMatchesPanel({
  comparisonIds,
  onToggleComparison,
  onViewCatalog,
  refreshToken,
  onRefreshStateChange,
}: Props) {
  const [brandFilter, setBrandFilter] = useState("all");
  const [roleTypeFilter, setRoleTypeFilter] = useState("all");
  const [provenanceFilter, setProvenanceFilter] = useState<"all" | Provenance>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | ConfidenceLevel>("all");
  const [matchFilter, setMatchFilter] = useState<MatchFilterMode>("all");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [matchesResponse, setMatchesResponse] = useState<BrandFontMatchesApiResponse>(
    () => getGeneratedBrandFontMatchesApiResponse(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const allMatches = matchesResponse.matches;

  useEffect(() => {
    if (refreshToken <= 0) return undefined;

    const controller = new AbortController();
    setIsRefreshing(true);
    setRefreshError(null);
    onRefreshStateChange?.(true);

    fetch("/api/admin/design-system/brand-font-matches?refresh=1", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          let message = `refresh failed (${response.status})`;
          try {
            const payload = await response.json();
            if (typeof payload?.error === "string") {
              message = payload.error;
            }
          } catch {}
          throw new Error(message);
        }
        return response.json() as Promise<BrandFontMatchesApiResponse>;
      })
      .then((payload) => {
        setMatchesResponse(payload);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setRefreshError(error instanceof Error ? error.message : "refresh failed");
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsRefreshing(false);
        onRefreshStateChange?.(false);
      });

    return () => {
      controller.abort();
      onRefreshStateChange?.(false);
    };
  }, [refreshToken, onRefreshStateChange]);

  const brands = useMemo(
    () => [...new Set(allMatches.map((entry) => entry.brandLabel))].sort((left, right) => left.localeCompare(right)),
    [allMatches],
  );

  const filtered = useMemo(() => {
    return allMatches.filter((entry) => {
      if (brandFilter !== "all" && entry.brandLabel !== brandFilter) return false;
      if (roleTypeFilter !== "all" && entry.roleType !== roleTypeFilter) return false;
      if (provenanceFilter !== "all" && entry.provenance !== provenanceFilter) return false;
      if (confidenceFilter !== "all" && entry.confidence !== confidenceFilter) return false;
      if (matchFilter === "current-substitute" && !entry.matches.some((match) => match.matchSource === "current-substitute")) return false;
      if (matchFilter === "warnings" && !entry.matches.some((match) => match.matchWarnings.length > 0)) return false;
      return true;
    });
  }, [allMatches, brandFilter, roleTypeFilter, provenanceFilter, confidenceFilter, matchFilter]);

  return (
    <section className="mb-10" data-testid="brand-font-matches-panel">
      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-zinc-950">
              Brand font matches
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
              Audit provenance, confidence, evidence, and score math for each brand typography role, then pin the top hosted match into the comparison tray.
            </p>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-zinc-400">
              Rebuild Rankings re-scores against the local catalog and current rules. It does not run glyph comparison.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs tabular-nums text-zinc-500">
            <span>{filtered.length} visible</span>
            <span className="text-zinc-300">·</span>
            <span>{matchesResponse.matchedCount} matched</span>
            <span className="text-zinc-300">·</span>
            <span>{matchesResponse.refreshMode === "local-rerank" ? "local-rerank" : "artifact"}</span>
            <span className="text-zinc-300">·</span>
            <span>{scoringModeLabel(matchesResponse.scoringMode)}</span>
            <span className="text-zinc-300">·</span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${visualEvidenceTone(matchesResponse.visualEvidence.status)}`}>
              visual {matchesResponse.visualEvidence.status}
            </span>
            <span className="text-zinc-300">·</span>
            <span>{formatGeneratedAt(matchesResponse.generatedAt)}</span>
            {isRefreshing ? (
              <span className="ml-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                Refreshing...
              </span>
            ) : null}
          </div>
        </div>

        {refreshError ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            Refresh failed, still showing the last available results. {refreshError}
          </div>
        ) : null}

        {matchesResponse.visualEvidence.status !== "fresh" ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            Visual evidence is {matchesResponse.visualEvidence.status}. Rebuild Rankings only reranks locally; it does not regenerate glyph comparison. Current reason: {matchesResponse.visualEvidence.reason}.
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Brand
            <select
              value={brandFilter}
              onChange={(event) => setBrandFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-sm font-medium normal-case tracking-normal text-zinc-900 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200"
            >
              <option value="all">All brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Role Type
            <select
              value={roleTypeFilter}
              onChange={(event) => setRoleTypeFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-sm font-medium normal-case tracking-normal text-zinc-900 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200"
            >
              <option value="all">All role types</option>
              <option value="display">Display</option>
              <option value="headline">Headline</option>
              <option value="subhead">Subhead</option>
              <option value="body">Body</option>
              <option value="ui">UI</option>
              <option value="caption">Caption</option>
              <option value="logo-like">Logo-like</option>
            </select>
          </label>

          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Provenance
            <select
              value={provenanceFilter}
              onChange={(event) => setProvenanceFilter(event.target.value as "all" | Provenance)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-sm font-medium normal-case tracking-normal text-zinc-900 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200"
            >
              <option value="all">All provenance</option>
              <option value="explicit-mapping">Explicit mapping</option>
              <option value="design-doc-jsx">Design-doc JSX</option>
              <option value="current-substitute">Current substitute</option>
              <option value="manual-inference">Manual inference</option>
            </select>
          </label>

          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Confidence
            <select
              value={confidenceFilter}
              onChange={(event) => setConfidenceFilter(event.target.value as "all" | ConfidenceLevel)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-sm font-medium normal-case tracking-normal text-zinc-900 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200"
            >
              <option value="all">All confidence</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Match Filter
            <select
              value={matchFilter}
              onChange={(event) => setMatchFilter(event.target.value as MatchFilterMode)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-sm font-medium normal-case tracking-normal text-zinc-900 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200"
            >
              <option value="all">All results</option>
              <option value="current-substitute">Current substitute candidate</option>
              <option value="warnings">Has warnings</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.map((entry) => {
          const topMatch = entry.matches[0];
          const extraMatches = entry.matches.slice(1);
          const expanded = expandedRows[`${entry.brandId}:${entry.roleLabel}`] ?? false;
          const brandSectionId = rootSectionId(entry.brandId);

          return (
            <article
              key={`${entry.brandId}:${entry.roleLabel}`}
              className="rounded-2xl border border-zinc-200 bg-white shadow-sm"
              data-testid={`brand-match-${entry.brandId}-${entry.roleLabel.replace(/\s+/g, "-")}`}
            >
              {/* ── Header: role + metadata ── */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-zinc-100 px-5 py-3">
                <h3 className="text-[15px] font-bold tracking-tight text-zinc-950">
                  {entry.roleLabel}
                </h3>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                  {entry.brandLabel}
                </span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                  {entry.roleType}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${badgeTone("provenance", entry.provenance)}`}>
                  {entry.provenance}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${badgeTone("confidence", entry.confidence)}`}>
                  {entry.confidence}
                </span>
                {topMatch ? (
                  <>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${badgeTone("fit", topMatch.fitForRole)}`}>
                      {topMatch.fitForRole}
                    </span>
                    <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-700 ring-1 ring-inset ring-zinc-200">
                      score {topMatch.score}
                    </span>
                  </>
                ) : null}
                <div className="ml-auto flex items-center gap-1.5">
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                    {summarizeEvidence(entry)}
                  </code>
                  <Link
                    href={`/admin/design-docs/${brandSectionId}#typography`}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    Brand ref
                  </Link>
                </div>
              </div>

              {/* ── Side-by-side font comparison ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Left — Reference / source font */}
                <div className="px-5 py-4 lg:border-r lg:border-zinc-100">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Reference — {entry.sourceFontFamily}
                  </div>
                  {/* Font name rendered in its own typeface */}
                  <div
                    className="text-xl tracking-tight text-zinc-950"
                    style={{
                      fontFamily: buildReferenceFontFamily(entry),
                      fontWeight: inferSpecimenWeight(entry),
                      fontStyle: inferSpecimenFontStyle(entry),
                    }}
                  >
                    {entry.sourceFontFamily}
                  </div>
                  {/* Sample text specimen */}
                  <div
                    className="mt-3 rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-3 text-zinc-950"
                    data-testid={`brand-specimen-${entry.brandId}-${entry.roleLabel.replace(/\s+/g, "-")}`}
                    style={{
                      fontFamily: buildReferenceFontFamily(entry),
                      fontSize: inferSpecimenFontSize(entry),
                      fontStyle: inferSpecimenFontStyle(entry),
                      fontWeight: inferSpecimenWeight(entry),
                      letterSpacing: entry.roleType === "caption" ? "0.01em" : "-0.01em",
                      lineHeight: entry.roleType === "display" ? 1.15 : 1.3,
                    }}
                  >
                    {buildSpecimenText(entry)}
                  </div>
                  <p
                    className="mt-2 text-zinc-600"
                    style={{
                      fontFamily: buildReferenceFontFamily(entry),
                      fontSize: "0.875rem",
                      fontWeight: 400,
                      lineHeight: 1.5,
                    }}
                  >
                    {entry.evidenceExcerpt}
                  </p>
                </div>

                {/* Right — Hosted match font */}
                <div className="border-t border-zinc-100 bg-zinc-50/40 px-5 py-4 lg:rounded-br-2xl lg:border-t-0">
                  {topMatch ? (
                    <>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                          Hosted match — {topMatch.familyName}
                        </span>
                        <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200">
                          {topMatch.matchSource}
                        </span>
                        {topMatch.matchSource === "current-substitute" ? (
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 ring-1 ring-inset ring-zinc-200">
                            included as current substitute
                          </span>
                        ) : null}
                        <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200">
                          {scoringModeLabel(topMatch.scoringMode)}
                        </span>
                      </div>
                      {topMatch.visualDiagnostics?.candidateAsset ? (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-zinc-500">
                          <span className="rounded-md bg-white px-2 py-0.5 font-semibold ring-1 ring-inset ring-zinc-200">
                            source {formatResolvedAsset(topMatch.visualDiagnostics.sourceAsset) ?? "unresolved"}
                          </span>
                          <span className="rounded-md bg-white px-2 py-0.5 font-semibold ring-1 ring-inset ring-zinc-200">
                            candidate {formatResolvedAsset(topMatch.visualDiagnostics.candidateAsset) ?? "unresolved"}
                          </span>
                        </div>
                      ) : topMatch.scoringMode === "metadata-only" ? (
                        <div className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900 ring-1 ring-inset ring-amber-200">
                          Metadata-only ranking. No compatible visual evidence is attached to this match.
                        </div>
                      ) : null}
                      {/* Font name rendered in its own typeface */}
                      <div
                        className="text-xl tracking-tight text-zinc-950"
                        style={{
                          fontFamily: buildMatchFontFamily(topMatch.familyName, entry.roleType),
                          fontWeight: inferSpecimenWeight(entry),
                          fontStyle: inferSpecimenFontStyle(entry),
                        }}
                      >
                        {topMatch.familyName}
                      </div>
                      {/* Sample text specimen */}
                      <div
                        className="mt-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-3 text-zinc-950"
                        style={{
                          fontFamily: buildMatchFontFamily(topMatch.familyName, entry.roleType),
                          fontSize: inferSpecimenFontSize(entry),
                          fontStyle: inferSpecimenFontStyle(entry),
                          fontWeight: inferSpecimenWeight(entry),
                          letterSpacing: entry.roleType === "caption" ? "0.01em" : "-0.01em",
                          lineHeight: entry.roleType === "display" ? 1.15 : 1.3,
                        }}
                      >
                        {buildSpecimenText(entry)}
                      </div>
                      <p
                        className="mt-2 text-zinc-600"
                        style={{
                          fontFamily: buildMatchFontFamily(topMatch.familyName, entry.roleType),
                          fontSize: "0.875rem",
                          fontWeight: 400,
                          lineHeight: 1.5,
                        }}
                      >
                        {entry.evidenceExcerpt}
                      </p>

                      {/* Chips + warnings */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {topMatch.rationaleChips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200"
                          >
                            {chip}
                          </span>
                        ))}
                        {topMatch.matchWarnings.map((warning) => (
                          <span
                            key={warning}
                            className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"
                          >
                            {warning}
                          </span>
                        ))}
                      </div>

                      <ScoreBreakdownBars breakdown={topMatch.scoreBreakdown} />

                      {/* Actions */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleComparison(topMatch.familyName)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            comparisonIds.includes(topMatch.familyName)
                              ? "bg-zinc-950 text-white"
                              : "bg-white text-zinc-700 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-100"
                          }`}
                        >
                          {comparisonIds.includes(topMatch.familyName) ? "Pinned" : "Compare"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewCatalog(topMatch.familyName)}
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-100"
                        >
                          Catalog
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      No credible match found. Entry visible for evidence audit.
                    </p>
                  )}
                </div>
              </div>

              {extraMatches.length > 0 ? (
                <div className="border-t border-zinc-100 px-5 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRows((current) => ({
                        ...current,
                        [`${entry.brandId}:${entry.roleLabel}`]: !expanded,
                      }))
                    }
                    className="text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 transition"
                  >
                    {expanded ? "Hide secondary matches" : `${extraMatches.length} more match${extraMatches.length > 1 ? "es" : ""}`}
                  </button>

                  {expanded ? (
                    <div className="mt-3 grid gap-2 lg:grid-cols-2">
                      {extraMatches.map((match) => (
                        <div key={`${entry.brandId}:${entry.roleLabel}:${match.familyName}`} className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div
                              className="text-lg tracking-tight text-zinc-950"
                              style={{
                                fontFamily: buildMatchFontFamily(match.familyName, entry.roleType),
                                fontWeight: inferSpecimenWeight(entry),
                              }}
                            >
                              {match.familyName}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${badgeTone("fit", match.fitForRole)}`}>
                                {match.fitForRole}
                              </span>
                              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-700 ring-1 ring-inset ring-zinc-200">
                                {match.score}
                              </span>
                            </div>
                          </div>
                          {/* Sample in the secondary font */}
                          <p
                            className="mt-2 text-zinc-700"
                            style={{
                              fontFamily: buildMatchFontFamily(match.familyName, entry.roleType),
                              fontSize: inferSpecimenFontSize(entry),
                              fontWeight: inferSpecimenWeight(entry),
                              letterSpacing: "-0.01em",
                              lineHeight: 1.3,
                            }}
                          >
                            {buildSpecimenText(entry)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200">
                              {match.matchSource}
                            </span>
                            {match.matchSource === "current-substitute" ? (
                              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 ring-1 ring-inset ring-zinc-200">
                                current substitute
                              </span>
                            ) : null}
                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200">
                              {scoringModeLabel(match.scoringMode)}
                            </span>
                            {match.visualDiagnostics?.candidateAsset ? (
                              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200">
                                {formatResolvedAsset(match.visualDiagnostics.candidateAsset)}
                              </span>
                            ) : null}
                            {match.rationaleChips.slice(0, 3).map((chip) => (
                              <span
                                key={chip}
                                className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200"
                              >
                                {chip}
                              </span>
                            ))}
                            {match.matchWarnings.map((warning) => (
                              <span
                                key={warning}
                                className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"
                              >
                                {warning}
                              </span>
                            ))}
                          </div>
                          <ScoreBreakdownBars breakdown={match.scoreBreakdown} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
