"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { getClientAuthHeaders } from "@/lib/admin/client-auth";

interface TalentBio {
  itemNumber: string;
  description: string;
  headline: string;
  shows: string[];
  season: number | null;
  showName: string | null;
  thumbnailUrl: string | null;
  filename: string | null;
}

interface NbcumvSeasonBiosProps {
  personName: string;
}

function extractBioText(description: string): string {
  // The NBCUMV description format for talent bios:
  // "SHOW NAME -- Season:N -- Pictured: Name -- Bio text here -- (Photo by: ...)"
  // Extract the bio portion after the person reference and before the photo credit
  const parts = description.split(" -- ");

  // Find the part after "Pictured:" that contains the actual bio
  let bioStart = -1;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].trim().toLowerCase().startsWith("pictured:")) {
      bioStart = i;
      break;
    }
  }

  if (bioStart >= 0 && bioStart + 1 < parts.length) {
    // Collect everything after "Pictured: Name" until "(Photo by:" credit
    const bioSegments: string[] = [];
    for (let i = bioStart + 1; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part.startsWith("(Photo by:") || part.startsWith("(Photo By:")) {
        break;
      }
      bioSegments.push(part);
    }
    if (bioSegments.length > 0) {
      return bioSegments.join(" -- ");
    }
  }

  // Fallback: return the full description minus the show header
  return description;
}

function formatShowLabel(showName: string | null, shows: string[]): string {
  if (showName) return showName;
  if (shows.length > 0) return shows[0];
  return "Unknown Show";
}

export default function NbcumvSeasonBios({ personName }: NbcumvSeasonBiosProps) {
  const [bios, setBios] = useState<TalentBio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBios = useCallback(async () => {
    if (!personName) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getClientAuthHeaders();
      const params = new URLSearchParams({ personName });
      const response = await fetch(
        `/api/admin/nbcumv/talent-bios?${params}`,
        { headers }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? `HTTP ${response.status}`
        );
      }
      const data = (await response.json()) as { bios: TalentBio[]; count: number };
      setBios(data.bios);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NBCUMV bios");
    } finally {
      setLoading(false);
    }
  }, [personName]);

  useEffect(() => {
    fetchBios();
  }, [fetchBios]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h3 className="mb-4 text-lg font-bold text-zinc-900">Season Bios</h3>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          Loading NBCUMV talent bios...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h3 className="mb-4 text-lg font-bold text-zinc-900">Season Bios</h3>
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchBios}
          className="mt-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          Retry
        </button>
      </div>
    );
  }

  if (bios.length === 0) {
    return null;
  }

  // Group bios by show name
  const biosByShow = new Map<string, TalentBio[]>();
  for (const bio of bios) {
    const key = formatShowLabel(bio.showName, bio.shows);
    const existing = biosByShow.get(key) ?? [];
    existing.push(bio);
    biosByShow.set(key, existing);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-zinc-900">Season Bios</h3>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
          NBCUMV
        </span>
      </div>

      <div className="space-y-6">
        {Array.from(biosByShow.entries()).map(([showName, showBios]) => (
          <div key={showName}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {showName}
            </p>
            <div className="space-y-3">
              {showBios.map((bio) => (
                <div
                  key={bio.itemNumber}
                  className="flex gap-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  {/* Promo Photo — 3:4 container */}
                  <div className="relative aspect-[3/4] w-28 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-200">
                    {bio.thumbnailUrl ? (
                      <Image
                        src={bio.thumbnailUrl}
                        alt={bio.headline || personName}
                        fill
                        className="object-cover"
                        sizes="112px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Bio text */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      {bio.season != null && (
                        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white">
                          Season {bio.season}
                        </span>
                      )}
                      {bio.filename && (
                        <span className="truncate text-xs text-zinc-400">
                          {bio.filename}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-800">
                      {extractBioText(bio.description)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
