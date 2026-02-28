"use client";

import * as React from "react";

import QuestionRenderer from "@/components/survey/QuestionRenderer";
import { fetchAdminWithAuth, getClientAuthHeaders } from "@/lib/admin/client-auth";
import type { QuestionOption, SurveyQuestion, SurveyWithQuestions } from "@/lib/surveys/normalized-types";
import type { UiVariant } from "@/lib/surveys/question-config-types";
import { groupBySection } from "@/lib/surveys/section-grouping";
import {
  UI_TEMPLATES,
  getUiTemplate,
  getQuestionUiVariant,
  uiVariantLabel,
} from "@/lib/surveys/ui-templates";

type QuestionWithOptions = SurveyQuestion & { options: QuestionOption[] };

interface SurveyQuestionsEditorProps {
  surveySlug: string;
  /** Optional "controlled" questions list from a parent fetch. */
  questions?: QuestionWithOptions[];
  /** Optional refresh hook for controlled mode. */
  onRefresh?: () => void;
}

type RowItem = { id: string; label: string; img?: string };

type SeasonSurveyCastRole = "main" | "friend_of";

type SeasonSurveyCastItem = {
  person_id: string;
  person_name: string | null;
  episodes_in_season: number;
  total_episodes: number | null;
  photo_url: string | null;
  survey_role: SeasonSurveyCastRole | null;
};

type TrrSeason = {
  id: string;
  season_number: number;
  title: string | null;
  poster_path: string | null;
  url_original_poster: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getOptionImage(metadata: unknown): string {
  if (!isPlainObject(metadata)) return "";
  const imagePath = metadata.imagePath;
  if (typeof imagePath === "string" && imagePath.trim()) return imagePath.trim();
  const imageUrl = metadata.imageUrl;
  if (typeof imageUrl === "string" && imageUrl.trim()) return imageUrl.trim();
  return "";
}

function mergeOptionMetadata(
  base: unknown,
  overrides: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const baseObj = isPlainObject(base) ? base : {};
  if (!overrides) return { ...baseObj };
  const next: Record<string, unknown> = { ...baseObj };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    next[key] = value;
  }
  return next;
}

function parseRows(config: unknown): RowItem[] {
  if (!isPlainObject(config)) return [];
  const rows = config.rows;
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Record<string, unknown> => isPlainObject(r))
    .map((r) => ({
      id: typeof r.id === "string" ? r.id : "",
      label: typeof r.label === "string" ? r.label : "",
      img: typeof r.img === "string" && r.img.trim() ? r.img.trim() : undefined,
    }))
    .filter((r) => r.id.trim() && r.label.trim());
}

function withUpdatedRows(config: unknown, nextRows: RowItem[]): Record<string, unknown> {
  const base = isPlainObject(config) ? config : {};
  // Preserve existing config and just replace rows.
  return { ...base, rows: nextRows };
}

function getNumericIconOverride(config: unknown): string {
  if (!isPlainObject(config)) return "";
  const value = config.iconOverrideUrl;
  return typeof value === "string" ? value : "";
}

async function getAuthToken(): Promise<string> {
  const authHeaders = await getClientAuthHeaders();
  return authHeaders.Authorization.replace(/^Bearer\s+/i, "");
}

