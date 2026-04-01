import "server-only";

import type { PoolClient } from "pg";

import type { FlashbackEvent, FlashbackQuiz } from "@/lib/flashback/types";
import { query, withTransaction } from "@/lib/server/postgres";

type SortOrderRow = {
  max_sort_order: number | null;
};

type DeletedEventRow = {
  quiz_id: string;
  sort_order: number;
};

const FLASHBACK_QUIZ_COLUMNS = `
  id,
  title,
  publish_date,
  description,
  is_published,
  created_at,
  updated_at
`;

const FLASHBACK_EVENT_COLUMNS = `
  id,
  quiz_id,
  description,
  image_url,
  year,
  sort_order,
  point_value
`;

export async function listFlashbackQuizzes(): Promise<FlashbackQuiz[]> {
  const result = await query<FlashbackQuiz>(
    `SELECT ${FLASHBACK_QUIZ_COLUMNS}
       FROM public.flashback_quizzes
      ORDER BY publish_date DESC, created_at DESC`,
  );
  return result.rows;
}

export async function createFlashbackQuiz(input: {
  title: string;
  publishDate: string;
  description?: string | null;
}): Promise<FlashbackQuiz> {
  const result = await query<FlashbackQuiz>(
    `INSERT INTO public.flashback_quizzes (title, publish_date, description, is_published)
     VALUES ($1, $2, $3, false)
     RETURNING ${FLASHBACK_QUIZ_COLUMNS}`,
    [input.title, input.publishDate, input.description ?? null],
  );
  return result.rows[0];
}

export async function setFlashbackQuizPublished(
  quizId: string,
  isPublished: boolean,
): Promise<FlashbackQuiz | null> {
  const result = await query<FlashbackQuiz>(
    `UPDATE public.flashback_quizzes
        SET is_published = $2,
            updated_at = now()
      WHERE id = $1
      RETURNING ${FLASHBACK_QUIZ_COLUMNS}`,
    [quizId, isPublished],
  );
  return result.rows[0] ?? null;
}

export async function listFlashbackEvents(quizId: string): Promise<FlashbackEvent[]> {
  const result = await query<FlashbackEvent>(
    `SELECT ${FLASHBACK_EVENT_COLUMNS}
       FROM public.flashback_events
      WHERE quiz_id = $1
      ORDER BY sort_order ASC`,
    [quizId],
  );
  return result.rows;
}

async function requireFlashbackQuizForMutation(client: PoolClient, quizId: string): Promise<void> {
  const result = await client.query<{ id: string }>(
    `SELECT id
       FROM public.flashback_quizzes
      WHERE id = $1
      FOR UPDATE`,
    [quizId],
  );
  if ((result.rowCount ?? 0) === 0) {
    throw new Error("quiz_not_found");
  }
}

export async function createFlashbackEvent(input: {
  quizId: string;
  description: string;
  year: number;
  imageUrl?: string | null;
  pointValue: number;
}): Promise<FlashbackEvent> {
  return withTransaction(async (client) => {
    await requireFlashbackQuizForMutation(client, input.quizId);
    const sortOrderResult = await client.query<SortOrderRow>(
      `SELECT COALESCE(MAX(sort_order), 0)::int AS max_sort_order
         FROM public.flashback_events
        WHERE quiz_id = $1`,
      [input.quizId],
    );
    const nextSortOrder = (sortOrderResult.rows[0]?.max_sort_order ?? 0) + 1;

    const result = await client.query<FlashbackEvent>(
      `INSERT INTO public.flashback_events (
         quiz_id,
         description,
         year,
         image_url,
         point_value,
         sort_order
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${FLASHBACK_EVENT_COLUMNS}`,
      [
        input.quizId,
        input.description,
        input.year,
        input.imageUrl ?? null,
        input.pointValue,
        nextSortOrder,
      ],
    );
    return result.rows[0];
  });
}

export async function deleteFlashbackEvent(eventId: string): Promise<boolean> {
  return withTransaction(async (client) => {
    const eventResult = await client.query<DeletedEventRow>(
      `SELECT quiz_id, sort_order
         FROM public.flashback_events
        WHERE id = $1
        FOR UPDATE`,
      [eventId],
    );
    const deletedEvent = eventResult.rows[0];
    if (!deletedEvent) {
      return false;
    }

    await client.query(`DELETE FROM public.flashback_events WHERE id = $1`, [eventId]);
    await client.query(
      `UPDATE public.flashback_events
          SET sort_order = sort_order - 1
        WHERE quiz_id = $1
          AND sort_order > $2`,
      [deletedEvent.quiz_id, deletedEvent.sort_order],
    );
    return true;
  });
}
