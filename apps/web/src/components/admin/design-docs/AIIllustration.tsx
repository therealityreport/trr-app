"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useCallback, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  AIIllustration v2 — 4-tab comparison (Original / Flash / Pro / GPT) */
/*  Shows prompt text under each image, refresh button, auto-generates */
/* ------------------------------------------------------------------ */

type TabId = "original" | "gemini-flash" | "gemini-pro" | "gpt-image";

interface TabOption {
  id: TabId;
  label: string;
  shortLabel: string;
  isAI: boolean;
}

const TABS: TabOption[] = [
  { id: "original", label: "Original (NYT Reference)", shortLabel: "Original", isAI: false },
  { id: "gemini-flash", label: "Gemini 3.1 Flash Image", shortLabel: "Flash", isAI: true },
  { id: "gemini-pro", label: "Gemini 3 Pro Image", shortLabel: "Pro", isAI: true },
  { id: "gpt-image", label: "GPT Image 1", shortLabel: "GPT", isAI: true },
];

interface PromptEntry {
  prompt: string;
  description: string;
}

export interface IllustrationPrompts {
  label: string;
  original: PromptEntry & {
    imageUrl?: string | null; // R2 URL of actual NYT screenshot
  };
  trr: PromptEntry;
}

interface CachedImage {
  url: string;
  tab: TabId;
}

interface AIIllustrationProps {
  prompts: IllustrationPrompts;
  aspectRatio?: string;
  height?: number;
  brandAccent?: string;
  autoGenerate?: boolean;
}

