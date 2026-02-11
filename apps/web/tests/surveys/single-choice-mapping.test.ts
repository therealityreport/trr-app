import { describe, expect, it } from "vitest";

import type { QuestionOption } from "@/lib/surveys/normalized-types";
import { resolveSingleChoiceOptionId } from "@/components/survey/answerMapping";

describe("resolveSingleChoiceOptionId", () => {
  const options: QuestionOption[] = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      question_id: "q1",
      option_key: "alpha",
      option_text: "Alpha",
      display_order: 1,
      metadata: {},
      created_at: "2026-02-08T00:00:00.000Z",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      question_id: "q1",
      option_key: "beta",
      option_text: "Beta",
      display_order: 2,
      metadata: {},
      created_at: "2026-02-08T00:00:00.000Z",
    },
  ];

  it("maps option_key to option.id", () => {
    expect(resolveSingleChoiceOptionId(options, "beta")).toBe(
      "22222222-2222-2222-2222-222222222222",
    );
  });

  it("accepts an option.id as input (fallback)", () => {
    expect(
      resolveSingleChoiceOptionId(options, "11111111-1111-1111-1111-111111111111"),
    ).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("returns undefined when no match exists", () => {
    expect(resolveSingleChoiceOptionId(options, "missing")).toBeUndefined();
  });
});

