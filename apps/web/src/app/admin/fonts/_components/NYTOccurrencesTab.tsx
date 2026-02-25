"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";

interface NytOccurrence {
  file_path: string;
  line_number: number;
  column_number: number;
  match: string;
  line_text: string;
}

interface NytOccurrencesResponse {
  generated_at: string;
  scan_root: string;
  file_count_scanned: number;
  files_with_matches: number;
  occurrence_count: number;
  capped: boolean;
  occurrences: NytOccurrence[];
}

const parseErrorPayload = async (response: Response): Promise<string> => {
  const fallback = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as { error?: string; detail?: string };
    if (typeof payload.error === "string" && typeof payload.detail === "string") {
      return `${payload.error}: ${payload.detail}`;
    }
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.detail === "string") return payload.detail;
    return fallback;
  } catch {
    return fallback;
  }
};

interface NYTOccurrencesTabProps {
  preferredUser: User | null;
}

export default function NYTOccurrencesTab({ preferredUser }: NYTOccurrencesTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<NytOccurrencesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchAdminWithAuth(
          "/api/admin/design-system/nyt-occurrences",
          { method: "GET", cache: "no-store" },
          { preferredUser },
        );
        if (!response.ok) {
          if (!cancelled) {
            setError(await parseErrorPayload(response));
            setPayload(null);
          }
          return;
        }
        const data = (await response.json()) as NytOccurrencesResponse;
        if (!cancelled) {
          setPayload(data);
        }
      } catch (fetchError) {
        if (cancelled) return;
        const message = fetchError instanceof Error ? fetchError.message : "Failed to load NYT occurrences";
        setError(message);
        setPayload(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [preferredUser]);

  const groupedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of payload?.occurrences ?? []) {
      counts.set(item.file_path, (counts.get(item.file_path) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [payload?.occurrences]);

  if (loading) {
    return <p className="py-8 text-sm text-zinc-500">Scanning app files for NYT-related references...</p>;
  }

  if (error) {
    return <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }

  if (!payload) {
    return <p className="text-sm text-zinc-500">No scan data available.</p>;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">NYT Occurrences</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Matched tokens: <code className="rounded bg-zinc-100 px-1 py-0.5">NYTimes</code>,{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">New York Times</code>,{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">NYT*</code>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
            Files scanned: {payload.file_count_scanned}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
            Files with matches: {payload.files_with_matches}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
            Total occurrences: {payload.occurrence_count}
          </span>
          {payload.capped ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
              Result capped at 10,000
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-zinc-500">Generated: {new Date(payload.generated_at).toLocaleString()}</p>
      </div>

      {groupedCounts.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Top Files by Match Count</h3>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {groupedCounts.map(([filePath, count]) => (
              <li key={filePath}>
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">{filePath}</code> - {count}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Match</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">File</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Line</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Excerpt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {payload.occurrences.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                  No NYT-related occurrences were found.
                </td>
              </tr>
            ) : (
              payload.occurrences.map((occurrence) => (
                <tr key={`${occurrence.file_path}:${occurrence.line_number}:${occurrence.column_number}:${occurrence.match}`}>
                  <td className="px-3 py-2 align-top text-zinc-800">{occurrence.match}</td>
                  <td className="max-w-[420px] px-3 py-2 align-top text-zinc-700">
                    <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">{occurrence.file_path}</code>
                  </td>
                  <td className="px-3 py-2 align-top text-zinc-700">
                    {occurrence.line_number}:{occurrence.column_number}
                  </td>
                  <td className="max-w-[520px] px-3 py-2 align-top text-zinc-700 [overflow-wrap:anywhere]">
                    {occurrence.line_text}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
