"use client";

import Image from "next/image";

import SocialPlatformTabIcon from "@/components/admin/SocialPlatformTabIcon";
import { toSocialPlatformIconKey } from "@/lib/admin/show-page/show-link-display-model";
import type {
  LinkSourceBadgeKind,
  PersonLinkSourceKey,
  ShowSocialLinkPill,
} from "@/lib/admin/show-page/workspace-model";

export function PersonSourceLogo({ sourceKey }: { sourceKey: PersonLinkSourceKey }) {
  const baseClass =
    "inline-flex h-5 min-w-[2.1rem] items-center justify-center rounded border px-1 text-[10px] font-bold uppercase tracking-[0.08em]";
  if (sourceKey === "imdb") {
    return <span className={`${baseClass} border-zinc-300 bg-[#f5c518] text-zinc-900`}>IMDb</span>;
  }
  if (sourceKey === "tmdb") {
    return <span className={`${baseClass} border-zinc-300 bg-[#01d277] text-zinc-900`}>TMDb</span>;
  }
  if (sourceKey === "bravo") {
    return <span className={`${baseClass} border-zinc-300 bg-zinc-900 text-white`}>Bravo</span>;
  }
  if (sourceKey === "wikipedia") {
    return <span className={`${baseClass} border-zinc-300 bg-sky-600 text-white`}>Wiki</span>;
  }
  if (sourceKey === "wikidata") {
    return <span className={`${baseClass} border-zinc-300 bg-cyan-700 text-white`}>WD</span>;
  }
  return (
    <span className={`${baseClass} border-zinc-300 bg-[#f3f4f6] text-zinc-800`}>Fandom</span>
  );
}

export function SourceBadge({
  kind,
  label,
  iconUrl,
  iconOnly = false,
}: {
  kind: LinkSourceBadgeKind;
  label: string;
  iconUrl?: string | null;
  iconOnly?: boolean;
}) {
  const socialIconKey = toSocialPlatformIconKey(kind);
  if (socialIconKey) {
    return (
      <span className="inline-flex items-center justify-center">
        <SocialPlatformTabIcon tab={socialIconKey} />
        {!iconOnly ? <span className="sr-only">{label}</span> : null}
      </span>
    );
  }

  if (kind === "imdb") return <PersonSourceLogo sourceKey="imdb" />;
  if (kind === "tmdb") return <PersonSourceLogo sourceKey="tmdb" />;
  if (kind === "bravo") return <PersonSourceLogo sourceKey="bravo" />;
  if (kind === "wikipedia") return <PersonSourceLogo sourceKey="wikipedia" />;
  if (kind === "wikidata") return <PersonSourceLogo sourceKey="wikidata" />;
  if (kind === "fandom") {
    if (iconUrl) {
      return (
        <span className="inline-flex items-center gap-1">
          <Image
            src={iconUrl}
            alt=""
            width={14}
            height={14}
            className="h-3.5 w-3.5 shrink-0 rounded-sm"
            unoptimized
          />
          {!iconOnly ? <span className="text-xs font-semibold text-zinc-700">{label}</span> : null}
        </span>
      );
    }
    return iconOnly ? (
      <PersonSourceLogo sourceKey="fandom" />
    ) : (
      <span className="text-xs font-semibold text-zinc-700">{label}</span>
    );
  }

  const baseClass =
    "inline-flex h-5 min-w-[2.1rem] items-center justify-center rounded border px-1 text-[10px] font-bold uppercase tracking-[0.08em]";
  const tokenText = (() => {
    if (kind === "official") return "Site";
    if (kind === "tvdb") return "TVDB";
    if (kind === "tvmaze") return "TVM";
    if (kind === "trakt") return "Trakt";
    if (kind === "freebase") return "FB";
    if (kind === "google_kg") return "GKG";
    if (kind === "ratinggraph") return "RG";
    if (kind === "x_topic") return "X";
    if (kind === "google_news") return "News";
    return label.slice(0, 6) || "Link";
  })();
  return (
    <span className={`${baseClass} border-zinc-300 bg-zinc-100 text-zinc-700`}>{tokenText}</span>
  );
}

export function SocialHandlePill({ pill }: { pill: ShowSocialLinkPill }) {
  return (
    <a
      href={pill.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
      title={pill.url}
    >
      <SourceBadge kind={pill.sourceKind} label={pill.sourceLabel} iconOnly />
      <span className="truncate">{pill.text}</span>
    </a>
  );
}
