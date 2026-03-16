"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { buildPersonRouteSlug } from "@/lib/admin/show-admin-routes";
import CastSocialBladeComparison from "@/components/admin/cast-socialblade-comparison";

// ============================================================================
// Types
// ============================================================================

interface CastMemberWithSocial {
  person_id: string;
  person_name: string | null;
  display_name: string | null;
  photo_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  twitter_handle: string | null;
  youtube_handle: string | null;
  role_effective: string | null;
  billing_order_effective: number | null;
  roles: string[];
}

interface CastContentSectionProps {
  showId: string;
  showSlug: string;
  seasonNumber: number;
}

type SubView = "profiles" | "socialblade";

const SUB_VIEWS: { id: SubView; label: string }[] = [
  { id: "profiles", label: "PROFILES" },
  { id: "socialblade", label: "SOCIAL BLADE" },
];

// ============================================================================
// Helpers
// ============================================================================

const PLATFORM_META: Record<string, { label: string; urlPrefix: string; accent: string; icon: string }> = {
  instagram: {
    label: "Instagram",
    urlPrefix: "https://instagram.com/",
    accent: "from-fuchsia-500 via-rose-500 to-amber-400",
    icon: "IG",
  },
  tiktok: {
    label: "TikTok",
    urlPrefix: "https://tiktok.com/@",
    accent: "from-cyan-400 to-pink-500",
    icon: "TT",
  },
  twitter: {
    label: "X / Twitter",
    urlPrefix: "https://x.com/",
    accent: "from-zinc-700 to-zinc-900",
    icon: "X",
  },
  youtube: {
    label: "YouTube",
    urlPrefix: "https://youtube.com/@",
    accent: "from-red-500 to-red-700",
    icon: "YT",
  },
};

function getSocialHandles(member: CastMemberWithSocial): { platform: string; handle: string }[] {
  const handles: { platform: string; handle: string }[] = [];
  if (member.instagram_handle) handles.push({ platform: "instagram", handle: member.instagram_handle });
  if (member.tiktok_handle) handles.push({ platform: "tiktok", handle: member.tiktok_handle });
  if (member.twitter_handle) handles.push({ platform: "twitter", handle: member.twitter_handle });
  if (member.youtube_handle) handles.push({ platform: "youtube", handle: member.youtube_handle });
  return handles;
}

// ============================================================================
// Component
// ============================================================================

