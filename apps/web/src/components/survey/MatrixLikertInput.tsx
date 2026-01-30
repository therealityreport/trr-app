"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { ThreeChoiceSliderConfig, AgreeLikertScaleConfig, MatrixRow } from "@/lib/surveys/question-config-types";

export interface MatrixLikertInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: Record<string, string> | null;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
}

export default function MatrixLikertInput({
  question,
  value,
  onChange,
  disabled = false,
}: MatrixLikertInputProps) {
  const config = question.config as unknown as ThreeChoiceSliderConfig | AgreeLikertScaleConfig;
  const rows = config.rows ?? [];

  // Options become columns (sorted by display_order)
  const columns = [...question.options].sort((a, b) => a.display_order - b.display_order);

  const handleCellSelect = React.useCallback(
    (rowId: string, optionKey: string) => {
      if (disabled) return;
      const newValue = { ...(value ?? {}), [rowId]: optionKey };
      onChange(newValue);
    },
    [disabled, value, onChange]
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-sm font-medium text-gray-600 min-w-[150px]">
              {/* Empty cell for row labels */}
            </th>
            {columns.map((col) => (
              <th
                key={col.option_key}
                className="p-2 text-center text-sm font-medium text-gray-600 min-w-[80px]"
              >
                {col.option_text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: MatrixRow, rowIndex) => (
            <tr
              key={row.id}
              className={rowIndex % 2 === 0 ? "bg-gray-50" : "bg-white"}
            >
              <td className="p-3 text-sm text-gray-800">
                <div className="flex items-center gap-3">
                  {row.img && (
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={row.img}
                        alt={row.label}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <span className="font-medium">{row.label}</span>
                </div>
              </td>
              {columns.map((col) => {
                const isSelected = value?.[row.id] === col.option_key;
                return (
                  <td key={col.option_key} className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleCellSelect(row.id, col.option_key)}
                      disabled={disabled}
                      className={`
                        w-6 h-6 rounded-full border-2 transition-all
                        ${isSelected
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-gray-300 bg-white hover:border-indigo-300"
                        }
                        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      `}
                      aria-label={`Select ${col.option_text} for ${row.label}`}
                      aria-pressed={isSelected}
                    >
                      {isSelected && (
                        <span className="flex items-center justify-center w-full h-full">
                          <span className="w-2 h-2 rounded-full bg-white" />
                        </span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
