"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import type { UiVariant } from "@/lib/surveys/question-config-types";

// ============================================================================
// Types
// ============================================================================

interface SurveyTrrLink {
  survey_id: string;
  trr_show_id: string;
  trr_season_id: string | null;
  season_number: number | null;
  created_at: string;
  updated_at: string;
}

interface LinkedSurvey {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  trr_link: SurveyTrrLink;
}

type SurveyTemplate = "cast_ranking" | "weekly_poll" | "episode_rating";

interface SurveysSectionProps {
  showId: string;
  showName: string;
  totalSeasons: number | null;
  seasonNumber?: number | null;
}

// ============================================================================
// Template Config
// ============================================================================

type TemplateUiFormat = UiVariant;

const TEMPLATES: {
  id: SurveyTemplate;
  label: string;
  description: string;
  formats: TemplateUiFormat[];
}[] = [
  {
    id: "cast_ranking",
    label: "Cast Ranking",
    description: "Rank cast members from favorite to least favorite",
    formats: ["circle-ranking"],
  },
  {
    id: "weekly_poll",
    label: "Weekly Poll",
    description: "Episode rating, highlight, and MVP questions",
    formats: ["numeric-ranking", "text-entry", "image-multiple-choice"],
  },
  {
    id: "episode_rating",
    label: "Episode Rating",
    description: "Rate episodes on various dimensions",
    formats: ["numeric-ranking", "numeric-scale-slider", "text-entry"],
  },
];

const formatName = (format: TemplateUiFormat): string => {
  switch (format) {
    case "numeric-ranking":
      return "Star rating";
    case "numeric-scale-slider":
      return "Numeric slider";
    case "two-axis-grid":
      return "Two-axis grid";
    case "circle-ranking":
      return "Circle ranking";
    case "rectangle-ranking":
      return "List ranking";
    case "cast-decision-card":
      return "Cast decision card";
    case "three-choice-slider":
      return "3-choice matrix";
    case "agree-likert-scale":
      return "Likert matrix";
    case "two-choice-slider":
      return "2-choice slider";
    case "multi-select-choice":
      return "Multi-select";
    case "text-multiple-choice":
      return "Single-select";
    case "image-multiple-choice":
      return "Image select";
    case "dropdown":
      return "Dropdown";
    case "text-entry":
      return "Text entry";
    default:
      return format;
  }
};

function FormatThumbnail({ format }: { format: TemplateUiFormat }) {
  const base = "h-8 w-full rounded-md border border-zinc-200 bg-white shadow-sm";
  const line = "h-1 rounded-full bg-zinc-200";

  switch (format) {
    case "numeric-ranking":
      return (
        <div className={`${base} flex items-center justify-center gap-1 px-2`}>
          {Array.from({ length: 5 }, (_, idx) => (
            <svg
              key={idx}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={idx < 3 ? "currentColor" : "none"}
              className={idx < 3 ? "text-amber-500" : "text-zinc-300"}
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ))}
        </div>
      );
    case "numeric-scale-slider":
      return (
        <div className={`${base} flex items-center px-3`}>
          <div className="w-full">
            <div className={`${line} relative`}>
              <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500 shadow" />
              <div className="h-full w-1/2 rounded-full bg-indigo-300" />
            </div>
          </div>
        </div>
      );
    case "circle-ranking":
      return (
        <div className={`${base} flex items-center justify-center`}>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 6 }, (_, idx) => (
              <div
                key={idx}
                className={`h-3 w-3 rounded-full ${idx < 2 ? "bg-indigo-400" : "bg-zinc-200"}`}
              />
            ))}
          </div>
        </div>
      );
    case "image-multiple-choice":
      return (
        <div className={`${base} flex items-center justify-center`}>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 6 }, (_, idx) => (
              <div
                key={idx}
                className={`h-3.5 w-3.5 rounded ${idx === 1 ? "bg-indigo-300" : "bg-zinc-200"}`}
              />
            ))}
          </div>
        </div>
      );
    case "text-entry":
      return (
        <div className={`${base} flex flex-col justify-center gap-1.5 px-3`}>
          <div className="h-2 w-16 rounded bg-zinc-200" />
          <div className={`${line}`} />
        </div>
      );
    default:
      return (
        <div className={`${base} flex items-center justify-center px-2`}>
          <div className="h-2 w-10 rounded bg-zinc-200" />
        </div>
      );
  }
}

// ============================================================================
// Component
// ============================================================================

