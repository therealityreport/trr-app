"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import type { SurveyRun } from "@/lib/surveys/normalized-types";

interface RunWithCount extends SurveyRun {
  response_count: number;
}

interface SurveyRunManagerProps {
  surveySlug: string;
}

export function SurveyRunManager({ surveySlug }: SurveyRunManagerProps) {
  const [runs, setRuns] = useState<RunWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // New run form state
  const [newRunKey, setNewRunKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxSubmissions, setMaxSubmissions] = useState(1);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(
        `/api/admin/normalized-surveys/${surveySlug}/runs`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to fetch runs");
      }

      const data = await response.json();
      setRuns(data.runs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch runs");
    } finally {
      setLoading(false);
    }
  }, [surveySlug]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRunKey.trim() || !startsAt) return;

    try {
      setCreating(true);
      setError(null);

      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(
        `/api/admin/normalized-surveys/${surveySlug}/runs`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            run_key: newRunKey.trim(),
            title: newTitle.trim() || null,
            starts_at: new Date(startsAt).toISOString(),
            ends_at: endsAt ? new Date(endsAt).toISOString() : null,
            max_submissions_per_user: maxSubmissions,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to create run");
      }

      setNewRunKey("");
      setNewTitle("");
      setStartsAt("");
      setEndsAt("");
      setMaxSubmissions(1);
      fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create run");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (run: RunWithCount) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(
        `/api/admin/normalized-surveys/${surveySlug}/runs/${run.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: !run.is_active }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to update run");
      }

      fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update run");
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!confirm("Delete this run?")) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(
        `/api/admin/normalized-surveys/${surveySlug}/runs/${runId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to delete run");
      }

      fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete run");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const isRunActive = (run: RunWithCount) => {
    if (!run.is_active) return false;
    const now = new Date();
    const starts = new Date(run.starts_at);
    const ends = run.ends_at ? new Date(run.ends_at) : null;
    return now >= starts && (!ends || now < ends);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create run form */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          Create New Run
        </h3>
        <form onSubmit={handleCreateRun} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Run Key (unique)
              </label>
              <input
                type="text"
                value={newRunKey}
                onChange={(e) => setNewRunKey(e.target.value)}
                placeholder="e.g., 2026-W05"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Title (optional)
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Week 5 Survey"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Starts At
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Ends At (optional)
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Max Submissions
              </label>
              <input
                type="number"
                min={1}
                value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(parseInt(e.target.value))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !newRunKey.trim() || !startsAt}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Run"}
          </button>
        </form>
      </div>

      {/* Runs list */}
      {loading ? (
        <div className="text-center text-zinc-500">Loading runs...</div>
      ) : runs.length === 0 ? (
        <div className="text-center text-zinc-500">
          No runs yet. Create one above or enable auto-create in settings.
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => {
            const active = isRunActive(run);
            return (
              <div
                key={run.id}
                className={`rounded-lg border bg-white p-6 ${
                  active ? "border-green-300" : "border-zinc-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">
                        {run.run_key}
                      </span>
                      {run.title && (
                        <span className="text-zinc-500">- {run.title}</span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          active
                            ? "bg-green-100 text-green-700"
                            : run.is_active
                              ? "bg-amber-100 text-amber-700"
                              : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {active
                          ? "Live"
                          : run.is_active
                            ? "Scheduled"
                            : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-zinc-600">
                      <div>Starts: {formatDate(run.starts_at)}</div>
                      {run.ends_at && <div>Ends: {formatDate(run.ends_at)}</div>}
                      <div>Max submissions: {run.max_submissions_per_user}</div>
                      <div className="mt-1 font-medium">
                        Responses: {run.response_count}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(run)}
                      className="text-sm text-zinc-600 hover:text-zinc-900"
                    >
                      {run.is_active ? "Deactivate" : "Activate"}
                    </button>
                    {run.response_count === 0 && (
                      <button
                        onClick={() => handleDeleteRun(run.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