export default function AIIllustration({
  prompts,
  aspectRatio = "1 / 1",
  height = 280,
  brandAccent = "#326DA8",
  autoGenerate = false,
}: AIIllustrationProps) {
  const [activeTab, setActiveTab] = useState<TabId>("original");
  const [images, setImages] = useState<Record<string, CachedImage>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [analyzedPrompt, setAnalyzedPrompt] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [promptMode, setPromptMode] = useState<"original" | "trr">("original");

  /* ---- Analyze original image via Gemini vision ---- */
  const analyzeOriginalImage = useCallback(async (): Promise<string | null> => {
    if (!prompts.original.imageUrl || analyzing) return analyzedPrompt;
    if (analyzedPrompt) return analyzedPrompt; // Already analyzed
    setAnalyzing(true);
    try {
      const res = await fetch("/api/design-docs/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: prompts.original.imageUrl }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnalyzedPrompt(data.prompt);
      return data.prompt as string;
    } catch (err) {
      console.error("Analysis failed:", err);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, [prompts.original.imageUrl, analyzing, analyzedPrompt]);

  /* ---- Prompt resolution ---- */
  const getPromptForTab = (tab: TabId): string => {
    if (tab === "original") return analyzedPrompt || prompts.original.prompt;
    // In "original" mode: use analyzed prompt to recreate the NYT original exactly
    // In "trr" mode: use the housewives-themed prompt
    if (promptMode === "original") return analyzedPrompt || prompts.original.prompt;
    return prompts.trr.prompt;
  };

  const getDescriptionForTab = (tab: TabId): string => {
    if (tab === "original") return prompts.original.description;
    if (promptMode === "original") return prompts.original.description;
    return prompts.trr.description;
  };

  /* ---- Image generation ---- */
  const generateImage = useCallback(
    async (tab: TabId, force = false) => {
      if (tab === "original") return;
      if (!force && (images[tab] || loading[tab])) return;

      // In "original" mode: auto-analyze first if we have an imageUrl but no prompt yet
      let promptToUse: string;
      if (promptMode === "original" && prompts.original.imageUrl && !analyzedPrompt) {
        // Auto-analyze the original image first, then generate
        setLoading((prev) => ({ ...prev, [tab]: true }));
        const analyzed = await analyzeOriginalImage();
        promptToUse = analyzed || prompts.original.prompt;
      } else {
        promptToUse = promptMode === "original"
          ? (analyzedPrompt || prompts.original.prompt)
          : prompts.trr.prompt;
        setLoading((prev) => ({ ...prev, [tab]: true }));
      }

      setErrors((prev) => {
        const next = { ...prev };
        delete next[tab];
        return next;
      });

      try {
        const model = tab as "gemini-flash" | "gemini-pro" | "gpt-image";
        const res = await fetch("/api/design-docs/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptToUse, model }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        setImages((prev) => ({
          ...prev,
          [tab]: { url: data.imageUrl, tab },
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        setErrors((prev) => ({ ...prev, [tab]: msg }));
      } finally {
        setLoading((prev) => ({ ...prev, [tab]: false }));
      }
    },
    [images, loading, prompts.trr.prompt, prompts.original.prompt, promptMode, analyzedPrompt, prompts.original.imageUrl, analyzeOriginalImage],
  );

  const handleRefresh = (tab: TabId) => {
    if (tab === "original") return;
    setImages((prev) => {
      const next = { ...prev };
      delete next[tab];
      return next;
    });
    generateImage(tab, true);
  };

  const handleTabSwitch = (tab: TabId) => {
    setActiveTab(tab);
    if (tab !== "original" && !images[tab] && !loading[tab] && !errors[tab]) {
      generateImage(tab);
    }
  };

  // Auto-generate on mount if requested
  useEffect(() => {
    if (autoGenerate) {
      generateImage("gemini-flash");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentImage = images[activeTab];
  const isLoading = loading[activeTab];
  const error = errors[activeTab];
  const activeTabInfo = TABS.find((t) => t.id === activeTab);
  const currentPrompt = getPromptForTab(activeTab);
  const currentDescription = getDescriptionForTab(activeTab);
  const isOriginal = activeTab === "original";

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--dd-paper-grey)",
        background: "white",
      }}
    >
      {/* Header with label + 4-tab toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid var(--dd-paper-grey)",
          background: "var(--dd-paper-warm)",
          flexWrap: "wrap" as const,
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--dd-ink-medium)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
          }}
        >
          {prompts.label}
        </span>

        {/* Prompt Mode Toggle */}
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "var(--dd-paper-cool)",
            borderRadius: 4,
            padding: 1,
          }}
        >
          <button
            onClick={() => setPromptMode("original")}
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 9,
              fontWeight: promptMode === "original" ? 700 : 400,
              color: promptMode === "original" ? "white" : "var(--dd-ink-faint)",
              background: promptMode === "original" ? "var(--dd-ink-black)" : "transparent",
              border: "none",
              borderRadius: 3,
              padding: "2px 6px",
              cursor: "pointer",
            }}
          >
            Original
          </button>
          <button
            onClick={() => setPromptMode("trr")}
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 9,
              fontWeight: promptMode === "trr" ? 700 : 400,
              color: promptMode === "trr" ? "white" : "var(--dd-ink-faint)",
              background: promptMode === "trr" ? brandAccent : "transparent",
              border: "none",
              borderRadius: 3,
              padding: "2px 6px",
              cursor: "pointer",
            }}
          >
            TRR
          </button>
        </div>

        {/* 4-Tab Toggle */}
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "var(--dd-paper-cool)",
            borderRadius: 6,
            padding: 2,
          }}
        >
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            const hasImage = !!images[t.id];
            return (
              <button
                key={t.id}
                onClick={() => handleTabSwitch(t.id)}
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "white" : "var(--dd-ink-light)",
                  background: isActive
                    ? t.id === "original"
                      ? "var(--dd-ink-black)"
                      : brandAccent
                    : "transparent",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 10px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap" as const,
                  position: "relative" as const,
                }}
                title={t.label}
              >
                {t.shortLabel}
                {hasImage && !isActive && (
                  <span
                    style={{
                      position: "absolute" as const,
                      top: 2,
                      right: 2,
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "var(--dd-viz-green)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Image Area */}
      <div
        style={{
          position: "relative" as const,
          aspectRatio,
          minHeight: height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isOriginal ? "var(--dd-paper-warm)" : "var(--dd-paper-cool)",
          overflow: "hidden",
        }}
      >
        {isOriginal ? (
          prompts.original.imageUrl ? (
            /* Original tab — shows actual NYT screenshot */
            <div style={{ position: "relative" as const, width: "100%", height: "100%" }}>
              <img
                src={prompts.original.imageUrl}
                alt={`${prompts.label} — NYT Original`}
                onClick={() => setLightboxUrl(prompts.original.imageUrl!)}
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }}
              />
              {/* Analyze button overlay */}
              <button
                onClick={analyzeOriginalImage}
                disabled={analyzing}
                style={{
                  position: "absolute" as const,
                  bottom: 8,
                  right: 8,
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: analyzing ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.7)",
                  border: "none",
                  cursor: analyzing ? "wait" : "pointer",
                  color: "white",
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {analyzing ? "⏳ Analyzing…" : analyzedPrompt ? "✓ Analyzed — Re-analyze" : "🔍 Analyze with Gemini"}
              </button>
            </div>
          ) : (
            /* Original tab — shows description placeholder */
            <div
              style={{
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                gap: 12,
                padding: 32,
                textAlign: "center" as const,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: "var(--dd-ink-black)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--dd-ink-black)",
                }}
              >
                NYT Reference
              </span>
              <span
                style={{
                  fontFamily: "var(--dd-font-body)",
                  fontSize: 13,
                  color: "var(--dd-ink-soft)",
                  maxWidth: 320,
                  lineHeight: 1.5,
                }}
              >
                {currentDescription}
              </span>
            </div>
          )
        ) : currentImage ? (
          <>
            <img
              src={currentImage.url}
              alt={`${prompts.label} — ${activeTabInfo?.label}`}
              onClick={() => setLightboxUrl(currentImage.url)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                cursor: "zoom-in",
              }}
            />
            {/* Refresh overlay button */}
            <button
              onClick={() => handleRefresh(activeTab)}
              style={{
                position: "absolute" as const,
                top: 8,
                right: 8,
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "rgba(0,0,0,0.6)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
              }}
              title="Re-generate"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </>
        ) : isLoading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid var(--dd-paper-grey)",
                borderTopColor: brandAccent,
                borderRadius: "50%",
                animation: "dd-spin 0.8s linear infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
              }}
            >
              Generating with {activeTabInfo?.label}...
            </span>
            <style>{`@keyframes dd-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              gap: 8,
              padding: 24,
              textAlign: "center" as const,
            }}
          >
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-viz-red)",
                fontWeight: 600,
              }}
            >
              Generation failed
            </span>
            <span
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                maxWidth: 260,
                wordBreak: "break-word" as const,
              }}
            >
              {error}
            </span>
            <button
              onClick={() => {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next[activeTab];
                  return next;
                });
                generateImage(activeTab, true);
              }}
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 600,
                color: "white",
                background: brandAccent,
                border: "none",
                borderRadius: 4,
                padding: "6px 14px",
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <button
            onClick={() => generateImage(activeTab)}
            style={{
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "2px dashed var(--dd-paper-mid)",
              borderRadius: 8,
              padding: "24px 32px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={brandAccent}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--dd-ink-light)",
              }}
            >
              Generate with {activeTabInfo?.label}
            </span>
          </button>
        )}
      </div>

      {/* Prompt Display Footer */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--dd-paper-grey)",
          background: "var(--dd-paper-white)",
        }}
      >
        {/* Description */}
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-medium)",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            {isOriginal
              ? (analyzedPrompt ? "Gemini-Analyzed Prompt" : "Reference Description")
              : promptMode === "original"
                ? (analyzing ? "⏳ Analyzing original…" : analyzedPrompt ? "Recreating Original (Gemini prompt)" : "Recreating Original (manual prompt)")
                : "TRR Prompt"}
          </span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {analyzing && (
              <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "var(--dd-viz-orange)" }}>
                analyzing…
              </span>
            )}
            <span
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 9,
                fontWeight: 400,
                color: isOriginal ? "var(--dd-ink-black)" : promptMode === "original" ? "var(--dd-ink-black)" : brandAccent,
                background: isOriginal ? "var(--dd-paper-cool)" : promptMode === "original" ? "var(--dd-paper-cool)" : `${brandAccent}15`,
                padding: "2px 6px",
                borderRadius: 3,
              }}
            >
              {promptMode === "original" ? `Original → ${activeTabInfo?.shortLabel}` : `TRR → ${activeTabInfo?.shortLabel}`}
            </span>
          </div>
        </div>

        {/* Prompt text */}
        <p
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
            lineHeight: 1.5,
            color: "var(--dd-ink-light)",
            margin: 0,
            maxHeight: 60,
            overflow: "auto",
          }}
        >
          {currentPrompt}
        </p>
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: "fixed" as const,
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
            padding: 32,
          }}
        >
          <img
            src={lightboxUrl}
            alt={`${prompts.label} — enlarged`}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 8,
              boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxUrl(null);
            }}
            style={{
              position: "absolute" as const,
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 20,
              fontWeight: 300,
            }}
            aria-label="Close lightbox"
          >
            ✕
          </button>
          {/* Prompt overlay at bottom */}
          <div
            style={{
              position: "absolute" as const,
              bottom: 16,
              left: 32,
              right: 32,
              background: "rgba(0,0,0,0.7)",
              borderRadius: 8,
              padding: "12px 16px",
              maxHeight: 80,
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
              }}
            >
              {activeTabInfo?.label} Prompt
            </span>
            <p
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.85)",
                margin: "4px 0 0",
              }}
            >
              {currentPrompt}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
