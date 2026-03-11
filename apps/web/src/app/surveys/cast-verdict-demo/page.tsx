"use client";

import * as React from "react";
import CastVerdict, { CastVerdictFlow } from "@/components/cast-verdict";
import { RHOSLC_S6_CAST_MEMBERS } from "@/lib/surveys/rhoslc-assets";
import type { CastVerdictChoice, SurveyRankingItem } from "@/lib/surveys/types";

const RHOSLC_CAST: SurveyRankingItem[] = [
  ...RHOSLC_S6_CAST_MEMBERS.map((member) => ({
    id: member.id,
    label: member.shortName,
    img: member.imagePath,
  })),
];

export default function CastVerdictDemoPage() {
  const [singleVerdict, setSingleVerdict] = React.useState<CastVerdictChoice | null>(null);
  const [verdicts, setVerdicts] = React.useState<Map<string, CastVerdictChoice>>(new Map());
  const [flowComplete, setFlowComplete] = React.useState(false);
  const [showFlow, setShowFlow] = React.useState(false);

  const handleVerdictChange = React.useCallback((castId: string, verdict: CastVerdictChoice) => {
    setVerdicts((prev) => {
      const next = new Map(prev);
      next.set(castId, verdict);
      return next;
    });
  }, []);

  const handleFlowComplete = React.useCallback(() => {
    setFlowComplete(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Cast Verdict Demo</h1>

        {!showFlow ? (
          <>
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-center">Single Cast Member</h2>
              <CastVerdict
                castMember={RHOSLC_CAST[0]}
                value={singleVerdict}
                onChange={setSingleVerdict}
              />
              {singleVerdict && (
                <p className="text-center mt-4 text-lg">
                  You chose: <strong className="capitalize">{singleVerdict}</strong>
                </p>
              )}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowFlow(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors"
              >
                Try Full Cast Flow
              </button>
            </div>
          </>
        ) : flowComplete ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6">Your Verdicts</h2>
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <ul className="space-y-3">
                {RHOSLC_CAST.map((member) => (
                  <li key={member.id} className="flex justify-between items-center">
                    <span className="font-medium">{member.label}</span>
                    <span className="capitalize px-3 py-1 rounded-full text-sm font-medium bg-gray-100">
                      {verdicts.get(member.id) || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowFlow(false);
                setFlowComplete(false);
                setVerdicts(new Map());
              }}
              className="mt-6 px-6 py-3 bg-gray-600 text-white rounded-full font-medium hover:bg-gray-700 transition-colors"
            >
              Start Over
            </button>
          </div>
        ) : (
          <CastVerdictFlow
            castMembers={RHOSLC_CAST}
            verdicts={verdicts}
            onVerdictChange={handleVerdictChange}
            onComplete={handleFlowComplete}
          />
        )}
      </div>
    </div>
  );
}
