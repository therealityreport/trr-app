"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { DEFAULT_SURVEY_THEME, type SurveyTheme } from "@/lib/surveys/types";

// ============================================================================
// Types
// ============================================================================

interface SurveyConfig {
  id: string;
  key: string;
  title: string;
  description: string | null;
  show_id: string | null;
  season_number: number | null;
  is_active: boolean;
  theme: Partial<SurveyTheme> | null;
  air_schedule: AirSchedule | null;
  current_episode_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AirSchedule {
  airDays: string[];
  airTime: string;
  timezone: string;
  autoProgress: boolean;
}

interface CastMember {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  role: string | null;
  status: "main" | "friend" | "new" | "alum" | null;
  instagram: string | null;
  display_order: number;
  is_alumni: boolean;
  alumni_verdict_enabled: boolean;
}

interface Episode {
  id: string;
  episode_number: number;
  episode_id: string;
  episode_label: string | null;
  air_date: string | null;
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
  is_current: boolean;
}

interface Asset {
  id: string;
  type: "season" | "episode" | "cast" | "show";
  source: string;
  kind: string;
  hosted_url: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  episode_number?: number;
  person_name?: string;
  person_id?: string;
}

interface RunWithCount {
  id: string;
  survey_id: string;
  run_key: string;
  title: string | null;
  starts_at: string;
  ends_at: string | null;
  max_submissions_per_user: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  response_count: number;
}

interface SurveyResponseRow {
  id: string;
  survey_run_id: string;
  user_id: string;
  submission_number: number;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface SurveyAnswerRow {
  id: string;
  response_id: string;
  question_id: string;
  option_id: string | null;
  text_value: string | null;
  numeric_value: number | null;
  json_value: unknown;
  created_at: string;
}

interface ResponseWithAnswers extends SurveyResponseRow {
  answers: SurveyAnswerRow[];
}

type TabId = "settings" | "theme" | "cast" | "episodes" | "responses" | "assets";

// ============================================================================
// Main Component
// ============================================================================

export default function SurveyEditorPage({
  params,
}: {
  params: Promise<{ surveyKey: string }>;
}) {
  const { surveyKey } = use(params);
  const { user, userKey, checking, hasAccess } = useAdminGuard();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabId>("settings");
  const [survey, setSurvey] = useState<SurveyConfig | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetFilter, setAssetFilter] = useState<"all" | "season" | "episode" | "cast">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "responses") {
      setActiveTab("responses");
    }
  }, [searchParams]);

  // Responses (normalized runs + responses)
  const [runs, setRuns] = useState<RunWithCount[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [responses, setResponses] = useState<SurveyResponseRow[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesPage, setResponsesPage] = useState(0);
  const [responsesError, setResponsesError] = useState<string | null>(null);
  const [exportingResponses, setExportingResponses] = useState(false);

  // Response detail modal
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [responseDetailLoading, setResponseDetailLoading] = useState(false);
  const [responseDetail, setResponseDetail] = useState<ResponseWithAnswers | null>(null);

  // Form state for settings
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editShowId, setEditShowId] = useState("");
  const [editSeasonNumber, setEditSeasonNumber] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Air schedule state
  const [editAirDays, setEditAirDays] = useState<string[]>([]);
  const [editAirTime, setEditAirTime] = useState("");
  const [editTimezone, setEditTimezone] = useState("America/New_York");
  const [editAutoProgress, setEditAutoProgress] = useState(false);

  // Theme state
  const [themeOverrides, setThemeOverrides] = useState<Partial<SurveyTheme>>({});

  // Cast member modal state
  const [castModalOpen, setCastModalOpen] = useState(false);
  const [editingCastMember, setEditingCastMember] = useState<CastMember | null>(null);
  const [castForm, setCastForm] = useState({
    name: "",
    slug: "",
    role: "",
    status: "main" as "main" | "friend" | "new" | "alum",
    image_url: "",
    instagram: "",
    is_alumni: false,
    alumni_verdict_enabled: false,
  });

  // Episode modal state
  const [episodeModalOpen, setEpisodeModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [episodeForm, setEpisodeForm] = useState({
    episode_number: "",
    episode_id: "",
    episode_label: "",
    air_date: "",
    opens_at: "",
    closes_at: "",
  });

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
      }),
    [user],
  );

  const fetchSurvey = useCallback(async () => {
    if (!userKey) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(
        `/api/admin/surveys/${surveyKey}?includeCast=true&includeEpisodes=true&includeAssets=true`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to fetch survey");
      }

      const data = await response.json();
      setSurvey(data.survey);
      setCast(data.cast ?? []);
      setEpisodes(data.episodes ?? []);
      setAssets(data.assets ?? []);

      // Initialize form state
      setEditTitle(data.survey.title);
      setEditDescription(data.survey.description ?? "");
      setEditShowId(data.survey.show_id ?? "");
      setEditSeasonNumber(data.survey.season_number?.toString() ?? "");
      setEditIsActive(data.survey.is_active);
      setThemeOverrides(data.survey.theme ?? {});

      // Initialize air schedule
      const airSchedule = data.survey.air_schedule;
      setEditAirDays(airSchedule?.airDays ?? []);
      setEditAirTime(airSchedule?.airTime ?? "");
      setEditTimezone(airSchedule?.timezone ?? "America/New_York");
      setEditAutoProgress(airSchedule?.autoProgress ?? false);
    } catch (err) {
      console.error("Failed to fetch survey", err);
      setError(err instanceof Error ? err.message : "Failed to fetch survey");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, surveyKey, userKey]);

  useEffect(() => {
    if (hasAccess && userKey) {
      fetchSurvey();
    }
  }, [hasAccess, userKey, fetchSurvey]);

  const fetchRunsForResponses = useCallback(async () => {
    if (!userKey) return;

    try {
      setRunsLoading(true);
      setResponsesError(null);

      const response = await fetchWithAuth(`/api/admin/normalized-surveys/${surveyKey}/runs`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to fetch runs");
      }

      const nextRuns = (data as { runs?: RunWithCount[] }).runs ?? [];
      setRuns(nextRuns);

      // Select the most recent run by default.
      if (!selectedRunId && nextRuns.length > 0) {
        setSelectedRunId(nextRuns[0].id);
      }
    } catch (err) {
      setResponsesError(err instanceof Error ? err.message : "Failed to fetch runs");
    } finally {
      setRunsLoading(false);
    }
  }, [fetchWithAuth, surveyKey, selectedRunId, userKey]);

  const fetchResponsesForRun = useCallback(
    async (runId: string) => {
      if (!userKey) return;

      try {
        setResponsesLoading(true);
        setResponsesError(null);
        setResponsesPage(0);
        setResponseDetail(null);

        const response = await fetchWithAuth(
          `/api/admin/normalized-surveys/${surveyKey}/runs/${runId}/responses`,
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error((data as { error?: string }).error ?? "Failed to fetch responses");
        }

        setResponses((data as { responses?: SurveyResponseRow[] }).responses ?? []);
      } catch (err) {
        setResponsesError(err instanceof Error ? err.message : "Failed to fetch responses");
      } finally {
        setResponsesLoading(false);
      }
    },
    [fetchWithAuth, surveyKey, userKey]
  );

  const openResponseDetail = useCallback(
    async (runId: string, responseId: string) => {
      if (!userKey) return;

      setResponseModalOpen(true);
      setResponseDetail(null);
      setResponseDetailLoading(true);
      setResponsesError(null);

      try {
        const response = await fetchWithAuth(
          `/api/admin/normalized-surveys/${surveyKey}/runs/${runId}/responses?responseId=${encodeURIComponent(
            responseId
          )}`,
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((data as { error?: string }).error ?? "Failed to fetch response");
        }

        setResponseDetail((data as { response: ResponseWithAnswers }).response);
      } catch (err) {
        setResponsesError(err instanceof Error ? err.message : "Failed to fetch response");
      } finally {
        setResponseDetailLoading(false);
      }
    },
    [fetchWithAuth, surveyKey, userKey]
  );

  const exportResponsesCsv = useCallback(async () => {
    if (!userKey || !selectedRunId) return;

    setExportingResponses(true);
    setResponsesError(null);
    try {
      const response = await fetchWithAuth(
        `/api/admin/normalized-surveys/${surveyKey}/runs/${selectedRunId}/export`,
      );

      const bodyText = await response.text();
      if (!response.ok) {
        try {
          const parsed = JSON.parse(bodyText) as { error?: string };
          throw new Error(parsed.error ?? "Failed to export responses");
        } catch {
          throw new Error(bodyText || "Failed to export responses");
        }
      }

      const disposition = response.headers.get("content-disposition") ?? "";
      const match = /filename=\"?([^\";]+)\"?/i.exec(disposition);
      const filename = match?.[1] ?? `${surveyKey}-responses.csv`;

      const blob = new Blob([bodyText], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setResponsesError(err instanceof Error ? err.message : "Failed to export responses");
    } finally {
      setExportingResponses(false);
    }
  }, [fetchWithAuth, selectedRunId, surveyKey, userKey]);

  useEffect(() => {
    if (!hasAccess || !userKey) return;
    if (activeTab !== "responses") return;
    fetchRunsForResponses();
  }, [activeTab, fetchRunsForResponses, hasAccess, userKey]);

  useEffect(() => {
    if (!hasAccess || !userKey) return;
    if (activeTab !== "responses") return;
    if (!selectedRunId) return;
    fetchResponsesForRun(selectedRunId);
  }, [activeTab, fetchResponsesForRun, hasAccess, selectedRunId, userKey]);

  const saveSettings = async () => {
    if (!user || !survey) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetchWithAuth(`/api/admin/surveys/${surveyKey}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || null,
          showId: editShowId || null,
          seasonNumber: editSeasonNumber ? parseInt(editSeasonNumber, 10) : null,
          isActive: editIsActive,
          airSchedule: editAirDays.length > 0 && editAirTime
            ? {
                airDays: editAirDays,
                airTime: editAirTime,
                timezone: editTimezone,
                autoProgress: editAutoProgress,
              }
            : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to save settings");
      }

      const data = await response.json();
      setSurvey(data.survey);
      setSuccess("Settings saved successfully");
    } catch (err) {
      console.error("Failed to save settings", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveTheme = async () => {
    if (!user || !survey) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetchWithAuth(`/api/admin/surveys/${surveyKey}/theme`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ theme: themeOverrides }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to save theme");
      }

      setSuccess("Theme saved successfully");
    } catch (err) {
      console.error("Failed to save theme", err);
      setError(err instanceof Error ? err.message : "Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  const activateEpisode = async (episodeId: string) => {
    if (!user || !survey) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetchWithAuth(
        `/api/admin/surveys/${surveyKey}/episodes/${episodeId}/activate`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to activate episode");
      }

      const data = await response.json();
      setEpisodes(data.episodes);
      setSuccess("Episode activated successfully");
    } catch (err) {
      console.error("Failed to activate episode", err);
      setError(err instanceof Error ? err.message : "Failed to activate episode");
    } finally {
      setSaving(false);
    }
  };

  // Cast member modal functions
  const openCastModal = (member?: CastMember) => {
    if (member) {
      setEditingCastMember(member);
      setCastForm({
        name: member.name,
        slug: member.slug,
        role: member.role ?? "",
        status: (member.status as "main" | "friend" | "new" | "alum") ?? "main",
        image_url: member.image_url ?? "",
        instagram: member.instagram ?? "",
        is_alumni: member.is_alumni,
        alumni_verdict_enabled: member.alumni_verdict_enabled,
      });
    } else {
      setEditingCastMember(null);
      setCastForm({
        name: "",
        slug: "",
        role: "",
        status: "main",
        image_url: "",
        instagram: "",
        is_alumni: false,
        alumni_verdict_enabled: false,
      });
    }
    setCastModalOpen(true);
  };

  const closeCastModal = () => {
    setCastModalOpen(false);
    setEditingCastMember(null);
  };

  const saveCastMember = async () => {
    if (!user || !survey) return;

    try {
      setSaving(true);
      setError(null);

      const url = editingCastMember
        ? `/api/admin/surveys/${surveyKey}/cast/${editingCastMember.id}`
        : `/api/admin/surveys/${surveyKey}/cast`;

      const response = await fetchWithAuth(url, {
        method: editingCastMember ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: castForm.name,
          slug: castForm.slug || castForm.name.toLowerCase().replace(/\s+/g, "-"),
          role: castForm.role || null,
          status: castForm.status,
          imageUrl: castForm.image_url || null,
          instagram: castForm.instagram || null,
          isAlumni: castForm.is_alumni,
          alumniVerdictEnabled: castForm.alumni_verdict_enabled,
          displayOrder: editingCastMember?.display_order ?? cast.length,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to save cast member");
      }

      const data = await response.json();
      if (editingCastMember) {
        setCast(cast.map((m) => (m.id === data.castMember.id ? data.castMember : m)));
      } else {
        setCast([...cast, data.castMember]);
      }

      closeCastModal();
      setSuccess(`Cast member ${editingCastMember ? "updated" : "added"} successfully`);
    } catch (err) {
      console.error("Failed to save cast member", err);
      setError(err instanceof Error ? err.message : "Failed to save cast member");
    } finally {
      setSaving(false);
    }
  };

  const deleteCastMember = async (memberId: string) => {
    if (!user || !confirm("Are you sure you want to delete this cast member?")) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetchWithAuth(`/api/admin/surveys/${surveyKey}/cast/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to delete cast member");
      }

      setCast(cast.filter((m) => m.id !== memberId));
      setSuccess("Cast member deleted successfully");
    } catch (err) {
      console.error("Failed to delete cast member", err);
      setError(err instanceof Error ? err.message : "Failed to delete cast member");
    } finally {
      setSaving(false);
    }
  };

  // Episode modal functions
  const openEpisodeModal = (episode?: Episode) => {
    if (episode) {
      setEditingEpisode(episode);
      setEpisodeForm({
        episode_number: episode.episode_number.toString(),
        episode_id: episode.episode_id,
        episode_label: episode.episode_label ?? "",
        air_date: episode.air_date ?? "",
        opens_at: episode.opens_at ? episode.opens_at.slice(0, 16) : "",
        closes_at: episode.closes_at ? episode.closes_at.slice(0, 16) : "",
      });
    } else {
      setEditingEpisode(null);
      const nextNumber = episodes.length > 0 ? Math.max(...episodes.map((e) => e.episode_number)) + 1 : 1;
      setEpisodeForm({
        episode_number: nextNumber.toString(),
        episode_id: `E${nextNumber.toString().padStart(2, "0")}`,
        episode_label: "",
        air_date: "",
        opens_at: "",
        closes_at: "",
      });
    }
    setEpisodeModalOpen(true);
  };

  const closeEpisodeModal = () => {
    setEpisodeModalOpen(false);
    setEditingEpisode(null);
  };

  const saveEpisode = async () => {
    if (!user || !survey) return;

    try {
      setSaving(true);
      setError(null);

      const url = editingEpisode
        ? `/api/admin/surveys/${surveyKey}/episodes/${editingEpisode.id}`
        : `/api/admin/surveys/${surveyKey}/episodes`;

      const response = await fetchWithAuth(url, {
        method: editingEpisode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          episodeNumber: parseInt(episodeForm.episode_number, 10),
          episodeId: episodeForm.episode_id,
          episodeLabel: episodeForm.episode_label || null,
          airDate: episodeForm.air_date || null,
          opensAt: episodeForm.opens_at ? new Date(episodeForm.opens_at).toISOString() : null,
          closesAt: episodeForm.closes_at ? new Date(episodeForm.closes_at).toISOString() : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to save episode");
      }

      const data = await response.json();
      if (editingEpisode) {
        setEpisodes(episodes.map((e) => (e.id === data.episode.id ? data.episode : e)));
      } else {
        setEpisodes([...episodes, data.episode].sort((a, b) => a.episode_number - b.episode_number));
      }

      closeEpisodeModal();
      setSuccess(`Episode ${editingEpisode ? "updated" : "added"} successfully`);
    } catch (err) {
      console.error("Failed to save episode", err);
      setError(err instanceof Error ? err.message : "Failed to save episode");
    } finally {
      setSaving(false);
    }
  };

  const deleteEpisode = async (episodeId: string) => {
    if (!user || !confirm("Are you sure you want to delete this episode?")) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetchWithAuth(`/api/admin/surveys/${surveyKey}/episodes/${episodeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to delete episode");
      }

      setEpisodes(episodes.filter((e) => e.id !== episodeId));
      setSuccess("Episode deleted successfully");
    } catch (err) {
      console.error("Failed to delete episode", err);
      setError(err instanceof Error ? err.message : "Failed to delete episode");
    } finally {
      setSaving(false);
    }
  };

  if (checking || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading survey editor...</p>
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
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Survey Not Found</h1>
          <p className="mt-2 text-zinc-600">The survey &quot;{surveyKey}&quot; does not exist.</p>
          <Link
            href="/admin/surveys"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Surveys
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "settings", label: "Settings" },
    { id: "theme", label: "Theme" },
    { id: "cast", label: `Cast (${cast.length})` },
    { id: "episodes", label: `Episodes (${episodes.length})` },
    { id: "responses", label: "Responses" },
    { id: "assets", label: `Assets (${assets.length})` },
  ];

  const filteredAssets = assetFilter === "all" ? assets : assets.filter((a) => a.type === assetFilter);

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white px-6 py-6">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Admin / Survey Editor
                </p>
                <h1 className="text-3xl font-bold text-zinc-900">{survey.title}</h1>
                <p className="text-sm text-zinc-500">{survey.key}</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/admin/surveys"
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Back to Surveys
                </Link>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-1 border-b border-zinc-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "border-b-2 border-zinc-900 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {/* Notifications */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {success}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-xl font-bold text-zinc-900">Survey Settings</h2>
              <p className="mt-1 text-sm text-zinc-500">Configure basic survey properties.</p>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">Survey Key</label>
                  <input
                    type="text"
                    value={survey.key}
                    disabled
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">Show ID</label>
                  <input
                    type="text"
                    value={editShowId}
                    onChange={(e) => setEditShowId(e.target.value)}
                    placeholder="e.g., tt12623782"
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">Season Number</label>
                  <input
                    type="number"
                    value={editSeasonNumber}
                    onChange={(e) => setEditSeasonNumber(e.target.value)}
                    placeholder="e.g., 6"
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    <span className="text-sm font-medium text-zinc-700">Survey is active</span>
                  </label>
                </div>
              </div>

              {/* Air Schedule Section */}
              <div className="mt-8 border-t border-zinc-200 pt-6">
                <h3 className="text-lg font-bold text-zinc-900">Air Schedule</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Configure when new episodes air. Episodes will auto-progress after the air time.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Air Days</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setEditAirDays((prev) =>
                              prev.includes(day)
                                ? prev.filter((d) => d !== day)
                                : [...prev, day]
                            );
                          }}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                            editAirDays.includes(day)
                              ? "bg-zinc-900 text-white"
                              : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Air Time</label>
                    <input
                      type="time"
                      value={editAirTime}
                      onChange={(e) => setEditAirTime(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Timezone</label>
                    <select
                      value={editTimezone}
                      onChange={(e) => setEditTimezone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                    >
                      <option value="America/New_York">Eastern (ET)</option>
                      <option value="America/Chicago">Central (CT)</option>
                      <option value="America/Denver">Mountain (MT)</option>
                      <option value="America/Los_Angeles">Pacific (PT)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editAutoProgress}
                        onChange={(e) => setEditAutoProgress(e.target.checked)}
                        className="rounded border-zinc-300"
                      />
                      <span className="text-sm font-medium text-zinc-700">
                        Auto-progress episodes after air time
                      </span>
                    </label>
                  </div>
                </div>

                {editAirDays.length > 0 && editAirTime && (
                  <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    New episodes air on{" "}
                    <strong>{editAirDays.join(", ")}</strong> at{" "}
                    <strong>{editAirTime}</strong> ({editTimezone})
                    {editAutoProgress && (
                      <span>. Episodes will auto-progress after airing.</span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === "theme" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-xl font-bold text-zinc-900">Theme Configuration</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Customize colors and fonts. Leave empty to use defaults.
              </p>

              <div className="mt-6 grid gap-6">
                {/* Page Colors */}
                <div>
                  <h3 className="font-semibold text-zinc-800">Page</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <ThemeColorInput
                      label="Background"
                      value={themeOverrides.pageBg}
                      defaultValue={DEFAULT_SURVEY_THEME.pageBg}
                      onChange={(v) => setThemeOverrides({ ...themeOverrides, pageBg: v || undefined })}
                    />
                    <ThemeColorInput
                      label="Text"
                      value={themeOverrides.pageText}
                      defaultValue={DEFAULT_SURVEY_THEME.pageText}
                      onChange={(v) => setThemeOverrides({ ...themeOverrides, pageText: v || undefined })}
                    />
                  </div>
                </div>

                {/* Question Typography */}
                <div>
                  <h3 className="font-semibold text-zinc-800">Typography</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <ThemeColorInput
                      label="Question Color"
                      value={themeOverrides.questionColor}
                      defaultValue={DEFAULT_SURVEY_THEME.questionColor}
                      onChange={(v) => setThemeOverrides({ ...themeOverrides, questionColor: v || undefined })}
                    />
                    <ThemeColorInput
                      label="Instruction Color"
                      value={themeOverrides.instructionColor}
                      defaultValue={DEFAULT_SURVEY_THEME.instructionColor}
                      onChange={(v) => setThemeOverrides({ ...themeOverrides, instructionColor: v || undefined })}
                    />
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <h3 className="font-semibold text-zinc-800">Progress Bar</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    <ThemeColorInput
                      label="Background"
                      value={themeOverrides.progressBg}
                      defaultValue={DEFAULT_SURVEY_THEME.progressBg}
                      onChange={(v) => setThemeOverrides({ ...themeOverrides, progressBg: v || undefined })}
                    />
                    <ThemeColorInput
                      label="Fill"
                      value={themeOverrides.progressFill}
                      defaultValue={DEFAULT_SURVEY_THEME.progressFill}
                      onChange={(v) => setThemeOverrides({ ...themeOverrides, progressFill: v || undefined })}
                    />
                    <ThemeColorInput
                      label="Text"
                      value={themeOverrides.progressText}
                      defaultValue={DEFAULT_SURVEY_THEME.progressText}
                      onChange={(v) => setThemeOverrides({ ...themeOverrides, progressText: v || undefined })}
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div>
                  <h3 className="font-semibold text-zinc-800">Buttons</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    <ThemeColorInput
                      label="Submit Background"
                      value={themeOverrides.submitBg}
                      defaultValue={DEFAULT_SURVEY_THEME.submitBg}
                      onChange={(v) => setThemeOverrides({ ...themeOverrides, submitBg: v || undefined })}
                    />
                    <ThemeColorInput
                      label="Submit Text"
                      value={themeOverrides.submitText}
                      defaultValue={DEFAULT_SURVEY_THEME.submitText}
                      onChange={(v) => setThemeOverrides({ ...themeOverrides, submitText: v || undefined })}
                    />
                    <ThemeColorInput
                      label="Reset Text"
                      value={themeOverrides.resetText}
                      defaultValue={DEFAULT_SURVEY_THEME.resetText}
                      onChange={(v) => setThemeOverrides({ ...themeOverrides, resetText: v || undefined })}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setThemeOverrides({})}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Reset to Defaults
                </button>
                <button
                  type="button"
                  onClick={saveTheme}
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Theme"}
                </button>
              </div>
            </div>
          )}

          {/* Cast Tab */}
          {activeTab === "cast" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Cast Members</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Manage cast members for ranking and verdicts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCastModal()}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  + Add Cast Member
                </button>
              </div>

              {cast.length === 0 ? (
                <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-500">
                  No cast members yet. Add cast members to enable ranking.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {cast.map((member, index) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                    >
                      <span className="w-8 text-center text-lg font-bold text-zinc-400">
                        {index + 1}
                      </span>
                      <div className="relative h-12 w-12 overflow-hidden rounded-full bg-zinc-200">
                        {member.image_url ? (
                          <Image
                            src={member.image_url}
                            alt={member.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-400">
                            {member.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-zinc-900">{member.name}</p>
                        <p className="text-sm text-zinc-500">
                          {member.role ?? "No role"} • {member.status ?? "No status"}
                          {member.is_alumni && " • Alumni"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCastModal(member)}
                        className="rounded-lg border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCastMember(member.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Episodes Tab */}
          {activeTab === "episodes" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Episodes</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Manage episode schedule and set the current active episode.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEpisodeModal()}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  + Add Episode
                </button>
              </div>

              {episodes.length === 0 ? (
                <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-500">
                  No episodes configured. Add episodes to enable episode tracking.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {episodes.map((episode) => (
                    <div
                      key={episode.id}
                      className={`flex items-center gap-4 rounded-lg border p-4 ${
                        episode.is_current
                          ? "border-green-300 bg-green-50"
                          : "border-zinc-200 bg-zinc-50"
                      }`}
                    >
                      <span className="w-12 text-center text-lg font-bold text-zinc-400">
                        {episode.episode_id}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-zinc-900">
                          Episode {episode.episode_number}
                          {episode.episode_label && ` - ${episode.episode_label}`}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {episode.air_date
                            ? `Airs ${new Date(episode.air_date).toLocaleDateString()}`
                            : "No air date set"}
                          {!episode.is_active && " • Inactive"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {episode.is_current ? (
                          <span className="rounded-full bg-green-200 px-3 py-1 text-sm font-semibold text-green-800">
                            Current
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => activateEpisode(episode.id)}
                            disabled={saving}
                            className="rounded-lg border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
                          >
                            Set Current
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEpisodeModal(episode)}
                          className="rounded-lg border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEpisode(episode.id)}
                          className="rounded-lg border border-red-200 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Responses Tab */}
          {activeTab === "responses" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Survey Responses</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Browse responses from normalized survey runs. Select a run to view submissions.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={fetchRunsForResponses}
                    disabled={runsLoading}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
                  >
                    {runsLoading ? "Refreshing…" : "Refresh Runs"}
                  </button>
                  <button
                    type="button"
                    onClick={exportResponsesCsv}
                    disabled={exportingResponses || !selectedRunId}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {exportingResponses ? "Exporting…" : "Export CSV"}
                  </button>
                </div>
              </div>

              {responsesError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {responsesError}
                </div>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-[1fr,auto] md:items-end">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Run</label>
                  <select
                    value={selectedRunId}
                    onChange={(e) => setSelectedRunId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                    disabled={runsLoading || runs.length === 0}
                  >
                    {runs.length === 0 ? (
                      <option value="">No runs found</option>
                    ) : (
                      runs.map((run) => {
                        const start = new Date(run.starts_at).toLocaleDateString();
                        const end = run.ends_at ? new Date(run.ends_at).toLocaleDateString() : "Open";
                        return (
                          <option key={run.id} value={run.id}>
                            {run.run_key} · {start} – {end} · {run.response_count} responses
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div className="text-sm text-zinc-500">
                  {responses.length} response{responses.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="mt-6">
                {!selectedRunId ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-500">
                    Select a run to view responses.
                  </div>
                ) : responsesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
                  </div>
                ) : responses.length === 0 ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-500">
                    No responses yet for this run.
                  </div>
                ) : (
                  (() => {
                    const PAGE_SIZE = 50;
                    const pageCount = Math.ceil(responses.length / PAGE_SIZE) || 1;
                    const pageIndex = Math.min(responsesPage, pageCount - 1);
                    const pageItems = responses.slice(
                      pageIndex * PAGE_SIZE,
                      (pageIndex + 1) * PAGE_SIZE
                    );

                    return (
                      <div className="overflow-hidden rounded-xl border border-zinc-200">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                                  Created
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                                  User ID
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                                  Submission
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                                  Completed
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 bg-white">
                              {pageItems.map((row) => (
                                <tr
                                  key={row.id}
                                  className="cursor-pointer hover:bg-zinc-50"
                                  onClick={() => openResponseDetail(selectedRunId, row.id)}
                                >
                                  <td className="px-4 py-3 text-zinc-900">
                                    {new Date(row.created_at).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                                    {row.user_id}
                                  </td>
                                  <td className="px-4 py-3 text-zinc-700">
                                    {row.submission_number}
                                  </td>
                                  <td className="px-4 py-3 text-zinc-700">
                                    {row.completed_at ? new Date(row.completed_at).toLocaleString() : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
                          <span className="text-xs text-zinc-500">
                            Page {pageIndex + 1} of {pageCount}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setResponsesPage((p) => Math.max(0, p - 1))}
                              disabled={pageIndex === 0}
                              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:opacity-50"
                            >
                              Prev
                            </button>
                            <button
                              type="button"
                              onClick={() => setResponsesPage((p) => p + 1)}
                              disabled={pageIndex >= pageCount - 1}
                              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === "assets" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Season Assets</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Images from the season, episodes, and cast.
                  </p>
                </div>
                <div className="flex gap-2">
                  {(["all", "season", "episode", "cast"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setAssetFilter(filter)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                        assetFilter === filter
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {assets.length === 0 ? (
                <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-500">
                  No assets available. Link this survey to a TRR show/season to see media.
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                    >
                      <Image
                        src={asset.hosted_url}
                        alt={asset.caption || `${asset.type} image`}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                        unoptimized
                      />
                      {/* Overlay with type badge and source */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                            {asset.type}
                          </span>
                          <span className="text-xs text-white/70">{asset.source}</span>
                        </div>
                        {asset.person_name && (
                          <p className="mt-1 truncate text-xs text-white">{asset.person_name}</p>
                        )}
                        {asset.episode_number && (
                          <p className="mt-1 text-xs text-white">Ep {asset.episode_number}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredAssets.length > 0 && (
                <p className="mt-4 text-center text-sm text-zinc-500">
                  Showing {filteredAssets.length} of {assets.length} assets
                </p>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Cast Member Modal */}
      {castModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-zinc-900">
              {editingCastMember ? "Edit Cast Member" : "Add Cast Member"}
            </h2>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Name *</label>
                <input
                  type="text"
                  value={castForm.name}
                  onChange={(e) => setCastForm({ ...castForm, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder="e.g., Lisa Barlow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Slug</label>
                <input
                  type="text"
                  value={castForm.slug}
                  onChange={(e) => setCastForm({ ...castForm, slug: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder="e.g., lisa-barlow (auto-generated if empty)"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Role</label>
                  <input
                    type="text"
                    value={castForm.role}
                    onChange={(e) => setCastForm({ ...castForm, role: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                    placeholder="e.g., Housewife"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">Status</label>
                  <select
                    value={castForm.status}
                    onChange={(e) => setCastForm({ ...castForm, status: e.target.value as "main" | "friend" | "new" | "alum" })}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  >
                    <option value="main">Main Cast</option>
                    <option value="friend">Friend Of</option>
                    <option value="new">New Cast</option>
                    <option value="alum">Alumni</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Image URL</label>
                <input
                  type="text"
                  value={castForm.image_url}
                  onChange={(e) => setCastForm({ ...castForm, image_url: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Instagram Handle</label>
                <input
                  type="text"
                  value={castForm.instagram}
                  onChange={(e) => setCastForm({ ...castForm, instagram: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder="@username"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={castForm.is_alumni}
                    onChange={(e) => setCastForm({ ...castForm, is_alumni: e.target.checked })}
                    className="rounded border-zinc-300"
                  />
                  <span className="text-sm text-zinc-700">Is Alumni (ex-wife)</span>
                </label>
                {castForm.is_alumni && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={castForm.alumni_verdict_enabled}
                      onChange={(e) => setCastForm({ ...castForm, alumni_verdict_enabled: e.target.checked })}
                      className="rounded border-zinc-300"
                    />
                    <span className="text-sm text-zinc-700">Show in verdict</span>
                  </label>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCastModal}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCastMember}
                disabled={saving || !castForm.name}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingCastMember ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Episode Modal */}
      {episodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-zinc-900">
              {editingEpisode ? "Edit Episode" : "Add Episode"}
            </h2>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Episode Number *</label>
                  <input
                    type="number"
                    value={episodeForm.episode_number}
                    onChange={(e) => setEpisodeForm({ ...episodeForm, episode_number: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                    placeholder="e.g., 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">Episode ID *</label>
                  <input
                    type="text"
                    value={episodeForm.episode_id}
                    onChange={(e) => setEpisodeForm({ ...episodeForm, episode_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                    placeholder="e.g., E01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Episode Label</label>
                <input
                  type="text"
                  value={episodeForm.episode_label}
                  onChange={(e) => setEpisodeForm({ ...episodeForm, episode_label: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder="e.g., Premiere, Reunion Part 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Air Date</label>
                <input
                  type="date"
                  value={episodeForm.air_date}
                  onChange={(e) => setEpisodeForm({ ...episodeForm, air_date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Opens At</label>
                  <input
                    type="datetime-local"
                    value={episodeForm.opens_at}
                    onChange={(e) => setEpisodeForm({ ...episodeForm, opens_at: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">Closes At</label>
                  <input
                    type="datetime-local"
                    value={episodeForm.closes_at}
                    onChange={(e) => setEpisodeForm({ ...episodeForm, closes_at: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEpisodeModal}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEpisode}
                disabled={saving || !episodeForm.episode_number || !episodeForm.episode_id}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingEpisode ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Response Detail Modal */}
      {responseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Response Detail</h2>
                {responseDetail?.id && (
                  <p className="mt-1 font-mono text-xs text-zinc-500">{responseDetail.id}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setResponseModalOpen(false);
                  setResponseDetail(null);
                }}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>
            </div>

            {responseDetailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
              </div>
            ) : !responseDetail ? (
              <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-500">
                No response loaded.
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Created</p>
                    <p className="mt-1 text-sm text-zinc-900">
                      {new Date(responseDetail.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">User ID</p>
                    <p className="mt-1 font-mono text-xs text-zinc-700">{responseDetail.user_id}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Submission</p>
                    <p className="mt-1 text-sm text-zinc-900">{responseDetail.submission_number}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Completed</p>
                    <p className="mt-1 text-sm text-zinc-900">
                      {responseDetail.completed_at ? new Date(responseDetail.completed_at).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                    Answers
                  </p>
                  <div className="mt-3 space-y-2">
                    {responseDetail.answers.map((answer) => {
                      const value =
                        answer.text_value ??
                        (typeof answer.numeric_value === "number" ? String(answer.numeric_value) : null) ??
                        answer.option_id ??
                        (answer.json_value === null || answer.json_value === undefined
                          ? null
                          : Array.isArray(answer.json_value)
                            ? answer.json_value.join(" | ")
                            : JSON.stringify(answer.json_value)) ??
                        "";

                      return (
                        <div key={answer.id} className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                          <p className="font-mono text-xs text-zinc-500">{answer.question_id}</p>
                          <p className="mt-1 text-sm text-zinc-900">{value || "—"}</p>
                        </div>
                      );
                    })}

                    {responseDetail.answers.length === 0 && (
                      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                        No answers found for this response.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ClientOnly>
  );
}

// ============================================================================
// Theme Color Input Component
// ============================================================================

function ThemeColorInput({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value: string | undefined;
  defaultValue: string;
  onChange: (value: string | undefined) => void;
}) {
  const displayValue = value ?? "";

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value || defaultValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-zinc-200"
        />
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={defaultValue}
          className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-sm text-zinc-400 hover:text-zinc-600"
            title="Reset to default"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
