import "server-only";

import type { AuthContext } from "@/lib/server/postgres";
import type {
  SurveyTemplate,
  SurveyQuestion as SpecQuestion,
  SelectOption,
  ImageOption,
  RankItem,
  StatementRow,
  LikertColumn,
  SliderChoice,
} from "@/lib/surveys/spec/question-types";
import type { QuestionType } from "@/lib/surveys/normalized-types";
import type { QuestionConfig, MatrixRow as ConfigMatrixRow } from "@/lib/surveys/question-config-types";
import {
  getSurveyBySlug,
  createSurvey,
  createQuestion,
  createOption,
  type CreateSurveyInput,
  type CreateQuestionInput,
  type CreateOptionInput,
} from "./normalized-survey-admin-repository";

// ============================================================================
// Type Mapping
// ============================================================================

interface MappedQuestion {
  dbType: QuestionType;
  config: QuestionConfig;
  /** Options to create (for choice-based questions) */
  options: CreateOptionInput[];
}

/**
 * Map a spec question type to DB question_type + config.uiVariant
 */
function mapSpecQuestion(specQuestion: SpecQuestion): MappedQuestion {
  switch (specQuestion.type) {
    case "numeric-ranking":
      return {
        dbType: "numeric",
        config: {
          uiVariant: "numeric-ranking",
          min: specQuestion.minValue,
          max: specQuestion.maxValue,
          step: specQuestion.step,
          labels: specQuestion.labels,
          description: specQuestion.description,
        },
        options: [],
      };

    case "numeric-scale-slider":
      return {
        dbType: "numeric",
        config: {
          uiVariant: "numeric-scale-slider",
          min: specQuestion.minValue,
          max: specQuestion.maxValue,
          step: specQuestion.step,
          minLabel: specQuestion.minLabel,
          maxLabel: specQuestion.maxLabel,
          subject: specQuestion.subject,
          description: specQuestion.description,
        },
        options: [],
      };

    case "circle-ranking":
      return {
        dbType: "ranking",
        config: {
          uiVariant: "circle-ranking",
          lineLabelTop: specQuestion.lineLabelTop,
          lineLabelBottom: specQuestion.lineLabelBottom,
          description: specQuestion.description,
        },
        options: specQuestion.items.map((item: RankItem, index: number) => ({
          question_id: "", // Will be set after question creation
          option_key: item.id,
          option_text: item.label,
          display_order: index,
          metadata: item.img ? { imagePath: item.img } : {},
        })),
      };

    case "rectangle-ranking":
      return {
        dbType: "ranking",
        config: {
          uiVariant: "rectangle-ranking",
          lineLabelTop: specQuestion.lineLabelTop,
          lineLabelBottom: specQuestion.lineLabelBottom,
          description: specQuestion.description,
        },
        options: specQuestion.items.map((item: RankItem, index: number) => ({
          question_id: "",
          option_key: item.id,
          option_text: item.label,
          display_order: index,
          metadata: item.img ? { imagePath: item.img } : {},
        })),
      };

    case "two-choice-slider":
      return {
        dbType: "single_choice",
        config: {
          uiVariant: "two-choice-slider",
          neutralOption: specQuestion.neutralOption,
          description: specQuestion.description,
        },
        options: [
          {
            question_id: "",
            option_key: specQuestion.optionA.id,
            option_text: specQuestion.optionA.name,
            display_order: 0,
            metadata: { imagePath: specQuestion.optionA.img },
          },
          {
            question_id: "",
            option_key: specQuestion.optionB.id,
            option_text: specQuestion.optionB.name,
            display_order: 1,
            metadata: { imagePath: specQuestion.optionB.img },
          },
          ...(specQuestion.neutralOption
            ? [
                {
                  question_id: "",
                  option_key: "neutral",
                  option_text: specQuestion.neutralOption,
                  display_order: 2,
                  metadata: {},
                },
              ]
            : []),
        ],
      };

    case "three-choice-slider":
      return {
        dbType: "likert",
        config: {
          uiVariant: "three-choice-slider",
          choices: specQuestion.choices,
          rows: specQuestion.subjects.map(
            (subject): ConfigMatrixRow => ({
              id: subject.id,
              label: subject.name,
              img: subject.img,
            })
          ),
          description: specQuestion.description,
        },
        // Choices become options
        options: specQuestion.choices.map((choice: SliderChoice, index: number) => ({
          question_id: "",
          option_key: choice.value,
          option_text: choice.label,
          display_order: index,
          metadata: {},
        })),
      };

    case "agree-likert-scale":
      return {
        dbType: "likert",
        config: {
          uiVariant: "agree-likert-scale",
          rows: specQuestion.statements.map(
            (stmt: StatementRow): ConfigMatrixRow => ({
              id: stmt.id,
              label: stmt.label,
            })
          ),
          description: specQuestion.description,
        },
        // Scale becomes options
        options: specQuestion.scale.map((col: LikertColumn, index: number) => ({
          question_id: "",
          option_key: col.value,
          option_text: col.label,
          display_order: index,
          metadata: {},
        })),
      };

    case "text-multiple-choice":
      return {
        dbType: "single_choice",
        config: {
          uiVariant: "text-multiple-choice",
          description: specQuestion.description,
        },
        options: specQuestion.options.map((opt: SelectOption, index: number) => ({
          question_id: "",
          option_key: opt.value,
          option_text: opt.label,
          display_order: index,
          metadata: {},
        })),
      };

    case "multi-select-choice":
      return {
        dbType: "multi_choice",
        config: {
          uiVariant: "multi-select-choice",
          minSelections: specQuestion.minSelections,
          maxSelections: specQuestion.maxSelections,
          description: specQuestion.description,
        },
        options: specQuestion.options.map((opt: SelectOption, index: number) => ({
          question_id: "",
          option_key: opt.value,
          option_text: opt.label,
          display_order: index,
          metadata: {},
        })),
      };

    case "image-multiple-choice":
      return {
        dbType: "single_choice",
        config: {
          uiVariant: "image-multiple-choice",
          columns: specQuestion.columns,
          description: specQuestion.description,
        },
        options: specQuestion.options.map((opt: ImageOption, index: number) => ({
          question_id: "",
          option_key: opt.id,
          option_text: opt.label,
          display_order: index,
          metadata: { imagePath: opt.img },
        })),
      };

    case "text-entry":
      return {
        dbType: "free_text",
        config: {
          uiVariant: "text-entry",
          inputType: specQuestion.inputType,
          placeholder: specQuestion.placeholder,
          validation: specQuestion.validation,
          description: specQuestion.description,
        },
        options: [],
      };

    case "dropdown":
      return {
        dbType: "single_choice",
        config: {
          uiVariant: "dropdown",
          placeholder: specQuestion.placeholder,
          description: specQuestion.description,
        },
        options: specQuestion.options.map((opt: SelectOption, index: number) => ({
          question_id: "",
          option_key: opt.value,
          option_text: opt.label,
          display_order: index,
          metadata: {},
        })),
      };

    default:
      throw new Error(`Unknown spec question type: ${(specQuestion as SpecQuestion).type}`);
  }
}

