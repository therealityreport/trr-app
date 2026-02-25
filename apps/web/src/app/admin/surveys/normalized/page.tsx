"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import type { NormalizedSurvey } from "@/lib/surveys/normalized-types";

export default function NormalizedSurveysListPage() {
  const { user, userKey, checking, hasAccess } = useAdminGuard();
  const [surveys, setSurveys] = useState<NormalizedSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const fetchSurveys = useCallback(async () => {
    if (!userKey) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetchAdminWithAuth("/api/admin/normalized-surveys", undefined, {
        preferredUser: user,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to fetch surveys");
      }

      const data = await response.json();
      setSurveys(data.surveys ?? []);
    } catch (err) {
      console.error("Failed to fetch surveys", err);
      setError(err instanceof Error ? err.message : "Failed to fetch surveys");
    } finally {
      setLoading(false);
    }
  }, [user, userKey]);

  useEffect(() => {
    if (hasAccess && userKey) {
      fetchSurveys();
    }
  }, [hasAccess, userKey, fetchSurveys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlug.trim() || !newTitle.trim()) return;

    try {
      setCreating(true);
      const response = await fetchAdminWithAuth("/api/admin/normalized-surveys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug: newSlug.trim(), title: newTitle.trim() }),
      }, {
        preferredUser: user,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to create survey");
      }

      setNewSlug("");
      setNewTitle("");
      fetchSurveys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create survey");
    } finally {
      setCreating(false);
    }
  };

  if (checking) {
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

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto max-w-6xl">
            <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Normalized Surveys", "/admin/surveys/normalized")} className="mb-1" />
            <h1 className="mt-2 text-2xl font-bold text-zinc-900">
              Survey Management
            </h1>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Create new survey */}
          <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">
              Create New Survey
            </h2>
            <form onSubmit={handleCreate} className="flex gap-4">
              <input
                type="text"
                placeholder="slug (e.g., weekly-pulse)"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={creating || !newSlug.trim() || !newTitle.trim()}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </form>
          </div>

          {/* Survey list */}
          {loading ? (
            <div className="text-center text-zinc-500">Loading surveys...</div>
          ) : surveys.length === 0 ? (
            <div className="text-center text-zinc-500">No surveys yet.</div>
          ) : (
            <div className="space-y-4">
              {surveys.map((survey) => (
                <Link
                  key={survey.id}
                  href={`/admin/surveys/normalized/${survey.slug}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900">
                        {survey.title}
                      </h3>
                      <p className="text-sm text-zinc-500">/{survey.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          survey.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {survey.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  {survey.description && (
                    <p className="mt-2 text-sm text-zinc-600">
                      {survey.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </ClientOnly>
  );
}
