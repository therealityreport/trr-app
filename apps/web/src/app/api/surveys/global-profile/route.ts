import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { upsertSurveyResponse } from "@/lib/server/surveys/repository";

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
}

const asArray = (value: unknown): unknown[] | null => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return null;
  return [value];
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const payload = (await request.json()) as GlobalProfilePayload;
    const responses = payload.responses ?? {};

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
      view_platforms_subscriptions: asArray(responses.view_platforms_subscriptions) ?? null,
      view_devices_reality: asArray(responses.view_devices_reality) ?? null,
      view_bravo_platform_primary: responses.primaryPlatform ?? null,
      view_hours_week: responses.watchFrequency ?? null,
      view_binge_style: responses.watchMode ?? null,
      view_reality_cowatch: responses.view_reality_cowatch ?? null,
      view_live_chats_social: responses.view_live_chats_social ?? null,
      profile_email: payload.profileEmail ?? user.email ?? null,
      profile_reuse_ok: payload.profileReuseOk ?? null,
      extra: responses,
    };

    await upsertSurveyResponse({
      surveyKey: "global_profile",
      appUserId: user.uid,
      appUserEmail: payload.profileEmail ?? user.email ?? null,
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
