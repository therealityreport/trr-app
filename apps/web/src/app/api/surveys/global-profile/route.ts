import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { upsertSurveyResponse } from "@/lib/server/surveys/repository";
import { normalizeStringArrayValue } from "@/lib/server/surveys/normalizers";

interface GlobalProfilePayload {
  responses?: Record<string, unknown>;
  profileEmail?: string | null;
  profileReuseOk?: string | boolean | null;
  ageBracket?: string | null;
  gender?: string | null;
  country?: string | null;
  stateRegion?: string | null;
  postalCode?: string | null;
  householdSize?: number | null;
  childrenInHousehold?: string | null;
  relationshipStatus?: string | null;
  educationLevel?: string | null;
  householdIncomeBand?: string | null;
  username?: string | null;
}

const normalizeArray = (value: unknown): string[] | null => normalizeStringArrayValue(value);

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const payload = (await request.json()) as GlobalProfilePayload;
    const responses = payload.responses ?? {};
    const username = typeof payload.username === "string" ? payload.username : null;

    const baseResponses = responses ?? {};
    const normalizedResponses = {
      ...baseResponses,
      view_platforms_household: normalizeArray(baseResponses.view_platforms_household) ?? null,
      view_platforms_subscriptions: normalizeArray(baseResponses.view_platforms_subscriptions) ?? null,
      view_devices_reality: normalizeArray(baseResponses.view_devices_reality) ?? null,
      view_bravo_other_sources: normalizeArray(baseResponses.view_bravo_other_sources) ?? null,
      psych_other_reality_categories: normalizeArray(baseResponses.psych_other_reality_categories) ?? null,
      psych_online_engagement: normalizeArray(baseResponses.psych_online_engagement) ?? null,
      psych_purchase_behavior: normalizeArray(baseResponses.psych_purchase_behavior) ?? null,
      psych_watch_reasons: normalizeArray(baseResponses.psych_watch_reasons) ?? null,
      pronouns: normalizeArray(baseResponses.pronouns) ?? null,
    };
    const answers: Record<string, unknown> = {
      age_bracket: payload.ageBracket ?? null,
      gender: payload.gender ?? null,
      country: payload.country ?? null,
      state_region: payload.stateRegion ?? null,
      postal_code: payload.postalCode ?? null,
      household_size: payload.householdSize ?? null,
      children_in_household: payload.childrenInHousehold ?? null,
      relationship_status: payload.relationshipStatus ?? null,
      education_level: payload.educationLevel ?? null,
      household_income_band: payload.householdIncomeBand ?? null,
      view_live_tv_household: responses.view_live_tv_household ?? null,
      view_platforms_household: normalizedResponses.view_platforms_household,
      view_platforms_subscriptions: normalizedResponses.view_platforms_subscriptions,
      view_devices_reality: normalizedResponses.view_devices_reality,
      view_bravo_other_sources: normalizedResponses.view_bravo_other_sources,
      view_bravo_platform_primary: baseResponses.primaryPlatform ?? null,
      view_hours_week: baseResponses.watchFrequency ?? null,
      view_binge_style: baseResponses.watchMode ?? null,
      view_reality_cowatch: baseResponses.view_reality_cowatch ?? null,
      view_live_chats_social: baseResponses.view_live_chats_social ?? null,
      profile_email: payload.profileEmail ?? user.email ?? null,
      profile_reuse_ok: payload.profileReuseOk ?? null,
      psych_other_reality_categories: normalizedResponses.psych_other_reality_categories,
      psych_online_engagement: normalizedResponses.psych_online_engagement,
      psych_purchase_behavior: normalizedResponses.psych_purchase_behavior,
      psych_watch_reasons: normalizedResponses.psych_watch_reasons,
      pronouns: normalizedResponses.pronouns,
      extra: normalizedResponses,
    };

    await upsertSurveyResponse({
      surveyKey: "global_profile",
      appUserId: user.uid,
      appUserEmail: payload.profileEmail ?? user.email ?? null,
      appUsername: username,
      respondentId: user.uid,
      answers,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api] Failed to persist global profile response", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
