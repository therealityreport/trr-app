"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminGameKey } from "@/lib/admin/games";

type ProblemReport = {
  id: string;
  game: string;
  puzzleDate: string;
  category: string;
  description: string;
  userId: string;
  createdAt: string | null;
  updatedAt: string | null;
};

interface GameProblemReportsProps {
  gameKey: AdminGameKey;
  limit?: number;
}

export default function GameProblemReports({ gameKey, limit = 25 }: GameProblemReportsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ProblemReport[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/games/problem-reports?game=${encodeURIComponent(gameKey)}&limit=${limit}`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Unable to fetch reports");
        }
        return response.json() as Promise<{ reports?: ProblemReport[] }>;
      })
      .then((payload) => {
        if (!active) return;
        setReports(Array.isArray(payload.reports) ? payload.reports : []);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : "Unable to fetch reports");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [gameKey, limit]);

  const title = useMemo(() => {
    return gameKey === "bravodle" ? "Bravodle" : "Realitease";
  }, [gameKey]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Player Reports</p>
          <h2 className="mt-1 text-xl font-bold text-zinc-900">Recent {title} problem reports</h2>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
          {reports.length}
        </span>
      </div>

      {loading ? <p className="mt-4 text-sm text-zinc-500">Loading reports…</p> : null}
      {!loading && error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {!loading && !error && reports.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No reports yet for this game.</p>
      ) : null}

      {!loading && !error && reports.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 font-semibold text-zinc-700">Created</th>
                <th className="px-3 py-2 font-semibold text-zinc-700">Puzzle Date</th>
                <th className="px-3 py-2 font-semibold text-zinc-700">Category</th>
                <th className="px-3 py-2 font-semibold text-zinc-700">Description</th>
                <th className="px-3 py-2 font-semibold text-zinc-700">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-3 py-2 text-zinc-600">{formatTimestamp(report.createdAt)}</td>
                  <td className="px-3 py-2 text-zinc-800">{report.puzzleDate || "—"}</td>
                  <td className="px-3 py-2 text-zinc-800">{formatCategory(report.category)}</td>
                  <td className="px-3 py-2 text-zinc-800">{report.description || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-500">{report.userId || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function formatCategory(value: string): string {
  if (!value) return "—";
  return value
    .split("-")
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}
