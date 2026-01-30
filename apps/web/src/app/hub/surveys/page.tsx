"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Route } from "next";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthDebugger } from "@/lib/debug";
import { getSurveyXState, saveSurveyXResponses } from "@/lib/db/surveys";
import type { SurveyXResponses } from "@/lib/validation/user";

type SurveyCardConfig = {
  id: string;
  title: string;
  description: string;
  frequency: string;
  href?: Route;
  actionLabel?: string;
  noteUnlocked?: string;
  noteLocked?: string;
};

const SURVEY_CARDS: SurveyCardConfig[] = [
  {
    id: "survey-x",
    title: "Survey X",
    description:
      "Tell us about your viewing and streaming habits so we can personalize every weekly check-in.",
    frequency: "One-time setup",
  },
  {
    id: "weekly-pulse",
    title: "Weekly Show Pulse",
    description: "Vote on storylines and rate new episodes across Bravo, Netflix, Peacock, and more.",
    frequency: "Weekly",
  },
  {
    id: "rhop-s10",
    title: "RHOP S10 Cast Rankings",
    description: "Drag the Season 10 cast into your current power ranking each week.",
    frequency: "Weekly",
    href: "/surveys/rhop-s10",
    actionLabel: "Rank now",
    noteUnlocked: "Cast order updates every Monday afternoon.",
  },
  {
    id: "finale-forecast",
    title: "Finale Forecast Polls",
    description: "Rapid-fire predictions before season finales and reunion tapings.",
    frequency: "Event-based",
  },
  {
    id: "platform-check-in",
    title: "Platform Check-In",
    description: "Let us know which services you are paying for each month so we can surface the right shows.",
    frequency: "Monthly",
  },
];

type BannerKind = "info" | "success" | "error";

type BannerState = { kind: BannerKind; text: string } | null;

type SurveyCardProps = {
  title: string;
  description: string;
  frequency: string;
  locked: boolean;
  actionLabel: string;
  onAction?: () => void;
  completed?: boolean;
  secondaryNote?: string | null;
};

function BannerMessage({ banner }: { banner: BannerState }) {
  if (!banner) return null;
  const base = "rounded-lg border px-4 py-3 text-sm";
  const tone =
    banner.kind === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : banner.kind === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-blue-200 bg-blue-50 text-blue-800";
  return <div className={`${base} ${tone}`}>{banner.text}</div>;
}

