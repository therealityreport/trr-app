import "server-only";

import type { FlashbackEvent, FlashbackQuiz } from "@/lib/flashback/types";
import {
  AdminReadProxyError,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

const FLASHBACK_BACKEND_PATH = "/admin/flashback";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

const invalidBackendResponse = (message: string): never => {
  throw new AdminReadProxyError(message, 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });
};

const parseQuiz = (value: unknown): FlashbackQuiz => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "title",
      "publish_date",
      "description",
      "is_published",
      "created_at",
      "updated_at",
    ]) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.publish_date !== "string" ||
    (value.description !== null && typeof value.description !== "string") ||
    typeof value.is_published !== "boolean" ||
    typeof value.created_at !== "string" ||
    typeof value.updated_at !== "string"
  ) {
    return invalidBackendResponse("Invalid Flashback quiz response from backend");
  }
  return value as unknown as FlashbackQuiz;
};

const parseEvent = (value: unknown): FlashbackEvent => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "quiz_id",
      "description",
      "image_url",
      "year",
      "sort_order",
      "point_value",
    ]) ||
    typeof value.id !== "string" ||
    typeof value.quiz_id !== "string" ||
    typeof value.description !== "string" ||
    (value.image_url !== null && typeof value.image_url !== "string") ||
    !Number.isInteger(value.year) ||
    !Number.isInteger(value.sort_order) ||
    !Number.isInteger(value.point_value)
  ) {
    return invalidBackendResponse("Invalid Flashback event response from backend");
  }
  return value as unknown as FlashbackEvent;
};

const requireStatus = (
  result: Awaited<ReturnType<typeof fetchAdminBackendJson>>,
  expectedStatus: number,
  routeName: string,
): Record<string, unknown> => {
  if (result.status !== expectedStatus) {
    throw buildAdminBackendStatusError({
      status: result.status,
      data: result.data,
      fallbackMessage: "Flashback administration request failed",
      routeName,
      requestRole: "primary",
    });
  }
  return result.data;
};

export async function listFlashbackQuizzes(
  adminContext: VerifiedAdminContext,
): Promise<FlashbackQuiz[]> {
  const routeName = "flashback-admin:list-quizzes";
  const result = await fetchAdminBackendJson(`${FLASHBACK_BACKEND_PATH}/quizzes`, {
    apiVersion: "v2",
    adminContext,
    routeName,
    requestRole: "primary",
  });
  const data = requireStatus(result, 200, routeName);
  if (!Array.isArray(data.quizzes)) {
    return invalidBackendResponse("Invalid Flashback quiz list response from backend");
  }
  return data.quizzes.map(parseQuiz);
}

export async function createFlashbackQuiz(
  adminContext: VerifiedAdminContext,
  input: {
    title: string;
    publishDate: string;
    description?: string | null;
  },
): Promise<FlashbackQuiz> {
  const routeName = "flashback-admin:create-quiz";
  const result = await fetchAdminBackendJson(`${FLASHBACK_BACKEND_PATH}/quizzes`, {
    apiVersion: "v2",
    adminContext,
    routeName,
    requestRole: "primary",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      publish_date: input.publishDate,
      description: input.description ?? null,
    }),
  });
  return parseQuiz(requireStatus(result, 201, routeName).quiz);
}

export async function setFlashbackQuizPublished(
  adminContext: VerifiedAdminContext,
  quizId: string,
  isPublished: boolean,
): Promise<FlashbackQuiz | null> {
  const routeName = "flashback-admin:update-quiz";
  const result = await fetchAdminBackendJson(
    `${FLASHBACK_BACKEND_PATH}/quizzes/${encodeURIComponent(quizId)}`,
    {
      apiVersion: "v2",
      adminContext,
      routeName,
      requestRole: "primary",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: isPublished }),
    },
  );
  if (result.status === 404) return null;
  return parseQuiz(requireStatus(result, 200, routeName).quiz);
}

export async function listFlashbackEvents(
  adminContext: VerifiedAdminContext,
  quizId: string,
): Promise<FlashbackEvent[]> {
  const routeName = "flashback-admin:list-events";
  const result = await fetchAdminBackendJson(
    `${FLASHBACK_BACKEND_PATH}/quizzes/${encodeURIComponent(quizId)}/events`,
    {
      apiVersion: "v2",
      adminContext,
      routeName,
      requestRole: "primary",
    },
  );
  const data = requireStatus(result, 200, routeName);
  if (!Array.isArray(data.events)) {
    return invalidBackendResponse("Invalid Flashback event list response from backend");
  }
  return data.events.map(parseEvent);
}

export async function createFlashbackEvent(
  adminContext: VerifiedAdminContext,
  input: {
    quizId: string;
    description: string;
    year: number;
    imageUrl?: string | null;
    pointValue: number;
  },
): Promise<FlashbackEvent | null> {
  const routeName = "flashback-admin:create-event";
  const result = await fetchAdminBackendJson(
    `${FLASHBACK_BACKEND_PATH}/quizzes/${encodeURIComponent(input.quizId)}/events`,
    {
      apiVersion: "v2",
      adminContext,
      routeName,
      requestRole: "primary",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: input.description,
        year: input.year,
        image_url: input.imageUrl ?? null,
        point_value: input.pointValue,
      }),
    },
  );
  if (result.status === 404) return null;
  return parseEvent(requireStatus(result, 201, routeName).event);
}

export async function deleteFlashbackEvent(
  adminContext: VerifiedAdminContext,
  eventId: string,
): Promise<boolean> {
  const routeName = "flashback-admin:delete-event";
  const result = await fetchAdminBackendJson(
    `${FLASHBACK_BACKEND_PATH}/events/${encodeURIComponent(eventId)}`,
    {
      apiVersion: "v2",
      adminContext,
      routeName,
      requestRole: "primary",
      method: "DELETE",
    },
  );
  if (result.status === 404) return false;
  requireStatus(result, 204, routeName);
  return true;
}
