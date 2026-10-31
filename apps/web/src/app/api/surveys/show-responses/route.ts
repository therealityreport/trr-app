import { NextRequest } from "next/server";
import { proxySurveySubmission } from "@/lib/server/surveys/submissions-client";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return proxySurveySubmission(request, "show-responses");
}

export function POST(request: NextRequest) {
  return proxySurveySubmission(request, "show-responses");
}
