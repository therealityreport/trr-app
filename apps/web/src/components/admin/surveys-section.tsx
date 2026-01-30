"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";

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
}

// ============================================================================
// Template Config
// ============================================================================

const TEMPLATES: { id: SurveyTemplate; label: string; description: string }[] = [
  {
    id: "cast_ranking",
    label: "Cast Ranking",
    description: "Rank cast members from favorite to least favorite",
  },
  {
    id: "weekly_poll",
    label: "Weekly Poll",
    description: "Episode rating, highlight, and MVP questions",
  },
  {
    id: "episode_rating",
    label: "Episode Rating",
    description: "Rate episodes on various dimensions",
  },
];

// ============================================================================
// Component
// ============================================================================

export default function SurveysSection({
  showId,
  showName,
  totalSeasons,
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

  // Reset form
  const resetForm = () => {
    setFormSeasonNumber(1);
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
            </div>

            {/* Template */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-700">
                Template <span className="text-red-500">*</span>
              </label>
              <select
                value={formTemplate}
                onChange={(e) => setFormTemplate(e.target.value as SurveyTemplate)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                {TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                {TEMPLATES.find((t) => t.id === formTemplate)?.description}
              </p>
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
      {surveys.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-500">
              {surveys.length} survey{surveys.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {surveys.map((survey) => {
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
          <h3 className="text-lg font-semibold text-zinc-900">No Surveys Yet</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Create a survey linked to this show. Cast members will be automatically
            imported from the TRR database.
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
