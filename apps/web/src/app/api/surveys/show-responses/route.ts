import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getSurveyDefinition } from "@/lib/server/surveys/definitions";
import { upsertSurveyResponse } from "@/lib/server/surveys/repository";

interface ShowSurveyPayload {
  surveyKey?: string;
  appUserId: string;
  showId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  seasonId?: string | null;
  episodeId?: string | null;
  responses: {
    ranking?: unknown;
    completion_pct?: number;
    completionPct?: number;
    completed?: boolean;
    client_schema_version?: number;
    clientSchemaVersion?: number;
    client_version?: string;
    clientVersion?: string;
    extra?: Record<string, unknown>;
  };
}

const parseOrdinal = (value?: string | number | null): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const digits = String(value).replace(/[^0-9]/g, "");
  if (!digits) return null;
  const asNumber = Number(digits);
  return Number.isFinite(asNumber) ? asNumber : null;
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const payload = (await request.json()) as ShowSurveyPayload;
    if (!payload.surveyKey) {
      return NextResponse.json({ error: "surveyKey is required" }, { status: 400 });
    }
    const definition = getSurveyDefinition(payload.surveyKey);
    if (!definition) {
      return NextResponse.json({ error: "unknown survey" }, { status: 404 });
    }
    if (!payload.appUserId) {
      return NextResponse.json({ error: "appUserId is required" }, { status: 400 });
    }
    if (payload.appUserId !== user.uid) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const needsSeasonId = definition.questionColumns.some((column) => column.column === "season_id");
    const needsEpisodeId = definition.questionColumns.some((column) => column.column === "episode_id");
    if (needsSeasonId && !payload.seasonId) {
      return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
    }
    if (needsEpisodeId && !payload.episodeId) {
      return NextResponse.json({ error: "episodeId is required" }, { status: 400 });
    }

    const answers: Record<string, unknown> = {
      ranking: payload.responses.ranking ?? [],
      completion_pct: payload.responses.completion_pct ?? payload.responses.completionPct ?? null,
      completed: payload.responses.completed ?? null,
      client_schema_version:
        payload.responses.client_schema_version ?? payload.responses.clientSchemaVersion ?? null,
      client_version: payload.responses.client_version ?? payload.responses.clientVersion ?? null,
      season_id: payload.seasonId ?? null,
      episode_id: payload.episodeId ?? null,
      extra: payload.responses.extra ?? null,
    };

    await upsertSurveyResponse({
      surveyKey: payload.surveyKey,
      appUserId: user.uid,
      appUserEmail: user.email ?? null,
      respondentId: user.uid,
      showId: payload.showId ?? null,
      seasonNumber: payload.seasonNumber ?? parseOrdinal(payload.seasonId),
      episodeNumber: payload.episodeNumber ?? parseOrdinal(payload.episodeId),
      answers,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api] Failed to persist show survey response", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
