import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { upsertSurveyResponse } from "@/lib/server/surveys/repository";
import { normalizeStringArrayValue } from "@/lib/server/surveys/normalizers";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as Record<string, unknown>;

    const username = typeof body.username === "string" ? body.username : null;
    const answers = {
      view_live_tv_household: typeof body.view_live_tv_household === "string" ? body.view_live_tv_household : null,
      view_platforms_subscriptions: normalizeStringArrayValue(body.view_platforms_subscriptions) ?? [],
      primary_platform: typeof body.primaryPlatform === "string" ? body.primaryPlatform : null,
      watch_frequency: typeof body.watchFrequency === "string" ? body.watchFrequency : null,
      watch_mode: typeof body.watchMode === "string" ? body.watchMode : null,
      view_reality_cowatch: typeof body.view_reality_cowatch === "string" ? body.view_reality_cowatch : null,
      view_live_chats_social:
        typeof body.view_live_chats_social === "string" ? body.view_live_chats_social : null,
      view_devices_reality: normalizeStringArrayValue(body.view_devices_reality) ?? [],
      extra: body.extra ?? null,
    };

    await upsertSurveyResponse({
      surveyKey: "survey_x",
      appUserId: user.uid,
      appUserEmail: user.email ?? null,
      appUsername: username,
      respondentId: user.uid,
      showId: typeof body.showId === "string" ? body.showId : null,
      seasonNumber: typeof body.seasonNumber === "number" ? body.seasonNumber : null,
      episodeNumber: typeof body.episodeNumber === "number" ? body.episodeNumber : null,
      answers,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
