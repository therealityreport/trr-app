"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";
import { QuestionBuilder } from "@/components/admin/QuestionBuilder";
import { SurveyRunManager } from "@/components/admin/SurveyRunManager";
import type { SurveyWithQuestions } from "@/lib/surveys/normalized-types";

type Tab = "settings" | "questions" | "runs";

export default function NormalizedSurveyEditorPage() {
  const params = useParams();
  const router = useRouter();
  const surveySlug = params.surveySlug as string;
  const { user, checking, hasAccess } = useAdminGuard();

  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("settings");

  // Settings form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [autoCreateRuns, setAutoCreateRuns] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSurvey = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(
        `/api/admin/normalized-surveys/${surveySlug}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError("Survey not found");
          return;
        }
        const data = await response.json();
        throw new Error(data.error ?? "Failed to fetch survey");
      }

      const data = await response.json();
      setSurvey(data.survey);
      setTitle(data.survey.title);
      setDescription(data.survey.description ?? "");
      setIsActive(data.survey.is_active);
      setAutoCreateRuns(data.survey.metadata?.autoCreateRuns ?? false);
    } catch (err) {
      console.error("Failed to fetch survey", err);
      setError(err instanceof Error ? err.message : "Failed to fetch survey");
    } finally {
      setLoading(false);
    }
  }, [user, surveySlug]);

  useEffect(() => {
    if (hasAccess && user) {
      fetchSurvey();
    }
  }, [hasAccess, user, fetchSurvey]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(
        `/api/admin/normalized-surveys/${surveySlug}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description: description || null,
            is_active: isActive,
            metadata: { autoCreateRuns },
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to save");
      }

      fetchSurvey();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this survey?")) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(
        `/api/admin/normalized-surveys/${surveySlug}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to delete");
      }

      router.push("/admin/surveys/normalized");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (checking || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  if (!survey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-600">{error ?? "Survey not found"}</p>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white px-6 py-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Admin / Normalized Surveys / {survey.slug}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-zinc-900">
              {survey.title}
            </h1>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <nav className="flex gap-6">
              {(["settings", "questions", "runs"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 py-4 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-zinc-900">
                  Survey Settings
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    <label htmlFor="isActive" className="text-sm text-zinc-700">
                      Survey is active
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoCreateRuns"
                      checked={autoCreateRuns}
                      onChange={(e) => setAutoCreateRuns(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    <label
                      htmlFor="autoCreateRuns"
                      className="text-sm text-zinc-700"
                    >
                      Auto-create weekly runs (via cron)
                    </label>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Settings"}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete Survey
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "questions" && (
            <QuestionBuilder
              surveySlug={surveySlug}
              questions={survey.questions}
              onRefresh={fetchSurvey}
            />
          )}

          {activeTab === "runs" && (
            <SurveyRunManager surveySlug={surveySlug} />
          )}
        </main>
      </div>
    </ClientOnly>
  );
}
