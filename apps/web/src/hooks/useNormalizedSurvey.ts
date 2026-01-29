"use client";

import { useState, useEffect, useCallback } from "react";

import { auth } from "@/lib/firebase";
import type {
  ActiveRunResponse,
  AnswerInput,
  SubmitResponse,
  SurveyRun,
  SurveyWithQuestions,
} from "@/lib/surveys/normalized-types";

interface UseNormalizedSurveyReturn {
  /** Whether the initial fetch is in progress */
  loading: boolean;
  /** The survey definition with questions and options */
  survey: SurveyWithQuestions | null;
  /** The currently active run, if any */
  activeRun: SurveyRun | null;
  /** Whether the current user can submit (authenticated + under max submissions) */
  canSubmit: boolean;
  /** Number of times the user has already submitted for this run */
  userSubmissions: number;
  /** Whether a submission is currently in progress */
  submitting: boolean;
  /** Error message if something went wrong */
  error: string | null;
  /** Submit answers to the survey */
  submit: (answers: AnswerInput[]) => Promise<boolean>;
  /** Refresh the survey data */
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching and submitting to a normalized survey.
 *
 * @param surveySlug - The survey's URL slug
 * @returns Survey state and submit function
 *
 * @example
 * ```tsx
 * function SurveyPage({ surveySlug }: { surveySlug: string }) {
 *   const { loading, survey, canSubmit, submit, error } = useNormalizedSurvey(surveySlug);
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (!survey) return <div>Survey not found</div>;
 *
 *   const handleSubmit = async (answers: AnswerInput[]) => {
 *     const success = await submit(answers);
 *     if (success) {
 *       // Show success message
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <h1>{survey.title}</h1>
 *       {!canSubmit && <p>You have already submitted this survey.</p>}
 *       {error && <p className="text-red-500">{error}</p>}
 *       // ... render questions
 *     </div>
 *   );
 * }
 * ```
 */
export function useNormalizedSurvey(surveySlug: string): UseNormalizedSurveyReturn {
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null);
  const [activeRun, setActiveRun] = useState<SurveyRun | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [userSubmissions, setUserSubmissions] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveRun = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token if user is logged in
      const token = await auth.currentUser?.getIdToken();
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const response = await fetch(`/api/surveys/${surveySlug}/active-run`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch survey");
      }

      const data = (await response.json()) as ActiveRunResponse;

      setSurvey(data.survey);
      setActiveRun(data.activeRun);
      setCanSubmit(data.canSubmit);
      setUserSubmissions(data.userSubmissions);
    } catch (err) {
      console.error("[useNormalizedSurvey] Failed to fetch survey", err);
      setError(err instanceof Error ? err.message : "Failed to load survey");
    } finally {
      setLoading(false);
    }
  }, [surveySlug]);

  const submit = useCallback(
    async (answers: AnswerInput[]): Promise<boolean> => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError("You must be logged in to submit");
        return false;
      }

      setSubmitting(true);
      setError(null);

      try {
        const response = await fetch(`/api/surveys/${surveySlug}/submit`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ answers }),
        });

        const data = (await response.json()) as SubmitResponse;

        if (!response.ok) {
          if (response.status === 409) {
            setError("You have already submitted this survey");
            setCanSubmit(false);
          } else if (response.status === 401) {
            setError("You must be logged in to submit");
          } else {
            setError(data.error ?? "Submission failed");
          }
          return false;
        }

        // Success - update state
        setCanSubmit(false);
        setUserSubmissions((prev) => prev + 1);
        return true;
      } catch (err) {
        console.error("[useNormalizedSurvey] Submission failed", err);
        setError(err instanceof Error ? err.message : "Submission failed");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [surveySlug],
  );

  // Fetch on mount and when surveySlug changes
  useEffect(() => {
    fetchActiveRun();
  }, [fetchActiveRun]);

  // Re-fetch when auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      fetchActiveRun();
    });
    return unsubscribe;
  }, [fetchActiveRun]);

  return {
    loading,
    survey,
    activeRun,
    canSubmit,
    userSubmissions,
    submitting,
    error,
    submit,
    refresh: fetchActiveRun,
  };
}