// ============================================================================
// Import Result Types
// ============================================================================

export interface ImportResult {
  success: boolean;
  surveyId?: string;
  surveySlug: string;
  questionsCreated: number;
  optionsCreated: number;
  error?: string;
  skipped?: boolean;
}

// ============================================================================
// Main Import Function
// ============================================================================

/**
 * Import a spec template into the firebase_surveys schema.
 *
 * Idempotent: If survey slug already exists, returns early with skipped=true.
 *
 * @param authContext - Auth context for admin operations
 * @param template - Spec template to import
 * @returns Import result with created counts
 */
export async function importSurveyTemplate(
  authContext: AuthContext,
  template: SurveyTemplate
): Promise<ImportResult> {
  const surveySlug = template.id.replace(/_/g, "-"); // Convert underscores to dashes

  // Check if survey already exists (idempotent)
  const existing = await getSurveyBySlug(surveySlug);
  if (existing) {
    return {
      success: true,
      surveyId: existing.id,
      surveySlug,
      questionsCreated: 0,
      optionsCreated: 0,
      skipped: true,
    };
  }

  try {
    // Create survey
    const surveyInput: CreateSurveyInput = {
      slug: surveySlug,
      title: template.title,
      description: template.description,
      is_active: true,
      metadata: {
        showId: template.showId,
        seasonNumber: template.seasonNumber,
        episodeNumber: template.episodeNumber,
        importedAt: new Date().toISOString(),
      },
    };

    const survey = await createSurvey(authContext, surveyInput);
    let questionsCreated = 0;
    let optionsCreated = 0;
    let displayOrder = 0;

    // Process each section's questions
    for (const section of template.sections) {
      for (const specQuestion of section.questions) {
        const mapped = mapSpecQuestion(specQuestion);

        // Create question
        const questionInput: CreateQuestionInput = {
          survey_id: survey.id,
          question_key: specQuestion.id,
          question_text: specQuestion.question,
          question_type: mapped.dbType,
          display_order: displayOrder++,
          is_required: specQuestion.required ?? false,
          config: mapped.config as Record<string, unknown>,
        };

        const question = await createQuestion(authContext, questionInput);
        questionsCreated++;

        // Create options
        for (const optionInput of mapped.options) {
          await createOption(authContext, {
            ...optionInput,
            question_id: question.id,
          });
          optionsCreated++;
        }
      }
    }

    return {
      success: true,
      surveyId: survey.id,
      surveySlug,
      questionsCreated,
      optionsCreated,
    };
  } catch (error) {
    return {
      success: false,
      surveySlug,
      questionsCreated: 0,
      optionsCreated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Import a simple survey definition (not from spec template).
 * Useful for creating surveys programmatically without the full spec format.
 */
export interface SimpleSurveyDefinition {
  slug: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  questions: Array<{
    key: string;
    text: string;
    type: QuestionType;
    required?: boolean;
    config?: QuestionConfig;
    options?: Array<{
      key: string;
      text: string;
      metadata?: Record<string, unknown>;
    }>;
  }>;
}

export async function importSimpleSurvey(
  authContext: AuthContext,
  definition: SimpleSurveyDefinition
): Promise<ImportResult> {
  // Check if survey already exists
  const existing = await getSurveyBySlug(definition.slug);
  if (existing) {
    return {
      success: true,
      surveyId: existing.id,
      surveySlug: definition.slug,
      questionsCreated: 0,
      optionsCreated: 0,
      skipped: true,
    };
  }

  try {
    const survey = await createSurvey(authContext, {
      slug: definition.slug,
      title: definition.title,
      description: definition.description,
      metadata: definition.metadata,
    });

    let questionsCreated = 0;
    let optionsCreated = 0;

    for (let i = 0; i < definition.questions.length; i++) {
      const q = definition.questions[i];
      const question = await createQuestion(authContext, {
        survey_id: survey.id,
        question_key: q.key,
        question_text: q.text,
        question_type: q.type,
        display_order: i,
        is_required: q.required,
        config: q.config as Record<string, unknown> | undefined,
      });
      questionsCreated++;

      if (q.options) {
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          await createOption(authContext, {
            question_id: question.id,
            option_key: opt.key,
            option_text: opt.text,
            display_order: j,
            metadata: opt.metadata,
          });
          optionsCreated++;
        }
      }
    }

    return {
      success: true,
      surveyId: survey.id,
      surveySlug: definition.slug,
      questionsCreated,
      optionsCreated,
    };
  } catch (error) {
    return {
      success: false,
      surveySlug: definition.slug,
      questionsCreated: 0,
      optionsCreated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