async function fetchSurveyWithQuestions(surveySlug: string): Promise<SurveyWithQuestions> {
  const response = await fetchAdminWithAuth(`/api/admin/normalized-surveys/${surveySlug}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to fetch survey");
  }
  const data = (await response.json()) as {
    survey: SurveyWithQuestions;
    trrLink?: SurveyWithQuestions["trr_link"] | null;
  };
  const survey = data.survey;
  // Prefer the attached `survey.trr_link`, but fall back to the legacy `trrLink` envelope.
  if (!survey.trr_link && data.trrLink) {
    survey.trr_link = data.trrLink;
  }
  return survey;
}

function getQuestionSection(question: QuestionWithOptions): string {
  const cfg = (question.config ?? {}) as { section?: unknown };
  return typeof cfg.section === "string" ? cfg.section.trim() : "";
}

function sectionSortKey(section: string): string {
  const trimmed = section.trim();
  return trimmed ? trimmed.toLowerCase() : "~~ungrouped";
}

type QuestionPreset = "custom" | "rank_cast_members" | "rank_seasons";

type QuestionAutofillConfig =
  | { source: "cast"; include?: SeasonSurveyCastRole[] }
  | { source: "seasons" };

function getQuestionAutofillConfig(question: QuestionWithOptions): QuestionAutofillConfig | null {
  if (!isPlainObject(question.config)) return null;
  const autofill = question.config.autofill;
  if (!isPlainObject(autofill)) return null;
  const source = autofill.source;
  if (source === "seasons") return { source: "seasons" };
  if (source !== "cast") return null;

  const includeRaw = autofill.include;
  const include = Array.isArray(includeRaw)
    ? includeRaw.filter((r): r is SeasonSurveyCastRole => r === "main" || r === "friend_of")
    : undefined;
  return { source: "cast", include };
}

export function SurveyQuestionsEditor({
  surveySlug,
  questions: questionsProp,
  onRefresh,
}: SurveyQuestionsEditorProps) {
  const isControlled = questionsProp !== undefined;

  const [surveyInfo, setSurveyInfo] = React.useState<SurveyWithQuestions | null>(null);
  const [surveyShowIconUrl, setSurveyShowIconUrl] = React.useState<string | null>(null);
  const [localQuestions, setLocalQuestions] = React.useState<QuestionWithOptions[]>([]);
  const [loading, setLoading] = React.useState(!isControlled);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [resyncingQuestionId, setResyncingQuestionId] = React.useState<string | null>(null);

  // Add Question form
  const [newPreset, setNewPreset] = React.useState<QuestionPreset>("custom");
  const [newTemplate, setNewTemplate] = React.useState<UiVariant>("text-multiple-choice");
  const [newKey, setNewKey] = React.useState("");
  const [newText, setNewText] = React.useState("");
  const [newSection, setNewSection] = React.useState("");
  const [newRequired, setNewRequired] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [smartAdding, setSmartAdding] = React.useState<null | "cast" | "seasons">(null);

  // Editing question basics
  const [editingQuestionId, setEditingQuestionId] = React.useState<string | null>(null);
  const [editQuestionKey, setEditQuestionKey] = React.useState("");
  const [editQuestionText, setEditQuestionText] = React.useState("");
  const [editQuestionSection, setEditQuestionSection] = React.useState("");
  const [editQuestionRequired, setEditQuestionRequired] = React.useState(false);

  // Question preview
  const [previewQuestionId, setPreviewQuestionId] = React.useState<string | null>(null);
  const [previewValueByQuestionId, setPreviewValueByQuestionId] = React.useState<Record<string, unknown>>({});
  const [iconOverrideDraftByQuestionId, setIconOverrideDraftByQuestionId] = React.useState<Record<string, string>>({});

  // Options editing
  const [expandedOptions, setExpandedOptions] = React.useState<Record<string, boolean>>({});
  const [addingOptionTo, setAddingOptionTo] = React.useState<string | null>(null);
  const [newOptionKey, setNewOptionKey] = React.useState("");
  const [newOptionText, setNewOptionText] = React.useState("");
  const [newOptionImage, setNewOptionImage] = React.useState("");
  const [editingOption, setEditingOption] = React.useState<{ questionId: string; optionId: string } | null>(null);
  const [editOptionKey, setEditOptionKey] = React.useState("");
  const [editOptionText, setEditOptionText] = React.useState("");
  const [editOptionImage, setEditOptionImage] = React.useState("");

  // Rows editing (matrix-like questions)
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});
  const [addingRowTo, setAddingRowTo] = React.useState<string | null>(null);
  const [newRowId, setNewRowId] = React.useState("");
  const [newRowLabel, setNewRowLabel] = React.useState("");
  const [newRowImg, setNewRowImg] = React.useState("");
  const [editingRow, setEditingRow] = React.useState<{ questionId: string; rowId: string } | null>(null);
  const [editRowLabel, setEditRowLabel] = React.useState("");
  const [editRowImg, setEditRowImg] = React.useState("");

  const questions: QuestionWithOptions[] = React.useMemo(() => {
    if (isControlled) return questionsProp ?? [];
    return localQuestions;
  }, [isControlled, questionsProp, localQuestions]);

  const resolveSurveyShowIcon = React.useCallback(async (survey: SurveyWithQuestions | null) => {
    const trrShowId = survey?.trr_link?.trr_show_id;
    if (!trrShowId) return null;
    try {
      const token = await getAuthToken();
      const response = await fetchAdminWithAuth(`/api/admin/shows/by-trr-show/${trrShowId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      const data = (await response.json().catch(() => ({}))) as {
        show?: { icon_url?: string | null } | null;
      };
      return data.show?.icon_url ?? null;
    } catch {
      return null;
    }
  }, []);

  const refresh = React.useCallback(async () => {
    if (isControlled) {
      onRefresh?.();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const survey = await fetchSurveyWithQuestions(surveySlug);
      setSurveyInfo(survey);
      setSurveyShowIconUrl(await resolveSurveyShowIcon(survey));
      setLocalQuestions(survey.questions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [isControlled, onRefresh, resolveSurveyShowIcon, surveySlug]);

  React.useEffect(() => {
    if (!isControlled) {
      refresh();
    }
  }, [isControlled, refresh]);

  React.useEffect(() => {
    if (isControlled) {
      // When the parent controls questions, still load survey context (TRR link) for presets/resync.
      fetchSurveyWithQuestions(surveySlug)
        .then(async (survey) => {
          setSurveyInfo(survey);
          setSurveyShowIconUrl(await resolveSurveyShowIcon(survey));
        })
        .catch(() => {
          // Ignore; templates will surface actionable errors if context is missing.
        });
    }
  }, [isControlled, resolveSurveyShowIcon, surveySlug]);

  const sortedQuestions = React.useMemo(() => {
    // Group questions by section (Ungrouped last), then preserve the per-question display_order.
    return [...questions].sort((a, b) => {
      const aSectionKey = sectionSortKey(getQuestionSection(a));
      const bSectionKey = sectionSortKey(getQuestionSection(b));
      if (aSectionKey !== bSectionKey) return aSectionKey.localeCompare(bSectionKey);
      return a.display_order - b.display_order;
    });
  }, [questions]);

  React.useEffect(() => {
    setIconOverrideDraftByQuestionId((prev) => {
      const next = { ...prev };
      for (const q of sortedQuestions) {
        const uiVariant = getQuestionUiVariant(q);
        if (uiVariant !== "numeric-ranking") continue;
        if (next[q.id] !== undefined) continue;
        next[q.id] = getNumericIconOverride(q.config);
      }
      return next;
    });
  }, [sortedQuestions]);

  const questionsBySection = React.useMemo(() => {
    const groups = groupBySection(sortedQuestions, (q) => getQuestionSection(q));
    return groups.map((group) => ({
      key: group.key,
      label: group.label,
      questions: group.items.map(({ item, index }) => ({ question: item, index })),
    }));
  }, [sortedQuestions]);

  type SeedOption = { option_key: string; option_text: string; metadata?: Record<string, unknown> };

  const existingQuestionKeys = React.useMemo(() => {
    return new Set(sortedQuestions.map((q) => q.question_key));
  }, [sortedQuestions]);

  const makeUniqueQuestionKey = React.useCallback(
    (baseKey: string) => {
      const base = baseKey.trim();
      if (!base) return base;
      let next = base;
      let n = 2;
      while (existingQuestionKeys.has(next)) {
        next = `${base}_${n++}`;
      }
      return next;
    },
    [existingQuestionKeys],
  );

  React.useEffect(() => {
    if (newPreset === "custom") return;

    if (newPreset === "rank_cast_members") {
      setNewTemplate("person-rankings");
      setNewKey(makeUniqueQuestionKey("cast_ranking"));
      setNewText("Rank the cast members from your favorite to least favorite");
      setNewSection("Rankings");
      setNewRequired(true);
      return;
    }

    if (newPreset === "rank_seasons") {
      setNewTemplate("poster-rankings");
      setNewKey(makeUniqueQuestionKey("season_ranking"));
      setNewText("Rank the seasons from best to worst");
      setNewSection("Rankings");
      setNewRequired(true);
    }
  }, [makeUniqueQuestionKey, newPreset]);

  const createQuestionWithSeedOptions = React.useCallback(
    async (input: {
      uiVariant: UiVariant;
      questionKey: string;
      questionText: string;
      isRequired: boolean;
      section?: string;
      seedOptions: SeedOption[];
      configOverrides?: Record<string, unknown>;
    }) => {
      const template = getUiTemplate(input.uiVariant);
      if (!template) throw new Error("Unknown template");

      const section = input.section?.trim() ?? "";
      const nextConfig = {
        ...(template.defaultConfig as unknown as Record<string, unknown>),
        ...(input.configOverrides ?? {}),
        ...(section ? { section } : {}),
      };

      const token = await getAuthToken();
      const response = await fetchAdminWithAuth(`/api/admin/normalized-surveys/${surveySlug}/questions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_key: input.questionKey.trim(),
          question_text: input.questionText.trim(),
          question_type: template.questionType,
          is_required: input.isRequired,
          config: nextConfig,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to create question");
      }

      const data = (await response.json()) as { question: SurveyQuestion };
      const created = data.question;

      for (const opt of input.seedOptions) {
        const optRes = await fetchAdminWithAuth(
          `/api/admin/normalized-surveys/${surveySlug}/questions/${created.id}/options`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              option_key: opt.option_key,
              option_text: opt.option_text,
              metadata: opt.metadata ?? {},
            }),
          },
        );
        if (!optRes.ok) {
          const optData = await optRes.json().catch(() => ({}));
          throw new Error((optData as { error?: string }).error ?? "Failed to seed options");
        }
      }

      await refresh();
      return created;
    },
    [refresh, surveySlug],
  );

  const fetchCastSeedOptions = React.useCallback(
    async (include?: SeasonSurveyCastRole[]): Promise<SeedOption[]> => {
      const showId = surveyInfo?.trr_link?.trr_show_id ?? null;
      const seasonNumber = surveyInfo?.trr_link?.season_number ?? null;
      if (!showId || !seasonNumber) {
        throw new Error("This survey must be linked to a TRR show + season to auto-fill cast.");
      }

      const token = await getAuthToken();
      const res = await fetchAdminWithAuth(
        `/api/admin/trr-api/shows/${encodeURIComponent(showId)}/seasons/${encodeURIComponent(
          String(seasonNumber),
        )}/survey-cast?selectedOnly=true`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = (await res.json().catch(() => ({}))) as {
        cast?: SeasonSurveyCastItem[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to fetch season cast");
      }

      const eligible = (json.cast ?? [])
        .filter((m) => Boolean(m.survey_role))
        .filter((m) => {
          if (!m.survey_role) return false;
          if (!include || include.length === 0) return true;
          return include.includes(m.survey_role);
        });

      if (eligible.length === 0) {
        throw new Error(
          `No Main/Friend-of set for this season. Set roles at /admin/trr-shows/${showId}/seasons/${seasonNumber}/cast`,
        );
      }

      return eligible.map((m) => ({
        option_key: m.person_id,
        option_text: m.person_name ?? "Unknown",
        metadata: {
          ...(m.photo_url ? { imagePath: m.photo_url } : {}),
          trrPersonId: m.person_id,
          castRole: m.survey_role,
        },
      }));
    },
    [surveyInfo],
  );

  const fetchSeasonsSeedOptions = React.useCallback(async (): Promise<SeedOption[]> => {
    const showId = surveyInfo?.trr_link?.trr_show_id ?? null;
    if (!showId) {
      throw new Error("This survey must be linked to a TRR show to auto-fill seasons.");
    }

    const token = await getAuthToken();
    const res = await fetchAdminWithAuth(
      `/api/admin/trr-api/shows/${encodeURIComponent(showId)}/seasons?limit=100`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const json = (await res.json().catch(() => ({}))) as { seasons?: TrrSeason[]; error?: string };
    if (!res.ok) {
      throw new Error(json.error ?? "Failed to fetch seasons");
    }

    const seasons = (json.seasons ?? []).slice().sort((a, b) => a.season_number - b.season_number);
    if (seasons.length === 0) {
      throw new Error("No seasons found for this show.");
    }

    return seasons.map((s) => {
      const imagePath = (s.url_original_poster ?? s.poster_path ?? "").trim();
      return {
        option_key: s.id,
        option_text: `Season ${s.season_number}`,
        metadata: {
          ...(imagePath ? { imagePath } : {}),
          seasonNumber: s.season_number,
        },
      };
    });
  }, [surveyInfo]);

  const upsertSeedOptionsByOptionKey = React.useCallback(
    async (questionId: string, existingOptions: QuestionOption[], seedOptions: SeedOption[]) => {
      const token = await getAuthToken();

      for (const opt of seedOptions) {
        const existing = existingOptions.find((o) => o.option_key === opt.option_key);
        if (existing) {
          const nextMetadata = mergeOptionMetadata(existing.metadata, opt.metadata);
          const res = await fetchAdminWithAuth(
            `/api/admin/normalized-surveys/${surveySlug}/questions/${questionId}/options`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                optionId: existing.id,
                option_key: existing.option_key,
                option_text: opt.option_text,
                metadata: nextMetadata,
              }),
            },
          );
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error((data as { error?: string }).error ?? "Failed to update option");
          }
          continue;
        }

        const res = await fetchAdminWithAuth(
          `/api/admin/normalized-surveys/${surveySlug}/questions/${questionId}/options`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              option_key: opt.option_key,
              option_text: opt.option_text,
              metadata: opt.metadata ?? {},
            }),
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to add option");
        }
      }
    },
    [surveySlug],
  );

  const resyncAutofillOptions = React.useCallback(
    async (q: QuestionWithOptions) => {
      const autofill = getQuestionAutofillConfig(q);
      if (!autofill) return;

      try {
        setResyncingQuestionId(q.id);
        setError(null);
        const seedOptions =
          autofill.source === "cast"
            ? await fetchCastSeedOptions(autofill.include)
            : await fetchSeasonsSeedOptions();

        // Add/update only (no deletes) to avoid breaking existing answer references.
        await upsertSeedOptionsByOptionKey(q.id, q.options ?? [], seedOptions);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resync options");
      } finally {
        setResyncingQuestionId(null);
      }
    },
    [fetchCastSeedOptions, fetchSeasonsSeedOptions, refresh, upsertSeedOptionsByOptionKey],
  );

  const addRankCastMembers = React.useCallback(async () => {
    try {
      setSmartAdding("cast");
      setError(null);
      const seedOptions = await fetchCastSeedOptions(["main", "friend_of"]);

      await createQuestionWithSeedOptions({
        uiVariant: "person-rankings",
        questionKey: makeUniqueQuestionKey("cast_ranking"),
        questionText: "Rank the cast members from your favorite to least favorite",
        isRequired: true,
        section: "Rankings",
        seedOptions,
        configOverrides: {
          lineLabelTop: "FAVORITE",
          lineLabelBottom: "LEAST FAVORITE",
          autofill: { source: "cast", include: ["main", "friend_of"] },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add template question");
    } finally {
      setSmartAdding(null);
    }
  }, [createQuestionWithSeedOptions, fetchCastSeedOptions, makeUniqueQuestionKey]);

  const addRankTheSeasons = React.useCallback(async () => {
    try {
      setSmartAdding("seasons");
      setError(null);
      const seedOptions = await fetchSeasonsSeedOptions();

      await createQuestionWithSeedOptions({
        uiVariant: "poster-rankings",
        questionKey: makeUniqueQuestionKey("season_ranking"),
        questionText: "Rank the seasons from best to worst",
        isRequired: true,
        section: "Rankings",
        seedOptions,
        configOverrides: {
          autofill: { source: "seasons" },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add template question");
    } finally {
      setSmartAdding(null);
    }
  }, [createQuestionWithSeedOptions, fetchSeasonsSeedOptions, makeUniqueQuestionKey]);

  const toggleOptions = React.useCallback((questionId: string) => {
    setExpandedOptions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }, []);

  const toggleRows = React.useCallback((questionId: string) => {
    setExpandedRows((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }, []);

  const handleCreateQuestion = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newKey.trim() || !newText.trim()) return;

      try {
        setCreating(true);
        setError(null);

        const template = getUiTemplate(newTemplate);
        if (!template) throw new Error("Unknown template");

        const section = newSection.trim();

        let seedOptions: SeedOption[] = template.seedOptions ? [...template.seedOptions] : [];
        let configOverrides: Record<string, unknown> | undefined;

        if (newPreset === "rank_cast_members") {
          seedOptions = await fetchCastSeedOptions(["main", "friend_of"]);
          configOverrides = {
            lineLabelTop: "FAVORITE",
            lineLabelBottom: "LEAST FAVORITE",
            autofill: { source: "cast", include: ["main", "friend_of"] },
          };
        } else if (newPreset === "rank_seasons") {
          seedOptions = await fetchSeasonsSeedOptions();
          configOverrides = {
            autofill: { source: "seasons" },
          };
        }

        await createQuestionWithSeedOptions({
          uiVariant: newTemplate,
          questionKey: newKey,
          questionText: newText,
          isRequired: newRequired,
          section,
          seedOptions,
          configOverrides,
        });

        setNewKey("");
        setNewText("");
        setNewSection("");
        setNewRequired(false);
        setNewPreset("custom");

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create question");
      } finally {
        setCreating(false);
      }
    },
    [
      createQuestionWithSeedOptions,
      fetchCastSeedOptions,
      fetchSeasonsSeedOptions,
      newKey,
      newPreset,
      newRequired,
      newSection,
      newTemplate,
      newText,
    ],
  );

  const startEditQuestion = React.useCallback((q: QuestionWithOptions) => {
    setEditingQuestionId(q.id);
    setEditQuestionKey(q.question_key);
    setEditQuestionText(q.question_text);
    setEditQuestionSection(getQuestionSection(q));
    setEditQuestionRequired(Boolean(q.is_required));
  }, []);

  const cancelEditQuestion = React.useCallback(() => {
    setEditingQuestionId(null);
    setEditQuestionKey("");
    setEditQuestionText("");
    setEditQuestionSection("");
    setEditQuestionRequired(false);
  }, []);

  const saveEditQuestion = React.useCallback(
    async (q: QuestionWithOptions) => {
      try {
        setBusy(true);
        setError(null);

        const section = editQuestionSection.trim();
        const currentConfig = (q.config ?? {}) as Record<string, unknown>;
        // Preserve all existing config keys and just upsert section.
        const nextConfig: Record<string, unknown> = { ...currentConfig };
        if (section) nextConfig.section = section;
        else delete nextConfig.section;

        const token = await getAuthToken();
        const response = await fetchAdminWithAuth(
          `/api/admin/normalized-surveys/${surveySlug}/questions/${q.id}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              question_key: editQuestionKey.trim(),
              question_text: editQuestionText.trim(),
              is_required: editQuestionRequired,
              config: nextConfig,
            }),
          },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to update question");
        }

        cancelEditQuestion();
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update question");
      } finally {
        setBusy(false);
      }
    },
    [
      cancelEditQuestion,
      editQuestionKey,
      editQuestionRequired,
      editQuestionSection,
      editQuestionText,
      refresh,
      surveySlug,
    ],
  );

  const deleteQuestion = React.useCallback(
    async (q: QuestionWithOptions) => {
      if (!confirm("Delete this question? This cannot be undone.")) return;
      try {
        setBusy(true);
        setError(null);
        const token = await getAuthToken();
        const response = await fetchAdminWithAuth(`/api/admin/normalized-surveys/${surveySlug}/questions/${q.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to delete question");
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete question");
      } finally {
        setBusy(false);
      }
    },
    [refresh, surveySlug],
  );

  const moveQuestion = React.useCallback(
    async (questionId: string, direction: "up" | "down") => {
      const ordered = [...sortedQuestions];
      const idx = ordered.findIndex((q) => q.id === questionId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= ordered.length) return;

      const a = ordered[idx];
      const b = ordered[swapIdx];
      try {
        setBusy(true);
        setError(null);
        const token = await getAuthToken();

        const resA = await fetchAdminWithAuth(
          `/api/admin/normalized-surveys/${surveySlug}/questions/${a.id}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ display_order: b.display_order }),
          },
        );
        if (!resA.ok) {
          const data = await resA.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to reorder question");
        }

        const resB = await fetchAdminWithAuth(
          `/api/admin/normalized-surveys/${surveySlug}/questions/${b.id}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ display_order: a.display_order }),
          },
        );
        if (!resB.ok) {
          const data = await resB.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to reorder question");
        }

        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reorder question");
      } finally {
        setBusy(false);
      }
    },
    [refresh, sortedQuestions, surveySlug],
  );

  const startEditOption = React.useCallback((questionId: string, opt: QuestionOption) => {
    setEditingOption({ questionId, optionId: opt.id });
    setEditOptionKey(opt.option_key);
    setEditOptionText(opt.option_text);
    setEditOptionImage(getOptionImage(opt.metadata));
  }, []);

  const cancelEditOption = React.useCallback(() => {
    setEditingOption(null);
    setEditOptionKey("");
    setEditOptionText("");
    setEditOptionImage("");
  }, []);

  const saveEditOption = React.useCallback(
    async (questionId: string, optionId: string) => {
      try {
        setBusy(true);
        setError(null);

        const q = sortedQuestions.find((qq) => qq.id === questionId);
        const opt = q?.options?.find((o) => o.id === optionId);
        const baseMetadata = (opt?.metadata ?? {}) as Record<string, unknown>;
        const nextMetadata: Record<string, unknown> = { ...baseMetadata };
        const nextImage = editOptionImage.trim();
        if (nextImage) {
          nextMetadata.imagePath = nextImage;
          delete nextMetadata.imageUrl;
        } else {
          delete nextMetadata.imagePath;
          delete nextMetadata.imageUrl;
        }

        const token = await getAuthToken();
        const response = await fetchAdminWithAuth(
          `/api/admin/normalized-surveys/${surveySlug}/questions/${questionId}/options`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              optionId,
              option_key: editOptionKey.trim(),
              option_text: editOptionText.trim(),
              metadata: nextMetadata,
            }),
          },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to update option");
        }

        cancelEditOption();
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update option");
      } finally {
        setBusy(false);
      }
    },
    [cancelEditOption, editOptionImage, editOptionKey, editOptionText, refresh, sortedQuestions, surveySlug],
  );

  const addOption = React.useCallback(
    async (questionId: string) => {
      if (!newOptionKey.trim() || !newOptionText.trim()) return;
      try {
        setBusy(true);
        setError(null);
        const token = await getAuthToken();
        const response = await fetchAdminWithAuth(
          `/api/admin/normalized-surveys/${surveySlug}/questions/${questionId}/options`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              option_key: newOptionKey.trim(),
              option_text: newOptionText.trim(),
              metadata: newOptionImage.trim() ? { imagePath: newOptionImage.trim() } : {},
            }),
          },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to add option");
        }

        setAddingOptionTo(null);
        setNewOptionKey("");
        setNewOptionText("");
        setNewOptionImage("");
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add option");
      } finally {
        setBusy(false);
      }
    },
    [newOptionImage, newOptionKey, newOptionText, refresh, surveySlug],
  );

  const deleteOption = React.useCallback(
    async (questionId: string, optionId: string) => {
      if (!confirm("Remove this option?")) return;
      try {
        setBusy(true);
        setError(null);
        const token = await getAuthToken();
        const response = await fetchAdminWithAuth(
          `/api/admin/normalized-surveys/${surveySlug}/questions/${questionId}/options?optionId=${encodeURIComponent(optionId)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to delete option");
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete option");
      } finally {
        setBusy(false);
      }
    },
    [refresh, surveySlug],
  );

  const moveOption = React.useCallback(
    async (questionId: string, optionId: string, direction: "up" | "down") => {
      const q = sortedQuestions.find((qq) => qq.id === questionId);
      if (!q) return;
      const opts = [...q.options].sort((a, b) => a.display_order - b.display_order);
      const idx = opts.findIndex((o) => o.id === optionId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= opts.length) return;
      const a = opts[idx];
      const b = opts[swapIdx];

      try {
        setBusy(true);
        setError(null);
        const token = await getAuthToken();

        const resA = await fetchAdminWithAuth(
          `/api/admin/normalized-surveys/${surveySlug}/questions/${questionId}/options`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ optionId: a.id, display_order: b.display_order }),
          },
        );
        if (!resA.ok) {
          const data = await resA.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to reorder option");
        }

        const resB = await fetchAdminWithAuth(
          `/api/admin/normalized-surveys/${surveySlug}/questions/${questionId}/options`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ optionId: b.id, display_order: a.display_order }),
          },
        );
        if (!resB.ok) {
          const data = await resB.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to reorder option");
        }

        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reorder option");
      } finally {
        setBusy(false);
      }
    },
    [refresh, sortedQuestions, surveySlug],
  );

  const saveRowsConfig = React.useCallback(
    async (questionId: string, nextConfig: Record<string, unknown>) => {
      try {
        setBusy(true);
        setError(null);
        const token = await getAuthToken();
        const response = await fetchAdminWithAuth(
          `/api/admin/normalized-surveys/${surveySlug}/questions/${questionId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ config: nextConfig }),
          },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to update config");
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update config");
      } finally {
        setBusy(false);
      }
    },
    [refresh, surveySlug],
  );

  const saveNumericIconOverride = React.useCallback(
    async (questionId: string, currentConfig: unknown, draftUrl: string) => {
      const baseConfig = isPlainObject(currentConfig) ? currentConfig : {};
      const normalized = draftUrl.trim();
      const nextConfig: Record<string, unknown> = { ...baseConfig };
      if (normalized) {
        nextConfig.iconOverrideUrl = normalized;
      } else {
        delete nextConfig.iconOverrideUrl;
      }
      await saveRowsConfig(questionId, nextConfig);
      setIconOverrideDraftByQuestionId((prev) => ({
        ...prev,
        [questionId]: normalized,
      }));
    },
    [saveRowsConfig],
  );

  const addRow = React.useCallback(
    async (q: QuestionWithOptions) => {
      if (!newRowId.trim() || !newRowLabel.trim()) return;
      const rows = parseRows(q.config);
      if (rows.some((r) => r.id === newRowId.trim())) {
        setError("Row id must be unique for this question");
        return;
      }
      const nextRows: RowItem[] = [
        ...rows,
        {
          id: newRowId.trim(),
          label: newRowLabel.trim(),
          img: newRowImg.trim() ? newRowImg.trim() : undefined,
        },
      ];
      const nextCfg = withUpdatedRows(q.config, nextRows);

      setAddingRowTo(null);
      setNewRowId("");
      setNewRowLabel("");
      setNewRowImg("");
      await saveRowsConfig(q.id, nextCfg);
    },
    [newRowId, newRowImg, newRowLabel, saveRowsConfig],
  );

  const deleteRow = React.useCallback(
    async (q: QuestionWithOptions, rowId: string) => {
      if (!confirm("Remove this row?")) return;
      const rows = parseRows(q.config);
      const nextRows = rows.filter((r) => r.id !== rowId);
      const nextCfg = withUpdatedRows(q.config, nextRows);
      await saveRowsConfig(q.id, nextCfg);
    },
    [saveRowsConfig],
  );

  const moveRow = React.useCallback(
    async (q: QuestionWithOptions, rowId: string, direction: "up" | "down") => {
      const rows = parseRows(q.config);
      const idx = rows.findIndex((r) => r.id === rowId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= rows.length) return;
      const nextRows = [...rows];
      const tmp = nextRows[idx];
      nextRows[idx] = nextRows[swapIdx];
      nextRows[swapIdx] = tmp;
      const nextCfg = withUpdatedRows(q.config, nextRows);
      await saveRowsConfig(q.id, nextCfg);
    },
    [saveRowsConfig],
  );

  const startEditRow = React.useCallback((questionId: string, row: RowItem) => {
    setEditingRow({ questionId, rowId: row.id });
    setEditRowLabel(row.label);
    setEditRowImg(row.img ?? "");
  }, []);

  const cancelEditRow = React.useCallback(() => {
    setEditingRow(null);
    setEditRowLabel("");
    setEditRowImg("");
  }, []);

  const saveEditRow = React.useCallback(
    async (q: QuestionWithOptions, rowId: string) => {
      const rows = parseRows(q.config);
      const idx = rows.findIndex((r) => r.id === rowId);
      if (idx < 0) return;
      const nextRows = [...rows];
      nextRows[idx] = {
        ...nextRows[idx],
        label: editRowLabel.trim() || nextRows[idx].label,
        img: editRowImg.trim() ? editRowImg.trim() : undefined,
      };
      const nextCfg = withUpdatedRows(q.config, nextRows);
      cancelEditRow();
      await saveRowsConfig(q.id, nextCfg);
    },
    [cancelEditRow, editRowImg, editRowLabel, saveRowsConfig],
  );

  const template = getUiTemplate(newTemplate);
  const previewQuestion = React.useMemo(() => {
    if (!previewQuestionId) return null;
    return sortedQuestions.find((q) => q.id === previewQuestionId) ?? null;
  }, [previewQuestionId, sortedQuestions]);

  const previewValue = previewQuestion
    ? (previewValueByQuestionId[previewQuestion.id] ?? null)
    : null;

  const setPreviewValue = React.useCallback((questionId: string, value: unknown) => {
    setPreviewValueByQuestionId((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const resetPreviewValue = React.useCallback((questionId: string) => {
    setPreviewValueByQuestionId((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Preview Question
                </p>
                <h3 className="mt-1 truncate text-lg font-semibold text-zinc-900">
                  {previewQuestion.question_text}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  key: <span className="font-mono">{previewQuestion.question_key}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => resetPreviewValue(previewQuestion.id)}
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewQuestionId(null)}
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-6">
              <QuestionRenderer
                question={previewQuestion}
                value={previewValue}
                onChange={(value) => setPreviewValue(previewQuestion.id, value)}
                showIconUrl={surveyShowIconUrl}
              />
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-800 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Smart templates */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">Smart Templates</h3>
        <p className="mb-4 text-sm text-zinc-500">
          Add common Bravo-style questions that auto-fill options from cast or show data.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addRankCastMembers}
            disabled={smartAdding !== null || busy || loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {smartAdding === "cast" ? "Adding…" : "Rank Cast Members"}
          </button>
          <button
            type="button"
            onClick={addRankTheSeasons}
            disabled={smartAdding !== null || busy || loading}
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {smartAdding === "seasons" ? "Adding…" : "Rank the Seasons"}
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Cast template uses only <span className="font-semibold">Main</span> and{" "}
          <span className="font-semibold">Friend-of</span> roles for this season (set them in{" "}
          <span className="font-semibold">Admin &gt; TRR Shows &gt; Season &gt; Cast</span>). Seasons template
          requires the survey to be linked to a TRR show.
        </p>
      </div>

      {/* Add question */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">Add Question</h3>
        <form onSubmit={handleCreateQuestion} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Preset</label>
                <select
                  value={newPreset}
                  onChange={(e) => setNewPreset(e.target.value as QuestionPreset)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="rank_cast_members">Rank Cast Members</option>
                  <option value="rank_seasons">Rank Seasons</option>
                </select>
                <p className="mt-1 text-xs text-zinc-500">
                  Presets can auto-fill options from TRR data, then later{" "}
                  <span className="font-medium">Resync Options</span> (add/update only).
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Format (template)</label>
                <select
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value as UiVariant)}
                  disabled={newPreset !== "custom"}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                >
                  {UI_TEMPLATES.map((t) => (
                    <option key={t.uiVariant} value={t.uiVariant}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {template && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {template.description}{" "}
                    <span className="text-zinc-400">
                      (DB type: {template.questionType})
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Key (unique identifier)
              </label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g., favorite_housewife"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Question Text</label>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Who is your favorite housewife this season?"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Section / Category (optional)
            </label>
            <input
              type="text"
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              placeholder="e.g., Cast Rankings"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="newRequired"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <label htmlFor="newRequired" className="text-sm text-zinc-700">
              Required
            </label>
          </div>

          <button
            type="submit"
            disabled={creating || !newKey.trim() || !newText.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {creating ? "Adding..." : "Add Question"}
          </button>
        </form>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="text-center text-zinc-500">Loading questions…</div>
      ) : sortedQuestions.length === 0 ? (
        <div className="text-center text-zinc-500">No questions yet. Add one above.</div>
      ) : (
        <div className="space-y-8">
          {questionsBySection.map((group) => (
            <div key={group.key} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  {group.label}
                </h4>
                <span className="text-xs text-zinc-400">
                  {group.questions.length} question{group.questions.length === 1 ? "" : "s"}
                </span>
              </div>

              {group.questions.map(({ question: q, index }, indexInSection) => {
            const uiVariant = getQuestionUiVariant(q);
            const uiLabel = uiVariantLabel(uiVariant);
            const supportsOptions = q.question_type !== "numeric" && q.question_type !== "free_text";
            const optionsCount = q.options?.length ?? 0;
            const autofillConfig = supportsOptions ? getQuestionAutofillConfig(q) : null;
            const isResyncing = resyncingQuestionId === q.id;
            const isFirstInSection = indexInSection === 0;
            const isLastInSection = indexInSection === group.questions.length - 1;

            const rows = parseRows(q.config);
            const usesRows = Boolean(getUiTemplate(uiVariant)?.usesRows);
            const rowsCount = rows.length;

            const isEditing = editingQuestionId === q.id;
            const isOptionsOpen = Boolean(expandedOptions[q.id]);
            const isRowsOpen = Boolean(expandedRows[q.id]);

            return (
              <div key={q.id} className="rounded-lg border border-zinc-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-zinc-500">#{index + 1}</span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {q.question_type}
                      </span>
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                        {uiLabel}
                      </span>
                      {q.is_required && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          Required
                        </span>
                      )}
                    </div>

                    {!isEditing ? (
                      <>
                        <p className="mt-1 text-sm text-zinc-500">key: {q.question_key}</p>
                        <p className="mt-2 text-zinc-900">{q.question_text}</p>
                      </>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-600">
                              Key
                            </label>
                            <input
                              type="text"
                              value={editQuestionKey}
                              onChange={(e) => setEditQuestionKey(e.target.value)}
                              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-600">
                              Section / Category
                            </label>
                            <input
                              type="text"
                              value={editQuestionSection}
                              onChange={(e) => setEditQuestionSection(e.target.value)}
                              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                              placeholder="e.g., Cast Rankings"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-zinc-700">
                          <input
                            type="checkbox"
                            checked={editQuestionRequired}
                            onChange={(e) => setEditQuestionRequired(e.target.checked)}
                            className="h-4 w-4 rounded border-zinc-300"
                          />
                          Required
                        </label>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-zinc-600">
                            Question Text
                          </label>
                          <input
                            type="text"
                            value={editQuestionText}
                            onChange={(e) => setEditQuestionText(e.target.value)}
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => saveEditQuestion(q)}
                            disabled={busy || !editQuestionKey.trim() || !editQuestionText.trim()}
                            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditQuestion}
                            disabled={busy}
                            className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => moveQuestion(q.id, "up")}
                        disabled={busy || isFirstInSection}
                        className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 disabled:opacity-50"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(q.id, "down")}
                        disabled={busy || isLastInSection}
                        className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 disabled:opacity-50"
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>

                    {!isEditing ? (
                      <>
                        {autofillConfig && (
                          <button
                            type="button"
                            onClick={() => resyncAutofillOptions(q)}
                            disabled={busy || isResyncing}
                            className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                          >
                            {isResyncing ? "Resyncing..." : "Resync Options"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewQuestionId(q.id)}
                          disabled={busy}
                          className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditQuestion(q)}
                          disabled={busy}
                          className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                        >
                          Edit
                        </button>
                      </>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => deleteQuestion(q)}
                      disabled={busy}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {uiVariant === "numeric-ranking" && (
                  <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Rating Icon Override
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Leave blank to use show default icon. Set URL to override for this question only.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={iconOverrideDraftByQuestionId[q.id] ?? getNumericIconOverride(q.config)}
                        onChange={(event) =>
                          setIconOverrideDraftByQuestionId((prev) => ({
                            ...prev,
                            [q.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                        placeholder="https://.../custom-icon.svg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          saveNumericIconOverride(
                            q.id,
                            q.config,
                            iconOverrideDraftByQuestionId[q.id] ?? "",
                          )
                        }
                        disabled={busy}
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                      >
                        Save Icon
                      </button>
                    </div>
                  </div>
                )}

                {/* Rows editor (matrix-like / two-axis grid) */}
                {usesRows && (
                  <div className="mt-5 border-t border-zinc-100 pt-4">
                    <button
                      type="button"
                      onClick={() => toggleRows(q.id)}
                      className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                    >
                      {isRowsOpen ? "Hide" : "Show"} Rows ({rowsCount})
                    </button>

                    {isRowsOpen && (
                      <div className="mt-3 space-y-3">
                        {rowsCount === 0 ? (
                          <p className="text-sm text-zinc-500">
                            No rows yet. Add at least one row for this question type.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {rows.map((row, rowIndex) => {
                              const isRowEditing =
                                editingRow?.questionId === q.id && editingRow?.rowId === row.id;
                              return (
                                <li
                                  key={row.id}
                                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <div className="text-xs text-zinc-500">
                                        id: <span className="font-mono">{row.id}</span>
                                      </div>

                                      {!isRowEditing ? (
                                        <div className="mt-1 text-sm text-zinc-900">
                                          {row.label}
                                          {row.img ? (
                                            <span className="ml-2 text-xs text-zinc-500">
                                              (img)
                                            </span>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <div className="mt-2 space-y-2">
                                          <input
                                            type="text"
                                            value={editRowLabel}
                                            onChange={(e) => setEditRowLabel(e.target.value)}
                                            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                                            placeholder="Row label"
                                          />
                                          <input
                                            type="text"
                                            value={editRowImg}
                                            onChange={(e) => setEditRowImg(e.target.value)}
                                            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                                            placeholder="Image URL (optional)"
                                          />
                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => saveEditRow(q, row.id)}
                                              disabled={busy}
                                              className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50"
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              onClick={cancelEditRow}
                                              disabled={busy}
                                              className="text-sm text-zinc-600"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => moveRow(q, row.id, "up")}
                                          disabled={busy || rowIndex === 0}
                                          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 disabled:opacity-50"
                                          title="Move up"
                                        >
                                          ↑
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => moveRow(q, row.id, "down")}
                                          disabled={busy || rowIndex === rows.length - 1}
                                          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 disabled:opacity-50"
                                          title="Move down"
                                        >
                                          ↓
                                        </button>
                                      </div>

                                      {!isRowEditing ? (
                                        <button
                                          type="button"
                                          onClick={() => startEditRow(q.id, row)}
                                          disabled={busy}
                                          className="text-xs text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                                        >
                                          Edit
                                        </button>
                                      ) : null}

                                      <button
                                        type="button"
                                        onClick={() => deleteRow(q, row.id)}
                                        disabled={busy}
                                        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {addingRowTo === q.id ? (
                          <div className="rounded-md border border-zinc-200 bg-white p-3">
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                              <input
                                type="text"
                                placeholder="Row id (unique)"
                                value={newRowId}
                                onChange={(e) => setNewRowId(e.target.value)}
                                className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                              />
                              <input
                                type="text"
                                placeholder="Row label"
                                value={newRowLabel}
                                onChange={(e) => setNewRowLabel(e.target.value)}
                                className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                              />
                              <input
                                type="text"
                                placeholder="Image URL (optional)"
                                value={newRowImg}
                                onChange={(e) => setNewRowImg(e.target.value)}
                                className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                              />
                            </div>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => addRow(q)}
                                disabled={busy || !newRowId.trim() || !newRowLabel.trim()}
                                className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50"
                              >
                                Add Row
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingRowTo(null);
                                  setNewRowId("");
                                  setNewRowLabel("");
                                  setNewRowImg("");
                                }}
                                disabled={busy}
                                className="text-sm text-zinc-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAddingRowTo(q.id)}
                            disabled={busy}
                            className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                          >
                            + Add Row
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Options editor */}
                {supportsOptions && (
                  <div className="mt-5 border-t border-zinc-100 pt-4">
                    <button
                      type="button"
                      onClick={() => toggleOptions(q.id)}
                      className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                    >
                      {isOptionsOpen ? "Hide" : "Show"} Options ({optionsCount})
                    </button>

                    {isOptionsOpen && (
                      <div className="mt-3 space-y-3">
                        {optionsCount === 0 ? (
                          <p className="text-sm text-zinc-500">No options yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {[...q.options]
                              .sort((a, b) => a.display_order - b.display_order)
                              .map((opt, optIndex, arr) => {
                                const isOptEditing =
                                  editingOption?.questionId === q.id && editingOption?.optionId === opt.id;
                                const optImage = getOptionImage(opt.metadata);
                                return (
                                  <li
                                    key={opt.id}
                                    className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        {!isOptEditing ? (
                                          <div className="text-sm">
                                            <span className="text-zinc-500 font-mono">{opt.option_key}:</span>{" "}
                                            <span className="text-zinc-900">{opt.option_text}</span>
                                            {optImage ? (
                                              <span className="ml-2 text-xs text-zinc-500">(img)</span>
                                            ) : null}
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            <input
                                              type="text"
                                              value={editOptionKey}
                                              onChange={(e) => setEditOptionKey(e.target.value)}
                                              className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm font-mono"
                                              placeholder="Option key"
                                            />
                                            <input
                                              type="text"
                                              value={editOptionText}
                                              onChange={(e) => setEditOptionText(e.target.value)}
                                              className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                                              placeholder="Option text"
                                            />
                                            <input
                                              type="text"
                                              value={editOptionImage}
                                              onChange={(e) => setEditOptionImage(e.target.value)}
                                              className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                                              placeholder="Image URL (optional)"
                                            />
                                            <div className="flex gap-2">
                                              <button
                                                type="button"
                                                onClick={() => saveEditOption(q.id, opt.id)}
                                                disabled={busy || !editOptionKey.trim() || !editOptionText.trim()}
                                                className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50"
                                              >
                                                Save
                                              </button>
                                              <button
                                                type="button"
                                                onClick={cancelEditOption}
                                                disabled={busy}
                                                className="text-sm text-zinc-600"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex flex-col items-end gap-2">
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => moveOption(q.id, opt.id, "up")}
                                            disabled={busy || optIndex === 0}
                                            className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 disabled:opacity-50"
                                            title="Move up"
                                          >
                                            ↑
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => moveOption(q.id, opt.id, "down")}
                                            disabled={busy || optIndex === arr.length - 1}
                                            className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 disabled:opacity-50"
                                            title="Move down"
                                          >
                                            ↓
                                          </button>
                                        </div>

                                        {!isOptEditing ? (
                                          <button
                                            type="button"
                                            onClick={() => startEditOption(q.id, opt)}
                                            disabled={busy}
                                            className="text-xs text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                                          >
                                            Edit
                                          </button>
                                        ) : null}

                                        <button
                                          type="button"
                                          onClick={() => deleteOption(q.id, opt.id)}
                                          disabled={busy}
                                          className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                          </ul>
                        )}

                        {addingOptionTo === q.id ? (
                          <div className="rounded-md border border-zinc-200 bg-white p-3">
                            <div className="flex flex-col gap-2 md:flex-row">
                              <input
                                type="text"
                                placeholder="Key"
                                value={newOptionKey}
                                onChange={(e) => setNewOptionKey(e.target.value)}
                                className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm font-mono"
                              />
                              <input
                                type="text"
                                placeholder="Text"
                                value={newOptionText}
                                onChange={(e) => setNewOptionText(e.target.value)}
                                className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                              />
                              <input
                                type="text"
                                placeholder="Image URL (optional)"
                                value={newOptionImage}
                                onChange={(e) => setNewOptionImage(e.target.value)}
                                className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                              />
                            </div>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => addOption(q.id)}
                                disabled={busy || !newOptionKey.trim() || !newOptionText.trim()}
                                className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50"
                              >
                                Add Option
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingOptionTo(null);
                                  setNewOptionKey("");
                                  setNewOptionText("");
                                  setNewOptionImage("");
                                }}
                                disabled={busy}
                                className="text-sm text-zinc-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAddingOptionTo(q.id)}
                            disabled={busy}
                            className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                          >
                            + Add Option
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