export default function CastContentSection({ showId, showSlug, seasonNumber }: CastContentSectionProps) {
  const [castMembers, setCastMembers] = useState<CastMemberWithSocial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subView, setSubView] = useState<SubView>("profiles");

  const fetchCast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminWithAuth(
        `/api/admin/trr-api/shows/${showId}/cast-role-members?seasons=${seasonNumber}&exclude_zero_episode_members=1`
      );
      if (!res.ok) throw new Error(`Failed to fetch cast: ${res.status}`);
      const data: unknown[] = await res.json();
      const members: CastMemberWithSocial[] = (Array.isArray(data) ? data : [])
        .map((row: unknown) => {
          const r = row as Record<string, unknown>;
          return {
            person_id: String(r.person_id ?? ""),
            person_name: typeof r.person_name === "string" ? r.person_name : null,
            display_name: typeof r.display_name === "string" ? r.display_name : null,
            photo_url: typeof r.photo_url === "string" ? r.photo_url : null,
            instagram_handle: typeof r.instagram_handle === "string" ? r.instagram_handle : null,
            tiktok_handle: typeof r.tiktok_handle === "string" ? r.tiktok_handle : null,
            twitter_handle: typeof r.twitter_handle === "string" ? r.twitter_handle : null,
            youtube_handle: typeof r.youtube_handle === "string" ? r.youtube_handle : null,
            role_effective: typeof r.role_effective === "string" ? r.role_effective : null,
            billing_order_effective: typeof r.billing_order_effective === "number" ? r.billing_order_effective : null,
            roles: Array.isArray(r.roles)
              ? (r.roles as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0)
              : [],
          };
        })
        .filter((m) => m.instagram_handle || m.tiktok_handle || m.twitter_handle || m.youtube_handle)
        .sort((a, b) => (a.billing_order_effective ?? 999) - (b.billing_order_effective ?? 999));
      setCastMembers(members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cast");
    } finally {
      setLoading(false);
    }
  }, [showId, seasonNumber]);

  useEffect(() => {
    fetchCast();
  }, [fetchCast]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-200" />
            <div className="mt-2 h-6 w-48 animate-pulse rounded bg-zinc-200" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                <div className="h-20 w-20 animate-pulse rounded-xl bg-zinc-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-zinc-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
                  <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-800">Failed to load cast</p>
        <p className="mt-1 text-xs text-red-600">{error}</p>
        <button
          onClick={fetchCast}
          className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  if (castMembers.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center">
        <p className="text-sm font-semibold text-zinc-600">No cast members with social accounts</p>
        <p className="mt-1 text-xs text-zinc-500">
          Assign Instagram, TikTok, Twitter, or YouTube handles to cast members to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Sub-tabs */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
            Cast Comparison
          </p>
          <h3 className="mt-1 text-lg font-bold text-zinc-900">
            {castMembers.length} member{castMembers.length !== 1 ? "s" : ""}
          </h3>
        </div>
        <nav className="flex gap-1 rounded-lg bg-zinc-100 p-0.5">
          {SUB_VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => setSubView(view.id)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-bold tracking-wide transition ${
                subView === view.id
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {view.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Sub-view content */}
      {subView === "profiles" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {castMembers.map((member) => {
            const name = member.display_name || member.person_name || "Unknown";
            const personSlug = buildPersonRouteSlug({ personName: name, personId: member.person_id });
            const socialHandles = getSocialHandles(member);

            return (
              <article
                key={member.person_id}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md hover:border-zinc-300"
              >
                <div className="flex gap-4 p-5">
                  {/* Photo */}
                  <Link
                    href={`/people/${personSlug}?showId=${showSlug}&seasonNumber=${seasonNumber}` as Route}
                    className="relative h-[88px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl bg-zinc-100"
                  >
                    {member.photo_url ? (
                      <Image
                        src={member.photo_url}
                        alt={name}
                        fill
                        sizes="72px"
                        className="object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-bold text-zinc-300">
                        {name.charAt(0)}
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <Link
                        href={`/people/${personSlug}?showId=${showSlug}&seasonNumber=${seasonNumber}` as Route}
                        className="text-sm font-bold text-zinc-900 hover:text-zinc-600 transition"
                      >
                        {name}
                      </Link>
                      {member.roles.length > 0 && (
                        <p className="mt-0.5 text-xs text-zinc-500 truncate">
                          {member.roles.join(" · ")}
                        </p>
                      )}
                    </div>

                    {/* Social handles */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {socialHandles.map(({ platform, handle }) => {
                        const meta = PLATFORM_META[platform];
                        if (!meta) return null;
                        return (
                          <a
                            key={platform}
                            href={`${meta.urlPrefix}${handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-200"
                            title={`${meta.label}: @${handle}`}
                          >
                            <span
                              className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br ${meta.accent} text-[9px] font-black text-white`}
                            >
                              {meta.icon}
                            </span>
                            <span className="max-w-[120px] truncate">@{handle}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Growth link footer */}
                <Link
                  href={`/people/${personSlug}/social-growth?showId=${showSlug}&seasonNumber=${seasonNumber}` as Route}
                  className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-5 py-2.5 text-xs font-semibold text-zinc-500 transition group-hover:bg-zinc-100/80 group-hover:text-zinc-700"
                >
                  <span>View Social Growth</span>
                  <svg className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <CastSocialBladeComparison castMembers={castMembers} />
      )}
    </div>
  );
}
