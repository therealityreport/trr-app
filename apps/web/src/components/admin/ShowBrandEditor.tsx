"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { fetchAdminWithAuth, getClientAuthHeaders } from "@/lib/admin/client-auth";

// ============================================================================
// Types (Client-facing mirrors of server records)
// ============================================================================

type CastStatus = "main" | "friend" | "new" | "alum";

interface ShowPalette {
  primary: string;
  accent: string;
  dark: string;
  light: string;
}

interface SeasonColors {
  primary: string;
  accent: string;
  neutral: string;
}

interface CastAsset {
  name: string;
  image: string;
  role?: string;
  instagram?: string;
  status?: CastStatus;
  trrPersonId?: string;
}

interface BrandShowRecord {
  id: string;
  key: string;
  trr_show_id: string | null;
  title: string;
  palette: ShowPalette | null;
  fonts: Record<string, unknown>;
  icon_url: string | null;
  wordmark_url: string | null;
  hero_url: string | null;
  updated_at: string;
}

interface BrandSeasonRecord {
  id: string;
  show_id: string;
  season_number: number;
  label: string;
  colors: SeasonColors | null;
  cast_members: CastAsset[];
  updated_at: string;
}

interface BrandMediaAssetLike {
  id: string;
  type: "show" | "season" | "episode" | "cast";
  kind: string;
  hosted_url: string;
  source?: string | null;
}

export interface TrrSeasonLike {
  id: string;
  season_number: number;
  name: string | null;
  title: string | null;
}

export interface TrrCastMemberLike {
  person_id: string;
  full_name: string | null;
  cast_member_name: string | null;
  role: string | null;
  credit_category: string;
  photo_url: string | null;
  cover_photo_url: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

const slugify = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 128);

const defaultPalette = (): ShowPalette => ({
  primary: "#111111",
  accent: "#e11d48",
  dark: "#0a0a0a",
  light: "#f4f4f5",
});

const defaultSeasonColors = (): SeasonColors => ({
  primary: "#111111",
  accent: "#e11d48",
  neutral: "#f4f4f5",
});

const normalizeAssetKind = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-zinc-700">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-zinc-200 bg-white"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
          placeholder="#000000"
        />
      </div>
    </label>
  );
}

