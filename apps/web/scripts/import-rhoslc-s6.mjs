#!/usr/bin/env node
/**
 * Import RHOSLC S6 Survey Template into firebase_surveys schema
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/import-rhoslc-s6.mjs
 *
 * Or with .env.local:
 *   node scripts/import-rhoslc-s6.mjs
 */

import { Pool } from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[import] DATABASE_URL is not set");
  process.exit(1);
}

// Configure SSL
let ssl = undefined;
if (process.env.DATABASE_SSL === "true") {
  const inlineCa = process.env.DATABASE_SSL_CA;
  const caPath = process.env.DATABASE_SSL_CA_PATH;
  if (inlineCa) {
    ssl = { rejectUnauthorized: true, ca: inlineCa };
  } else if (caPath) {
    const resolved = path.resolve(path.join(__dirname, ".."), caPath);
    const ca = readFileSync(resolved, "utf8");
    ssl = { rejectUnauthorized: true, ca };
  } else {
    ssl = { rejectUnauthorized: true };
  }
}

const pool = new Pool({ connectionString, ssl });

// ============================================================================
// RHOSLC S6 Survey Definition
// ============================================================================

const SURVEY_SLUG = "rhoslc-s6-weekly";
const SURVEY_TITLE = "RHOSLC Season 6 Weekly Survey";
const SURVEY_DESCRIPTION = "Share your thoughts on this week's episode of Real Housewives of Salt Lake City";

const CAST = [
  { id: "angie", name: "Angie", img: "/images/cast/rhoslc-s6/angie.png" },
  { id: "britani", name: "Britani", img: "/images/cast/rhoslc-s6/britani.png" },
  { id: "bronwyn", name: "Bronwyn", img: "/images/cast/rhoslc-s6/bronwyn.png" },
  { id: "heather", name: "Heather", img: "/images/cast/rhoslc-s6/heather.png" },
  { id: "lisa", name: "Lisa", img: "/images/cast/rhoslc-s6/lisa.png" },
  { id: "mary", name: "Mary", img: "/images/cast/rhoslc-s6/mary.png" },
  { id: "meredith", name: "Meredith", img: "/images/cast/rhoslc-s6/meredith.png" },
  { id: "whitney", name: "Whitney", img: "/images/cast/rhoslc-s6/whitney.png" },
];

// Question definitions with DB mappings
const QUESTIONS = [
  // Episode Rating (stars)
  {
    key: "episode_rating",
    text: "How would you rate this week's episode?",
    type: "numeric",
    required: true,
    config: {
      uiVariant: "star-rating",
      min: 1,
      max: 5,
      labels: { min: "Poor", max: "Excellent" },
    },
    options: [],
  },

  // Cast Ranking (drag-drop)
  {
    key: "cast_ranking",
    text: "Rank the cast members from best to worst this episode",
    type: "ranking",
    required: true,
    config: {
      uiVariant: "drag-drop",
      variant: "grid",
      lineLabelTop: "BEST",
      lineLabelBottom: "WORST",
    },
    options: CAST.map((c, i) => ({
      key: c.id,
      text: c.name,
      order: i,
      metadata: { imagePath: c.img },
    })),
  },

  // Whose Side: Lisa vs Meredith
  {
    key: "feud_lisa_meredith",
    text: "In the ongoing tension between Lisa and Meredith, whose side are you on?",
    type: "single_choice",
    required: false,
    config: {
      uiVariant: "whose-side",
      neutralOption: "Neither / Both are wrong",
    },
    options: [
      { key: "lisa", text: "Lisa", order: 0, metadata: { imagePath: "/images/cast/rhoslc-s6/lisa.png" } },
      { key: "meredith", text: "Meredith", order: 1, metadata: { imagePath: "/images/cast/rhoslc-s6/meredith.png" } },
      { key: "neutral", text: "Neither / Both are wrong", order: 2, metadata: {} },
    ],
  },

  // Whose Side: Heather vs Whitney
  {
    key: "feud_heather_whitney",
    text: "In the conflict between Heather and Whitney, whose side are you on?",
    type: "single_choice",
    required: false,
    config: {
      uiVariant: "whose-side",
      neutralOption: "Neither / Both are wrong",
    },
    options: [
      { key: "heather", text: "Heather", order: 0, metadata: { imagePath: "/images/cast/rhoslc-s6/heather.png" } },
      { key: "whitney", text: "Whitney", order: 1, metadata: { imagePath: "/images/cast/rhoslc-s6/whitney.png" } },
      { key: "neutral", text: "Neither / Both are wrong", order: 2, metadata: {} },
    ],
  },

  // Keep/Fire/Demote Matrix
  {
    key: "keep_fire_demote",
    text: "For each cast member, should Bravo keep, demote, or fire them?",
    type: "likert",
    required: true,
    config: {
      uiVariant: "matrix-likert",
      rows: CAST.map((c) => ({ id: c.id, label: c.name, img: c.img })),
    },
    options: [
      { key: "keep", text: "Keep", order: 0, metadata: {} },
      { key: "demote", text: "Demote to Friend", order: 1, metadata: {} },
      { key: "fire", text: "Fire", order: 2, metadata: {} },
    ],
  },

  // Cast Sliders (one per cast member)
  ...CAST.map((member) => ({
    key: `slider_${member.id}`,
    text: `Rate ${member.name} on the following scale`,
    type: "numeric",
    required: false,
    config: {
      uiVariant: "slider",
      min: 0,
      max: 100,
      step: 1,
      minLabel: "Boring",
      maxLabel: "Entertaining",
      subject: member,
    },
    options: [],
  })),

  // MVP of Episode
  {
    key: "episode_mvp",
    text: "Who was the MVP of this episode? (Select up to 2)",
    type: "multi_choice",
    required: true,
    config: {
      uiVariant: "checkbox",
      minSelections: 1,
      maxSelections: 2,
    },
    options: CAST.map((c, i) => ({
      key: c.id,
      text: c.name,
      order: i,
      metadata: { imagePath: c.img },
    })),
  },

  // Agree/Disagree Statements
  {
    key: "agree_disagree",
    text: "Rate your agreement with the following statements",
    type: "likert",
    required: true,
    config: {
      uiVariant: "matrix-likert",
      rows: [
        { id: "statement_1", label: "This season is better than last season" },
        { id: "statement_2", label: "The cast has good chemistry" },
        { id: "statement_3", label: "There is too much producer manipulation" },
        { id: "statement_4", label: "I would recommend this show to a friend" },
      ],
    },
    options: [
      { key: "strongly_disagree", text: "Strongly Disagree", order: 0, metadata: {} },
      { key: "disagree", text: "Disagree", order: 1, metadata: {} },
      { key: "neutral", text: "Neutral", order: 2, metadata: {} },
      { key: "agree", text: "Agree", order: 3, metadata: {} },
      { key: "strongly_agree", text: "Strongly Agree", order: 4, metadata: {} },
    ],
  },

  // Age (demographics)
  {
    key: "respondent_age",
    text: "What is your age?",
    type: "free_text",
    required: false,
    config: {
      uiVariant: "text",
      inputType: "number",
      placeholder: "Enter your age",
      validation: {
        minLength: 1,
        maxLength: 3,
        pattern: "^[0-9]+$",
        errorMessage: "Please enter a valid age",
      },
    },
    options: [],
  },

  // Country (demographics)
  {
    key: "respondent_country",
    text: "What country do you live in?",
    type: "single_choice",
    required: false,
    config: {
      uiVariant: "dropdown",
      placeholder: "Select your country",
    },
    options: [
      { key: "us", text: "United States", order: 0, metadata: {} },
      { key: "ca", text: "Canada", order: 1, metadata: {} },
      { key: "uk", text: "United Kingdom", order: 2, metadata: {} },
      { key: "au", text: "Australia", order: 3, metadata: {} },
      { key: "other", text: "Other", order: 4, metadata: {} },
    ],
  },
];

