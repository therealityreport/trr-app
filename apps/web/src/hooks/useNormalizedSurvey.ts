"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import type { ActiveRunResponse, AnswerInput, SubmitResponse } from "@/lib/surveys/normalized-types";

type SubmissionResult =
  | { status: "saved" }
  | { status: "failed"; error: string }
  | { status: "superseded" };

interface SurveyScope {
  slug: string;
  user: User | null;
  generation: number;
  load: AbortController | null;
  submission: AbortController | null;
}

interface SurveyState {
  scope: SurveyScope;
  data: ActiveRunResponse | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const signInError = "You must be signed in to submit this survey.";
const limitError = "You have reached the response limit for this survey.";

export function useNormalizedSurvey(surveySlug: string) {
  const [state, setState] = useState<SurveyState | null>(null);
  const scopeRef = useRef<SurveyScope | null>(null);
  const generationRef = useRef(0);

  const isCurrent = useCallback((scope: SurveyScope) => {
    return scopeRef.current === scope && auth.currentUser?.uid === scope.user?.uid;
  }, []);

  const update = useCallback((scope: SurveyScope, patch: Partial<Omit<SurveyState, "scope">>) => {
    setState((previous) => previous?.scope === scope ? { ...previous, ...patch } : previous);
  }, []);

  const fetchActiveRun = useCallback(async (scope: SurveyScope) => {
    if (!isCurrent(scope)) return;
    scope.load?.abort();
    const controller = new AbortController();
    scope.load = controller;
    const isLatest = () => isCurrent(scope) && scope.load === controller && !controller.signal.aborted;

    update(scope, { loading: true, error: null });
    try {
      const token = await scope.user?.getIdToken();
      if (!isLatest()) return;
      const response = await fetch(`/api/surveys/${encodeURIComponent(scope.slug)}/active-run`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "omit",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Failed to fetch survey");

      const data = (await response.json()) as ActiveRunResponse;
      if (isLatest()) update(scope, { data, loading: false });
    } catch (error) {
      if (!isLatest()) return;
      console.error("[useNormalizedSurvey] Failed to fetch survey", error);
      update(scope, { error: "Unable to check survey availability. Please try again.", loading: false });
    } finally {
      if (scope.load === controller) scope.load = null;
    }
  }, [isCurrent, update]);

  useLayoutEffect(() => {
    let disposed = false;
    const clearScope = () => {
      const scope = scopeRef.current;
      scopeRef.current = null;
      scope?.load?.abort();
      scope?.submission?.abort();
    };

    // Firebase calls this once when the initial auth state is available.
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (disposed || (scopeRef.current && scopeRef.current.user?.uid === user?.uid)) return;
      clearScope();
      const scope: SurveyScope = {
        slug: surveySlug,
        user,
        generation: ++generationRef.current,
        load: null,
        submission: null,
      };
      scopeRef.current = scope;
      setState({ scope, data: null, loading: true, submitting: false, error: null });
      void fetchActiveRun(scope);
    });

    return () => {
      disposed = true;
      clearScope();
      unsubscribe();
    };
  }, [surveySlug, fetchActiveRun]);

  const current = state?.scope.slug === surveySlug ? state : null;
  const scope = current?.scope;
  const data = current?.data;
  const canSubmit = Boolean(data?.canSubmit && !current?.loading && !current?.error);

  const refresh = useCallback(async () => {
    if (scope) await fetchActiveRun(scope);
  }, [scope, fetchActiveRun]);

  const submit = useCallback(async (answers: AnswerInput[]): Promise<SubmissionResult> => {
    const submissionScope = scopeRef.current;
    if (submissionScope !== scope) return { status: "superseded" };
    if (!submissionScope || !isCurrent(submissionScope)) return { status: "superseded" };
    if (!submissionScope.user) return { status: "failed", error: signInError };
    if (!canSubmit) {
      return {
        status: "failed",
        error: data?.eligibility === "limit-reached" ? limitError : "Survey submissions are not available right now.",
      };
    }
    if (submissionScope.submission) return { status: "superseded" };

    const controller = new AbortController();
    submissionScope.submission = controller;
    update(submissionScope, { submitting: true });
    try {
      const token = await submissionScope.user.getIdToken();
      if (!isCurrent(submissionScope)) return { status: "superseded" };
      if (!token) return { status: "failed", error: signInError };

      const response = await fetch(`/api/surveys/${encodeURIComponent(submissionScope.slug)}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "omit",
        signal: controller.signal,
        body: JSON.stringify({ answers }),
      });
      if (!isCurrent(submissionScope)) return { status: "superseded" };
      if (response.status === 409) {
        submissionScope.load?.abort();
        if (data) update(submissionScope, { data: { ...data, canSubmit: false, eligibility: "limit-reached" }, loading: false });
        return { status: "failed", error: limitError };
      }
      if (response.status === 401) return { status: "failed", error: signInError };

      const result = (await response.json()) as SubmitResponse;
      if (!isCurrent(submissionScope)) return { status: "superseded" };
      if (!response.ok || !result.success) {
        return { status: "failed", error: result.error ?? "Submission failed. Please try again." };
      }

      // The POST succeeded. Check the updated allowance separately from the save.
      void fetchActiveRun(submissionScope);
      return { status: "saved" };
    } catch (error) {
      if (!isCurrent(submissionScope)) return { status: "superseded" };
      console.error("[useNormalizedSurvey] Submission failed", error);
      return { status: "failed", error: "Unable to submit your response. Please try again." };
    } finally {
      submissionScope.submission = null;
      if (isCurrent(submissionScope)) update(submissionScope, { submitting: false });
    }
  }, [canSubmit, data, fetchActiveRun, isCurrent, scope, update]);

  return {
    generation: scope?.generation,
    loading: !current || (current.loading && !data),
    refreshing: Boolean(current?.loading && data),
    survey: data?.survey ?? null,
    activeRun: data?.activeRun ?? null,
    eligibility: data?.eligibility ?? null,
    canSubmit,
    userSubmissions: data?.userSubmissions ?? 0,
    submitting: current?.submitting ?? false,
    error: current?.error ?? null,
    submit,
    refresh,
  };
}