export default function SurveysSection({
  showId,
  showName,
  totalSeasons,
  seasonNumber,
}: SurveysSectionProps) {
  const [surveys, setSurveys] = useState<LinkedSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formSeasonNumber, setFormSeasonNumber] = useState(1);
  const [formTemplate, setFormTemplate] = useState<SurveyTemplate>("cast_ranking");
  const [formTitle, setFormTitle] = useState("");
  const [formCreateRun, setFormCreateRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  // Fetch surveys
  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}/surveys`, { headers });
      if (!response.ok) throw new Error("Failed to fetch surveys");
      const data = await response.json();
      setSurveys(data.surveys);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load surveys");
    } finally {
      setLoading(false);
    }
  }, [showId, getAuthHeaders]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  useEffect(() => {
    if (typeof seasonNumber === "number" && Number.isFinite(seasonNumber)) {
      setFormSeasonNumber(seasonNumber);
    }
  }, [seasonNumber]);

  // Reset form
  const resetForm = () => {
    setFormSeasonNumber(
      typeof seasonNumber === "number" && Number.isFinite(seasonNumber)
        ? seasonNumber
        : 1
    );
    setFormTemplate("cast_ranking");
    setFormTitle("");
    setFormCreateRun(false);
    setShowForm(false);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}/surveys`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonNumber: formSeasonNumber,
          template: formTemplate,
          title: formTitle || undefined,
          createInitialRun: formCreateRun,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create survey");
      }

      resetForm();
      fetchSurveys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create survey");
    } finally {
      setSubmitting(false);
    }
  };

  // Get seasons that already have surveys
  const usedSeasons = new Set(
    surveys.map((s) => s.trr_link.season_number).filter((n): n is number => n !== null)
  );

  const visibleSurveys =
    typeof seasonNumber === "number" && Number.isFinite(seasonNumber)
      ? surveys.filter((s) => s.trr_link.season_number === seasonNumber)
      : surveys;

  // Generate available seasons
  const availableSeasons = totalSeasons
    ? Array.from({ length: totalSeasons }, (_, i) => i + 1)
    : Array.from({ length: 20 }, (_, i) => i + 1);

  // Render loading state
  if (loading && surveys.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
        <p className="text-sm text-zinc-600">Loading surveys...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Linked Surveys
          </p>
          <h3 className="text-xl font-bold text-zinc-900">{showName}</h3>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Create Survey
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs font-semibold text-red-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h4 className="mb-4 text-lg font-semibold text-zinc-900">
            Create Survey from Show
          </h4>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Season Number */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-700">
                Season <span className="text-red-500">*</span>
              </label>
              {typeof seasonNumber === "number" && Number.isFinite(seasonNumber) ? (
                <input
                  type="text"
                  value={`Season ${seasonNumber}`}
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                />
              ) : (
                <select
                  value={formSeasonNumber}
                  onChange={(e) => setFormSeasonNumber(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  {availableSeasons.map((num) => (
                    <option
                      key={num}
                      value={num}
                      disabled={usedSeasons.has(num)}
                    >
                      Season {num}
                      {usedSeasons.has(num) ? " (already has survey)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Template (gallery) */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-zinc-700">
                Template <span className="text-red-500">*</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {TEMPLATES.map((template) => {
                  const isSelected = template.id === formTemplate;
                  return (
                    <label
                      key={template.id}
                      className={`cursor-pointer rounded-xl border p-4 shadow-sm transition ${
                        isSelected
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={isSelected}
                        onChange={() => setFormTemplate(template.id)}
                        className="sr-only"
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {template.label}
                          </p>
                          <p className="mt-1 text-xs text-zinc-600">
                            {template.description}
                          </p>
                        </div>
                        <div
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-zinc-900 bg-zinc-900"
                              : "border-zinc-300 bg-white"
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M20 6L9 17l-5-5"
                                stroke="white"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {(() => {
                const active = TEMPLATES.find((t) => t.id === formTemplate);
                if (!active) return null;
                return (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Included Question Formats
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {active.formats.map((format) => (
                        <div
                          key={format}
                          className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm"
                        >
                          <div className="mb-2 text-xs font-semibold text-zinc-700">
                            {formatName(format)}
                          </div>
                          <FormatThumbnail format={format} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Custom Title */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-zinc-700">
                Custom Title (optional)
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={`${showName} S${formSeasonNumber}`}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            {/* Create Initial Run */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formCreateRun}
                  onChange={(e) => setFormCreateRun(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="font-semibold text-zinc-700">
                  Create initial survey run
                </span>
                <span className="text-zinc-500">(starts immediately)</span>
              </label>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This will fetch cast members from the TRR database and
              create survey questions with their photos. You can edit the survey after
              creation.
            </p>
          </div>

          {/* Form Actions */}
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={submitting || usedSeasons.has(formSeasonNumber)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Survey"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Surveys List */}
      {visibleSurveys.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-500">
              {visibleSurveys.length} survey{visibleSurveys.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {visibleSurveys.map((survey) => {
              const metadata = survey.metadata as {
                template?: string;
                showName?: string;
              };
              const template = TEMPLATES.find((t) => t.id === metadata.template);

              return (
                <div
                  key={survey.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          survey.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {survey.is_active ? "Active" : "Inactive"}
                      </span>
                      {survey.trr_link.season_number && (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                          Season {survey.trr_link.season_number}
                        </span>
                      )}
                      {template && (
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                          {template.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-semibold text-zinc-900">{survey.title}</p>
                    {survey.description && (
                      <p className="mt-1 text-sm text-zinc-600">{survey.description}</p>
                    )}
                    <p className="mt-2 text-xs text-zinc-500">
                      Created {new Date(survey.created_at).toLocaleDateString()} ·
                      Slug: <code className="rounded bg-zinc-100 px-1">{survey.slug}</code>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/surveys/${survey.slug}`}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Manage
                    </Link>
                    <Link
                      href={`/admin/surveys/${survey.slug}?tab=responses`}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Responses
                    </Link>
                    <Link
                      href={`/surveys/n/${survey.slug}/play`}
                      target="_blank"
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Preview
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : !showForm ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-zinc-200 flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-zinc-500"
            >
              <rect
                x="4"
                y="4"
                width="16"
                height="16"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">
            {typeof seasonNumber === "number" && Number.isFinite(seasonNumber)
              ? `No Surveys Yet (Season ${seasonNumber})`
              : "No Surveys Yet"}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            {typeof seasonNumber === "number" && Number.isFinite(seasonNumber)
              ? "Create a survey linked to this season. Cast members will be automatically imported from the TRR database."
              : "Create a survey linked to this show. Cast members will be automatically imported from the TRR database."}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Create First Survey
          </button>
        </div>
      ) : null}
    </div>
  );
}