function SurveyCard({
  title,
  description,
  frequency,
  locked,
  actionLabel,
  onAction,
  completed = false,
  secondaryNote,
}: SurveyCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
            <path
              d="M23 14.6667H22.3333V10.6667C22.3333 7.05467 19.6127 4 16 4C12.3873 4 9.66667 7.05467 9.66667 10.6667V14.6667H9C7.52724 14.6667 6.33333 15.8606 6.33333 17.3333V24.6667C6.33333 26.1394 7.52724 27.3333 9 27.3333H23C24.4728 27.3333 25.6667 26.1394 25.6667 24.6667V17.3333C25.6667 15.8606 24.4728 14.6667 23 14.6667ZM11.3333 10.6667C11.3333 7.98133 13.3147 5.83333 16 5.83333C18.6853 5.83333 20.6667 7.98133 20.6667 10.6667V14.6667H11.3333V10.6667ZM23 25.6667H9C8.448 25.6667 8 25.2187 8 24.6667V17.3333C8 16.7813 8.448 16.3333 9 16.3333H23C23.552 16.3333 24 16.7813 24 17.3333V24.6667C24 25.2187 23.552 25.6667 23 25.6667Z"
              fill="#3F3F46"
            />
          </svg>
          <p className="text-sm font-semibold text-zinc-700">Complete Survey X to unlock</p>
        </div>
      )}

      <div className={`relative z-0 space-y-5 p-6 ${locked ? "opacity-70" : "opacity-100"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">{frequency}</p>
            <h3 className="mt-2 text-2xl font-bold text-zinc-900">{title}</h3>
          </div>
          {completed && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Completed
            </span>
          )}
        </div>

        <p className="text-sm leading-relaxed text-zinc-600">{description}</p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onAction}
            disabled={locked}
            className={`inline-flex w-max items-center rounded-full px-5 py-2 text-sm font-semibold transition ${
              locked ? "cursor-not-allowed bg-zinc-100 text-zinc-400" : "bg-black text-white hover:bg-zinc-900"
            }`}
          >
            {actionLabel}
          </button>
          {secondaryNote && <p className="text-xs text-zinc-500">{secondaryNote}</p>}
        </div>
      </div>
    </div>
  );
}

const PLATFORM_SUBSCRIPTION_OPTIONS = [
  "Cable or satellite TV",
  "Peacock",
  "Hulu",
  "Hulu + Live TV",
  "Netflix",
  "Max (HBO Max)",
  "Amazon Prime Video",
  "Paramount+",
  "YouTube TV",
  "Sling TV",
  "Philo",
  "Other",
  "None of these",
];

const PRIMARY_PLATFORM_OPTIONS = [
  "Bravo (cable)",
  "Peacock",
  "Hulu",
  "Netflix",
  "Paramount+",
  "Discovery+",
  "Max",
  "YouTube TV",
  "Other",
];

const FREQUENCY_OPTIONS = [
  "Every day",
  "A few times a week",
  "Once a week",
  "A few times a month",
  "Rarely",
];

const WATCH_MODE_OPTIONS = [
  { value: "live", label: "Mostly live as it airs" },
  { value: "next-day", label: "Next-day or DVR" },
  { value: "binge", label: "Binge once a season drops" },
  { value: "mix", label: "Mix of live and binge" },
];

const COWATCH_OPTIONS = [
  "Mostly by myself",
  "Friends",
  "Family",
  "Significant other / partner",
  "A mix of the above",
  "Prefer not to say",
];

const LIVE_CHATS_SOCIAL_OPTIONS = [
  "Yes",
  "Sometimes",
  "No",
];

const DEVICE_OPTIONS = [
  "TV with built-in apps (Smart TV)",
  "Streaming stick / box (Roku, Fire TV, Apple TV, etc.)",
  "Laptop / desktop computer",
  "Tablet",
  "Phone",
  "Other",
];

function createInitialResponses(responses?: SurveyXResponses | null): SurveyXResponses {
  if (!responses) {
    return {
      view_live_tv_household: "",
      view_platforms_subscriptions: [],
      primaryPlatform: "",
      watchFrequency: "",
      watchMode: "",
      view_reality_cowatch: "",
      view_live_chats_social: "",
      view_devices_reality: [],
    };
  }

  return {
    view_live_tv_household: responses.view_live_tv_household ?? "",
    view_platforms_subscriptions: Array.isArray(responses.view_platforms_subscriptions) ? [...responses.view_platforms_subscriptions] : [],
    primaryPlatform: responses.primaryPlatform ?? "",
    watchFrequency: responses.watchFrequency ?? "",
    watchMode: responses.watchMode ?? "",
    view_reality_cowatch: responses.view_reality_cowatch ?? "",
    view_live_chats_social: responses.view_live_chats_social ?? "",
    view_devices_reality: Array.isArray(responses.view_devices_reality) ? [...responses.view_devices_reality] : [],
  };
}

interface SurveyXModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
  initialResponses: SurveyXResponses | null;
  onComplete: (responses: SurveyXResponses) => void;
}

function SurveyXModal({ open, onClose, user, initialResponses, onComplete }: SurveyXModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [form, setForm] = useState<SurveyXResponses>(() => createInitialResponses(initialResponses));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPage(0);
      setForm(createInitialResponses(initialResponses));
      setError(null);
    }
  }, [open, initialResponses]);

  const updateField = (key: keyof SurveyXResponses, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const toggleArrayItem = (key: keyof SurveyXResponses, item: string) => {
    setForm((prev) => {
      const currentArray = prev[key] as string[];
      const newArray = currentArray.includes(item)
        ? currentArray.filter((i) => i !== item)
        : [...currentArray, item];
      return { ...prev, [key]: newArray };
    });
    setError(null);
  };

  // Define all questions with validation
  const questions = [
    {
      id: "view_live_tv_household",
      question: "Does your household have Live TV (for example, live cable or live channels through a streaming provider)?",
      type: "single-select" as const,
      options: ["Yes", "No"],
      validate: () => form.view_live_tv_household ? null : "Please select an option.",
    },
    {
      id: "view_platforms_subscriptions",
      question: "Which platform(s) does your household currently have paid subscriptions to? (Select all that apply.)",
      type: "multi-select" as const,
      options: PLATFORM_SUBSCRIPTION_OPTIONS,
      validate: () => form.view_platforms_subscriptions.length > 0 ? null : "Please select at least one option.",
    },
    {
      id: "primaryPlatform",
      question: "Primary place you watch reality TV",
      type: "single-select" as const,
      options: PRIMARY_PLATFORM_OPTIONS,
      validate: () => form.primaryPlatform ? null : "Please select an option.",
    },
    {
      id: "watchFrequency",
      question: "How often do you watch unscripted TV?",
      type: "single-select" as const,
      options: FREQUENCY_OPTIONS,
      validate: () => form.watchFrequency ? null : "Please select an option.",
    },
    {
      id: "watchMode",
      question: "How do you usually watch?",
      type: "radio" as const,
      options: WATCH_MODE_OPTIONS,
      validate: () => form.watchMode ? null : "Please select an option.",
    },
    {
      id: "view_reality_cowatch",
      question: "Who do you typically watch reality TV with?",
      type: "single-select" as const,
      options: COWATCH_OPTIONS,
      validate: () => form.view_reality_cowatch ? null : "Please select an option.",
    },
    {
      id: "view_live_chats_social",
      question: "Do you join live chats or use social media while you're watching episodes?",
      type: "single-select" as const,
      options: LIVE_CHATS_SOCIAL_OPTIONS,
      validate: () => form.view_live_chats_social ? null : "Please select an option.",
    },
    {
      id: "view_devices_reality",
      question: "What devices do you typically use to watch reality TV? (Select all that apply.)",
      type: "multi-select" as const,
      options: DEVICE_OPTIONS,
      validate: () => form.view_devices_reality.length > 0 ? null : "Please select at least one device.",
    },
  ];

  const totalPages = questions.length;
  const currentQuestion = questions[currentPage];
  const isLastPage = currentPage === totalPages - 1;

  const handleNext = () => {
    const validationError = currentQuestion.validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    if (isLastPage) {
      handleSubmit();
    } else {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      await saveSurveyXResponses(user, form);
      AuthDebugger.log("Survey X: responses saved", { uid: user.uid });
      onComplete(form);
    } catch (err) {
      console.error("Failed to save Survey X responses", err);
      const message = err instanceof Error ? err.message : null;
      setError(message ?? "We couldn't save your answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="flex h-full flex-col">
        {/* Header with progress */}
        <div className="border-b border-zinc-200 px-6 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Survey X</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Question {currentPage + 1} of {totalPages}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-600 transition hover:bg-zinc-100"
              >
                Exit
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full bg-black transition-all duration-300"
                style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-8 min-h-[80px]">
              <h2
                className="text-2xl font-medium text-zinc-900 md:text-3xl"
                style={{ fontFamily: "var(--font-rude-slab)", fontWeight: 500 }}
              >
                {currentQuestion.question}
              </h2>
            </div>

            <div className="space-y-3 pb-8">
              {currentQuestion.type === "single-select" && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField(currentQuestion.id as keyof SurveyXResponses, option)}
                      className={`flex w-full items-center rounded-lg border-2 px-6 py-4 text-left transition ${
                        form[currentQuestion.id as keyof SurveyXResponses] === option
                          ? "border-black bg-black text-white"
                          : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                      }`}
                      style={{ fontFamily: "var(--font-plymouth-serial)", fontWeight: 800 }}
                    >
                      <span className="font-extrabold">{option}</span>
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "radio" && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField(currentQuestion.id as keyof SurveyXResponses, option.value)}
                      className={`flex w-full items-center rounded-lg border-2 px-6 py-4 text-left transition ${
                        form[currentQuestion.id as keyof SurveyXResponses] === option.value
                          ? "border-black bg-black text-white"
                          : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                      }`}
                      style={{ fontFamily: "var(--font-plymouth-serial)", fontWeight: 800 }}
                    >
                      <span className="font-extrabold">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "multi-select" && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => {
                    const isSelected = (form[currentQuestion.id as keyof SurveyXResponses] as string[]).includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleArrayItem(currentQuestion.id as keyof SurveyXResponses, option)}
                        className={`flex w-full items-center gap-4 rounded-lg border-2 px-6 py-4 text-left transition ${
                          isSelected
                            ? "border-black bg-black text-white"
                            : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                        }`}
                        style={{ fontFamily: "var(--font-plymouth-serial)", fontWeight: 800 }}
                      >
                        <div
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 ${
                            isSelected ? "border-white bg-white" : "border-zinc-300"
                          }`}
                        >
                          {isSelected && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M13.3333 4L6 11.3333L2.66667 8"
                                stroke="black"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="font-extrabold">{option}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4">
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="border-t border-zinc-200 px-6 py-6">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentPage === 0}
              className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className="rounded-full bg-black px-8 py-3 text-sm font-semibold text-white transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : isLastPage ? "Submit" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SurveysPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(auth.currentUser ?? null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerState>(null);
  const [surveyXCompleted, setSurveyXCompleted] = useState(false);
  const [surveyXResponses, setSurveyXResponses] = useState<SurveyXResponses | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    AuthDebugger.log("Surveys page: mounted");
    return () => {
      AuthDebugger.log("Surveys page: unmounted");
    };
  }, []);

  const loadSurveyState = useCallback(
    async (uid: string) => {
      setLoading(true);
      try {
        const state = await getSurveyXState(uid);
        if (state?.completed) {
          setSurveyXCompleted(true);
          setSurveyXResponses(state.responses ?? null);
        } else {
          setSurveyXCompleted(false);
          setSurveyXResponses(null);
        }
        setBanner(null);
      } catch (error) {
        console.error("Failed to load survey progress", error);
        setBanner({ kind: "error", text: "We couldn’t load your survey progress. Please try again." });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        AuthDebugger.log("Surveys page: user authenticated", { uid: currentUser.uid });
        void loadSurveyState(currentUser.uid);
      } else {
        setSurveyXCompleted(false);
        setSurveyXResponses(null);
        setLoading(false);
        setBanner({ kind: "info", text: "Sign in to unlock surveys and polls." });
      }
    });
    return () => unsubscribe();
  }, [loadSurveyState]);

  const handleSurveySelect = (title: string) => {
    setBanner({ kind: "info", text: `${title} is in preview. We’ll let you know as soon as it’s live.` });
  };

  const handleSurveyXSuccess = (responses: SurveyXResponses) => {
    setSurveyXCompleted(true);
    setSurveyXResponses(responses);
    setModalOpen(false);
    setBanner({ kind: "success", text: "Thanks! Weekly surveys are now unlocked." });
  };

  const cards = useMemo(() => {
    return SURVEY_CARDS.map((survey) => {
      const isSurveyX = survey.id === "survey-x";
      const locked = !isSurveyX && !surveyXCompleted;
      const href = survey.href;
      const actionLabel = isSurveyX
        ? surveyXCompleted
          ? "Update responses"
          : "Start survey"
        : locked
          ? "Locked"
          : survey.actionLabel ?? "Preview poll";
      const secondaryNote = isSurveyX
        ? "We only ask these questions once."
        : locked
          ? survey.noteLocked ?? "Unlocks after Survey X."
          : survey.noteUnlocked ?? "We’ll email you when this week’s poll opens.";
      const onAction = isSurveyX
        ? () => setModalOpen(true)
        : locked
          ? undefined
          : href
            ? () => router.push(href)
            : () => handleSurveySelect(survey.title);

      return (
        <SurveyCard
          key={survey.id}
          title={survey.title}
          description={survey.description}
          frequency={survey.frequency}
          locked={locked}
          actionLabel={actionLabel}
          onAction={onAction}
          completed={isSurveyX && surveyXCompleted}
          secondaryNote={secondaryNote}
        />
      );
    });
  }, [router, surveyXCompleted]);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Surveys & Polls</p>
        <h1 className="text-3xl font-serif text-zinc-900">Help shape the shows you love</h1>
        <p className="text-sm text-zinc-600">
          Start with Survey X to store your viewing habits and demographics. Once it’s complete, weekly check-ins unlock instantly.
        </p>
      </header>

      <BannerMessage banner={banner} />

      {loading ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-zinc-300 bg-white/60 px-6 py-16 text-sm text-zinc-600">
          Loading your surveys…
        </div>
      ) : !user ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-600">
          Sign in to your account to access surveys.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">{cards}</div>
      )}

      {user && (
        <SurveyXModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          user={user}
          initialResponses={surveyXResponses}
          onComplete={handleSurveyXSuccess}
        />
      )}
    </section>
  );
}