function CastMemberEditor({
  value,
  onChange,
  onRemove,
}: {
  value: CastAsset;
  onChange: (next: CastAsset) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Name</span>
              <input
                type="text"
                value={value.name}
                onChange={(e) => onChange({ ...value, name: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Role</span>
              <input
                type="text"
                value={value.role ?? ""}
                onChange={(e) => onChange({ ...value, role: e.target.value || undefined })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Image URL</span>
              <input
                type="text"
                value={value.image}
                onChange={(e) => onChange({ ...value, image: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                placeholder="https://..."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Instagram</span>
              <input
                type="text"
                value={value.instagram ?? ""}
                onChange={(e) => onChange({ ...value, instagram: e.target.value || undefined })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                placeholder="@handle"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Status</span>
              <select
                value={value.status ?? "main"}
                onChange={(e) => onChange({ ...value, status: e.target.value as CastStatus })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              >
                <option value="main">Main</option>
                <option value="friend">Friend</option>
                <option value="new">New</option>
                <option value="alum">Alum</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">TRR Person ID (optional)</span>
              <input
                type="text"
                value={value.trrPersonId ?? ""}
                onChange={(e) => onChange({ ...value, trrPersonId: e.target.value || undefined })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                placeholder="uuid"
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function BrandSeasonEditor({
  showKey,
  season,
  trrCast,
  onSeasonSaved,
}: {
  showKey: string;
  season: BrandSeasonRecord;
  trrCast: TrrCastMemberLike[];
  onSeasonSaved: (next: BrandSeasonRecord) => void;
}) {
  const [label, setLabel] = useState(season.label);
  const [colors, setColors] = useState<SeasonColors>(season.colors ?? defaultSeasonColors());
  const [castMembers, setCastMembers] = useState<CastAsset[]>(season.cast_members ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLabel(season.label);
    setColors(season.colors ?? defaultSeasonColors());
    setCastMembers(season.cast_members ?? []);
    setError(null);
  }, [season.cast_members, season.colors, season.id, season.label, season.updated_at]);

  const getAuthHeaders = useCallback(async () => getClientAuthHeaders(), []);
  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => fetchAdminWithAuth(input, init),
    [],
  );

  const seedFromTrrCast = () => {
    const deduped = new Map<string, CastAsset>();
    for (const member of trrCast) {
      const name = member.full_name || member.cast_member_name;
      const image = member.cover_photo_url || member.photo_url;
      if (!name || !image) continue;
      if (deduped.has(member.person_id)) continue;
      deduped.set(member.person_id, {
        name,
        image,
        role: member.role ?? undefined,
        status: "main",
        trrPersonId: member.person_id,
      });
    }
    setCastMembers(Array.from(deduped.values()));
  };

  const saveSeason = async () => {
    setSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(`/api/admin/shows/${showKey}/seasons/${season.id}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          colors,
          castMembers,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || `Failed to save season (HTTP ${response.status})`);
      }
      onSeasonSaved((data as { season: BrandSeasonRecord }).season);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save season");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Season</p>
          <h3 className="text-xl font-bold text-zinc-900">Season {season.season_number}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={seedFromTrrCast}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Seed from TRR Cast
          </button>
          <button
            type="button"
            onClick={saveSeason}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Season"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-zinc-700">Label</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
            />
          </label>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Colors</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <ColorField
                label="Primary"
                value={colors.primary}
                onChange={(value) => setColors((prev) => ({ ...prev, primary: value }))}
              />
              <ColorField
                label="Accent"
                value={colors.accent}
                onChange={(value) => setColors((prev) => ({ ...prev, accent: value }))}
              />
              <ColorField
                label="Neutral"
                value={colors.neutral}
                onChange={(value) => setColors((prev) => ({ ...prev, neutral: value }))}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Cast Portraits</p>
              <p className="text-sm text-zinc-600">{castMembers.length} member{castMembers.length === 1 ? "" : "s"}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setCastMembers((prev) => [
                  ...prev,
                  { name: "", image: "", status: "main" },
                ])
              }
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              + Add
            </button>
          </div>

          <div className="space-y-3">
            {castMembers.map((member, idx) => (
              <CastMemberEditor
                key={`${member.trrPersonId ?? member.name}-${idx}`}
                value={member}
                onChange={(next) =>
                  setCastMembers((prev) => prev.map((m, i) => (i === idx ? next : m)))
                }
                onRemove={() => setCastMembers((prev) => prev.filter((_, i) => i !== idx))}
              />
            ))}
            {castMembers.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                No cast portraits yet. Seed from TRR Cast or add members manually.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ShowBrandEditor({
  trrShowId,
  trrShowName,
  trrSeasons,
  trrCast,
}: {
  trrShowId: string;
  trrShowName: string;
  trrSeasons: TrrSeasonLike[];
  trrCast: TrrCastMemberLike[];
}) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showRecord, setShowRecord] = useState<BrandShowRecord | null>(null);
  const [seasons, setSeasons] = useState<BrandSeasonRecord[]>([]);

  // Show form state
  const [palette, setPalette] = useState<ShowPalette>(defaultPalette());
  const [fontsHeading, setFontsHeading] = useState("");
  const [fontsBody, setFontsBody] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [wordmarkUrl, setWordmarkUrl] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [defaultPosterAssetId, setDefaultPosterAssetId] = useState("");
  const [defaultBackdropAssetId, setDefaultBackdropAssetId] = useState("");
  const [defaultLogoAssetId, setDefaultLogoAssetId] = useState("");
  const [showMediaAssets, setShowMediaAssets] = useState<BrandMediaAssetLike[]>([]);
  const [showMediaLoading, setShowMediaLoading] = useState(false);

  // New season state
  const [creatingSeason, setCreatingSeason] = useState(false);
  const [newSeasonNumber, setNewSeasonNumber] = useState<number>(1);
  const [newSeasonLabel, setNewSeasonLabel] = useState<string>("");

  const getAuthHeaders = useCallback(async () => getClientAuthHeaders(), []);
  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => fetchAdminWithAuth(input, init),
    [],
  );

  const fetchShowMediaAssets = useCallback(async () => {
    setShowMediaLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(`/api/admin/trr-api/shows/${trrShowId}/assets`, {
        headers,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (data as { error?: string }).error ||
            `Failed to load show assets (HTTP ${response.status})`
        );
      }
      const assetsRaw = (data as { assets?: unknown }).assets;
      const assets = Array.isArray(assetsRaw)
        ? (assetsRaw as BrandMediaAssetLike[]).filter(
            (asset) =>
              asset &&
              asset.type === "show" &&
              typeof asset.id === "string" &&
              typeof asset.hosted_url === "string"
          )
        : [];
      setShowMediaAssets(assets);
    } catch (err) {
      console.warn("Failed to fetch show media assets for brand defaults:", err);
      setShowMediaAssets([]);
    } finally {
      setShowMediaLoading(false);
    }
  }, [getAuthHeaders, trrShowId]);

  const fetchBrand = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(`/api/admin/shows/by-trr-show/${trrShowId}?includeSeasons=true`, {
        headers,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || `Failed to load brand profile (HTTP ${response.status})`);
      }

      const payload = data as { show: BrandShowRecord | null; seasons?: BrandSeasonRecord[] };
      setShowRecord(payload.show);
      setSeasons(payload.seasons ?? []);

      if (payload.show) {
        const nextPalette = payload.show.palette ?? defaultPalette();
        const nextFonts = payload.show.fonts ?? {};
        setPalette(nextPalette);
        setFontsHeading(typeof nextFonts.heading === "string" ? nextFonts.heading : "");
        setFontsBody(typeof nextFonts.body === "string" ? nextFonts.body : "");
        setIconUrl(payload.show.icon_url ?? "");
        setWordmarkUrl(payload.show.wordmark_url ?? "");
        setHeroUrl(payload.show.hero_url ?? "");
        setDefaultPosterAssetId(
          typeof nextFonts.defaultPosterAssetId === "string"
            ? nextFonts.defaultPosterAssetId
            : ""
        );
        setDefaultBackdropAssetId(
          typeof nextFonts.defaultBackdropAssetId === "string"
            ? nextFonts.defaultBackdropAssetId
            : ""
        );
        setDefaultLogoAssetId(
          typeof nextFonts.defaultLogoAssetId === "string"
            ? nextFonts.defaultLogoAssetId
            : ""
        );
      } else {
        setDefaultPosterAssetId("");
        setDefaultBackdropAssetId("");
        setDefaultLogoAssetId("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brand profile");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, trrShowId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  useEffect(() => {
    void fetchShowMediaAssets();
  }, [fetchShowMediaAssets]);

  const availableSeasonNumbers = useMemo(() => {
    const fromTrr = trrSeasons.map((s) => s.season_number).filter((n) => Number.isFinite(n));
    const base = fromTrr.length > 0 ? fromTrr : Array.from({ length: 30 }, (_, i) => i + 1);
    const used = new Set(seasons.map((s) => s.season_number));
    return base.filter((n) => !used.has(n)).sort((a, b) => a - b);
  }, [trrSeasons, seasons]);

  const showPosterAssets = useMemo(
    () =>
      showMediaAssets.filter(
        (asset) => asset.type === "show" && normalizeAssetKind(asset.kind) === "poster"
      ),
    [showMediaAssets]
  );
  const showBackdropAssets = useMemo(
    () =>
      showMediaAssets.filter(
        (asset) => asset.type === "show" && normalizeAssetKind(asset.kind) === "backdrop"
      ),
    [showMediaAssets]
  );
  const showLogoAssets = useMemo(
    () =>
      showMediaAssets.filter(
        (asset) => asset.type === "show" && normalizeAssetKind(asset.kind) === "logo"
      ),
    [showMediaAssets]
  );
  const showAssetUrlById = useMemo(
    () =>
      new Map(
        showMediaAssets
          .filter((asset) => typeof asset.id === "string" && typeof asset.hosted_url === "string")
          .map((asset) => [asset.id, asset.hosted_url])
      ),
    [showMediaAssets]
  );

  useEffect(() => {
    if (availableSeasonNumbers.length > 0) {
      setNewSeasonNumber((prev) => (availableSeasonNumbers.includes(prev) ? prev : availableSeasonNumbers[0]));
    }
  }, [availableSeasonNumbers]);

  const createBrandProfile = async () => {
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      const base = slugify(trrShowName) || "show";
      const key = `${base.slice(0, 24)}-${trrShowId.slice(0, 8)}`;

      const response = await fetchWithAuth("/api/admin/shows", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          title: trrShowName,
          trrShowId: trrShowId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || `Failed to create brand profile (HTTP ${response.status})`);
      }

      setSuccess("Brand profile created.");
      await fetchBrand();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create brand profile");
    } finally {
      setCreating(false);
    }
  };

  const saveShow = async () => {
    if (!showRecord) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(`/api/admin/shows/${showRecord.key}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          trrShowId,
          palette,
          fonts: {
            ...(showRecord.fonts ?? {}),
            heading: fontsHeading || undefined,
            body: fontsBody || undefined,
            defaultPosterAssetId: defaultPosterAssetId || undefined,
            defaultPosterUrl:
              (defaultPosterAssetId ? showAssetUrlById.get(defaultPosterAssetId) : null) ??
              undefined,
            defaultBackdropAssetId: defaultBackdropAssetId || undefined,
            defaultBackdropUrl:
              (defaultBackdropAssetId
                ? showAssetUrlById.get(defaultBackdropAssetId)
                : null) ?? undefined,
            defaultLogoAssetId: defaultLogoAssetId || undefined,
            defaultLogoUrl:
              (defaultLogoAssetId ? showAssetUrlById.get(defaultLogoAssetId) : null) ??
              undefined,
          },
          iconUrl: iconUrl || null,
          wordmarkUrl: wordmarkUrl || null,
          heroUrl: heroUrl || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || `Failed to save show (HTTP ${response.status})`);
      }

      const nextShow = (data as { show: BrandShowRecord }).show;
      setShowRecord(nextShow);
      setSuccess("Brand saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save brand");
    } finally {
      setSaving(false);
    }
  };

  const createSeason = async () => {
    if (!showRecord) return;
    setCreatingSeason(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(`/api/admin/shows/${showRecord.key}/seasons`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonNumber: newSeasonNumber,
          label: newSeasonLabel || `Season ${newSeasonNumber}`,
          colors: {
            primary: palette.primary,
            accent: palette.accent,
            neutral: palette.light,
          },
          castMembers: [],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || `Failed to create season (HTTP ${response.status})`);
      }

      const created = (data as { season: BrandSeasonRecord }).season;
      setSeasons((prev) => [created, ...prev].sort((a, b) => b.season_number - a.season_number));
      setNewSeasonLabel("");
      setSuccess(`Season ${created.season_number} created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create season");
    } finally {
      setCreatingSeason(false);
    }
  };

  const handleSeasonSaved = (next: BrandSeasonRecord) => {
    setSeasons((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
      </div>
    );
  }

  if (!showRecord) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Brand</p>
            <h2 className="mt-1 text-2xl font-bold text-zinc-900">{trrShowName}</h2>
            <p className="mt-2 text-sm text-zinc-600">
              No brand profile exists for this TRR show yet. Create one to manage palette, fonts, and season cast portraits.
            </p>
          </div>
          <button
            type="button"
            onClick={createBrandProfile}
            disabled={creating}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create Brand Profile"}
          </button>
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Brand</p>
            <h2 className="mt-1 text-2xl font-bold text-zinc-900">{showRecord.title}</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Palette, fonts, and brand assets for this TRR show. Fonts are free-text; reference the{" "}
              <Link href="/admin/fonts" className="font-semibold text-zinc-900 hover:underline">
                Font Library
              </Link>{" "}
              for available stacks.
            </p>
          </div>
          <button
            type="button"
            onClick={saveShow}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Brand"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Palette</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <ColorField
                label="Primary"
                value={palette.primary}
                onChange={(value) => setPalette((prev) => ({ ...prev, primary: value }))}
              />
              <ColorField
                label="Accent"
                value={palette.accent}
                onChange={(value) => setPalette((prev) => ({ ...prev, accent: value }))}
              />
              <ColorField
                label="Dark"
                value={palette.dark}
                onChange={(value) => setPalette((prev) => ({ ...prev, dark: value }))}
              />
              <ColorField
                label="Light"
                value={palette.light}
                onChange={(value) => setPalette((prev) => ({ ...prev, light: value }))}
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Typography</p>
            <div className="mt-3 grid gap-4">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Heading</span>
                <input
                  type="text"
                  value={fontsHeading}
                  onChange={(e) => setFontsHeading(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder='e.g. "Gloucester"'
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Body</span>
                <input
                  type="text"
                  value={fontsBody}
                  onChange={(e) => setFontsBody(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder='e.g. "Hamburg Serial"'
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Asset URLs</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-zinc-700">Icon</span>
              <input
                type="text"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                placeholder="https://..."
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-zinc-700">Wordmark</span>
              <input
                type="text"
                value={wordmarkUrl}
                onChange={(e) => setWordmarkUrl(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                placeholder="https://..."
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-zinc-700">Hero</span>
              <input
                type="text"
                value={heroUrl}
                onChange={(e) => setHeroUrl(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                placeholder="https://..."
              />
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Default Media
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Choose brand defaults from imported show media.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-zinc-700">
                Default Poster
              </span>
              <select
                value={defaultPosterAssetId}
                onChange={(e) => setDefaultPosterAssetId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                disabled={showMediaLoading}
              >
                <option value="">None</option>
                {showPosterAssets.map((asset, index) => (
                  <option key={`poster-${asset.id}`} value={asset.id}>
                    {`Poster ${index + 1}${asset.source ? ` (${asset.source})` : ""}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-zinc-700">
                Default Backdrop
              </span>
              <select
                value={defaultBackdropAssetId}
                onChange={(e) => setDefaultBackdropAssetId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                disabled={showMediaLoading}
              >
                <option value="">None</option>
                {showBackdropAssets.map((asset, index) => (
                  <option key={`backdrop-${asset.id}`} value={asset.id}>
                    {`Backdrop ${index + 1}${asset.source ? ` (${asset.source})` : ""}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-zinc-700">
                Default Logo
              </span>
              <select
                value={defaultLogoAssetId}
                onChange={(e) => setDefaultLogoAssetId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                disabled={showMediaLoading}
              >
                <option value="">None</option>
                {showLogoAssets.map((asset, index) => (
                  <option key={`logo-${asset.id}`} value={asset.id}>
                    {`Logo ${index + 1}${asset.source ? ` (${asset.source})` : ""}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            {showMediaLoading
              ? "Loading show media..."
              : `${showPosterAssets.length} posters, ${showBackdropAssets.length} backdrops, ${showLogoAssets.length} logos available.`}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Seasons</p>
            <h3 className="mt-1 text-xl font-bold text-zinc-900">Season Brand Overrides</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Store per-season colors and cast portraits for featured franchise experiences.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Season
              </label>
              <select
                value={newSeasonNumber}
                onChange={(e) => setNewSeasonNumber(parseInt(e.target.value, 10))}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                disabled={availableSeasonNumbers.length === 0}
              >
                {availableSeasonNumbers.length === 0 ? (
                  <option value={newSeasonNumber}>All seasons added</option>
                ) : (
                  availableSeasonNumbers.map((n) => (
                    <option key={n} value={n}>
                      Season {n}
                    </option>
                  ))
                )}
              </select>
            </div>
            <input
              type="text"
              value={newSeasonLabel}
              onChange={(e) => setNewSeasonLabel(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              placeholder={`Season ${newSeasonNumber}`}
              disabled={availableSeasonNumbers.length === 0}
            />
            <button
              type="button"
              onClick={createSeason}
              disabled={creatingSeason || availableSeasonNumbers.length === 0}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {creatingSeason ? "Adding…" : "Add Season"}
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        {seasons
          .slice()
          .sort((a, b) => b.season_number - a.season_number)
          .map((season) => (
            <BrandSeasonEditor
              key={season.id}
              showKey={showRecord.key}
              season={season}
              trrCast={trrCast}
              onSeasonSaved={handleSeasonSaved}
            />
          ))}

        {seasons.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
            <p className="text-sm font-semibold text-zinc-900">No seasons configured</p>
            <p className="mt-2 text-sm text-zinc-600">
              Add a season above to start storing per-season colors and cast portraits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