// ============================================================================
// Import Logic
// ============================================================================

async function checkSurveyExists(client) {
  const result = await client.query(
    `SELECT id FROM firebase_surveys.surveys WHERE slug = $1`,
    [SURVEY_SLUG]
  );
  return result.rows[0]?.id;
}

async function createSurvey(client) {
  const result = await client.query(
    `INSERT INTO firebase_surveys.surveys (slug, title, description, is_active, metadata)
     VALUES ($1, $2, $3, true, $4)
     RETURNING id`,
    [
      SURVEY_SLUG,
      SURVEY_TITLE,
      SURVEY_DESCRIPTION,
      JSON.stringify({
        showId: "tt12623782",
        seasonNumber: 6,
        importedAt: new Date().toISOString(),
      }),
    ]
  );
  return result.rows[0].id;
}

async function createQuestion(client, surveyId, question, displayOrder) {
  const result = await client.query(
    `INSERT INTO firebase_surveys.questions (survey_id, question_key, question_text, question_type, display_order, is_required, config)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      surveyId,
      question.key,
      question.text,
      question.type,
      displayOrder,
      question.required,
      JSON.stringify(question.config),
    ]
  );
  return result.rows[0].id;
}

async function createOption(client, questionId, option) {
  await client.query(
    `INSERT INTO firebase_surveys.options (question_id, option_key, option_text, display_order, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [questionId, option.key, option.text, option.order, JSON.stringify(option.metadata)]
  );
}

async function main() {
  const client = await pool.connect();
  try {
    // Check if survey already exists
    const existingId = await checkSurveyExists(client);
    if (existingId) {
      console.log(`[import] Survey "${SURVEY_SLUG}" already exists (id: ${existingId}). Skipping.`);
      return;
    }

    await client.query("BEGIN");

    // Create survey
    console.log(`[import] Creating survey "${SURVEY_SLUG}"...`);
    const surveyId = await createSurvey(client);
    console.log(`[import] Created survey with id: ${surveyId}`);

    // Create questions and options
    let questionsCreated = 0;
    let optionsCreated = 0;

    for (let i = 0; i < QUESTIONS.length; i++) {
      const question = QUESTIONS[i];
      const questionId = await createQuestion(client, surveyId, question, i);
      questionsCreated++;

      for (const option of question.options) {
        await createOption(client, questionId, option);
        optionsCreated++;
      }
    }

    await client.query("COMMIT");

    console.log(`[import] Success!`);
    console.log(`[import]   Survey ID: ${surveyId}`);
    console.log(`[import]   Questions created: ${questionsCreated}`);
    console.log(`[import]   Options created: ${optionsCreated}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[import] Error:", error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
