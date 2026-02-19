"use client";

import { useState } from "react";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import type {
  QuestionOption,
  QuestionType,
  SurveyQuestion,
} from "@/lib/surveys/normalized-types";

interface QuestionWithOptions extends SurveyQuestion {
  options: QuestionOption[];
}

interface QuestionBuilderProps {
  surveySlug: string;
  questions: QuestionWithOptions[];
  onRefresh: () => void;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "single_choice", label: "Single Choice" },
  { value: "multi_choice", label: "Multiple Choice" },
  { value: "free_text", label: "Free Text" },
  { value: "likert", label: "Likert Scale" },
  { value: "numeric", label: "Numeric" },
  { value: "ranking", label: "Ranking" },
];

export function QuestionBuilder({
  surveySlug,
  questions,
  onRefresh,
}: QuestionBuilderProps) {
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState<QuestionType>("single_choice");
  const [newRequired, setNewRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Option management state
  const [addingOptionTo, setAddingOptionTo] = useState<string | null>(null);
  const [newOptionKey, setNewOptionKey] = useState("");
  const [newOptionText, setNewOptionText] = useState("");

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newText.trim()) return;

    try {
      setCreating(true);
      setError(null);

      const response = await fetchAdminWithAuth(
        `/api/admin/normalized-surveys/${surveySlug}/questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question_key: newKey.trim(),
            question_text: newText.trim(),
            question_type: newType,
            is_required: newRequired,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to create question");
      }

      setNewKey("");
      setNewText("");
      setNewType("single_choice");
      setNewRequired(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create question");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question?")) return;

    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/normalized-surveys/${surveySlug}/questions/${questionId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to delete");
      }

      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete question");
    }
  };

  const handleAddOption = async (questionId: string) => {
    if (!newOptionKey.trim() || !newOptionText.trim()) return;

    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/normalized-surveys/${surveySlug}/questions/${questionId}/options`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            option_key: newOptionKey.trim(),
            option_text: newOptionText.trim(),
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to add option");
      }

      setAddingOptionTo(null);
      setNewOptionKey("");
      setNewOptionText("");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add option");
    }
  };

  const handleDeleteOption = async (questionId: string, optionId: string) => {
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/normalized-surveys/${surveySlug}/questions/${questionId}/options?optionId=${optionId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to delete option");
      }

      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete option");
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add question form */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          Add Question
        </h3>
        <form onSubmit={handleCreateQuestion} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as QuestionType)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Question Text
            </label>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Who is your favorite housewife this season?"
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
      {questions.length === 0 ? (
        <div className="text-center text-zinc-500">
          No questions yet. Add one above.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="rounded-lg border border-zinc-200 bg-white p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-500">
                      #{index + 1}
                    </span>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {question.question_type}
                    </span>
                    {question.is_required && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    key: {question.question_key}
                  </p>
                  <p className="mt-2 text-zinc-900">{question.question_text}</p>
                </div>
                <button
                  onClick={() => handleDeleteQuestion(question.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>

              {/* Options for choice questions */}
              {(question.question_type === "single_choice" ||
                question.question_type === "multi_choice") && (
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <div className="mb-2 text-sm font-medium text-zinc-700">
                    Options
                  </div>
                  {question.options.length === 0 ? (
                    <p className="text-sm text-zinc-500">No options yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {question.options.map((option) => (
                        <li
                          key={option.id}
                          className="flex items-center justify-between rounded bg-zinc-50 px-3 py-2"
                        >
                          <span className="text-sm">
                            <span className="text-zinc-500">
                              {option.option_key}:
                            </span>{" "}
                            {option.option_text}
                          </span>
                          <button
                            onClick={() =>
                              handleDeleteOption(question.id, option.id)
                            }
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {addingOptionTo === question.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        placeholder="Key"
                        value={newOptionKey}
                        onChange={(e) => setNewOptionKey(e.target.value)}
                        className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Text"
                        value={newOptionText}
                        onChange={(e) => setNewOptionText(e.target.value)}
                        className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => handleAddOption(question.id)}
                        className="rounded bg-zinc-900 px-3 py-1 text-sm text-white"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingOptionTo(null);
                          setNewOptionKey("");
                          setNewOptionText("");
                        }}
                        className="text-sm text-zinc-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingOptionTo(question.id)}
                      className="mt-3 text-sm text-zinc-600 hover:text-zinc-900"
                    >
                      + Add Option
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
