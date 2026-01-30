/**
 * RHOSLC Season 6 Survey Question Templates
 * Based on Qualtrics survey structure
 */

import type {
  SurveyTemplate,
  CastMemberOption,
  NumericRankingQuestion,
  CircleRankingQuestion,
  RectangleRankingQuestion,
  ThreeChoiceSliderQuestion,
  AgreeLikertScaleQuestion,
  NumericScaleSliderQuestion,
  TwoChoiceSliderQuestion,
  MultiSelectChoiceQuestion,
} from "../question-types";

// Cast member data with shape images
export const RHOSLC_S6_CAST: CastMemberOption[] = [
  { id: "angie", name: "Angie", img: "/images/cast/rhoslc-s6/angie.png" },
  { id: "britani", name: "Britani", img: "/images/cast/rhoslc-s6/britani.png" },
  { id: "bronwyn", name: "Bronwyn", img: "/images/cast/rhoslc-s6/bronwyn.png" },
  { id: "heather", name: "Heather", img: "/images/cast/rhoslc-s6/heather.png" },
  { id: "lisa", name: "Lisa", img: "/images/cast/rhoslc-s6/lisa.png" },
  { id: "mary", name: "Mary", img: "/images/cast/rhoslc-s6/mary.png" },
  { id: "meredith", name: "Meredith", img: "/images/cast/rhoslc-s6/meredith.png" },
  { id: "whitney", name: "Whitney", img: "/images/cast/rhoslc-s6/whitney.png" },
];

// Helper to get cast member by id
export function getCastMember(id: string): CastMemberOption | undefined {
  return RHOSLC_S6_CAST.find((member) => member.id === id);
}

// ============================================================================
// QUESTION TEMPLATES
// ============================================================================

// Episode Rating (NumericRanking)
export const episodeRatingQuestion: NumericRankingQuestion = {
  id: "episode_rating",
  type: "numeric-ranking",
  question: "How would you rate this week's episode?",
  description: "Rate from 0 to 10",
  required: true,
  minValue: 0,
  maxValue: 10,
  step: 0.1,
  labels: { min: "Terrible", max: "Perfect" },
};

// Cast Power Rankings (CircleRanking)
export const castRankingQuestion: CircleRankingQuestion = {
  id: "cast_ranking",
  type: "circle-ranking",
  question: "Rank the cast members from best to worst this episode",
  required: true,
  items: RHOSLC_S6_CAST.map((member) => ({
    id: member.id,
    label: member.name,
    img: member.img,
  })),
  lineLabelTop: "BEST",
  lineLabelBottom: "WORST",
};

// Season Rankings (RectangleRanking)
export const seasonRankingQuestion: RectangleRankingQuestion = {
  id: "season_ranking",
  type: "rectangle-ranking",
  question: "Rank the seasons of RHOSLC from best to worst",
  required: true,
  items: [
    { id: "s1", label: "Season 1", img: "" },
    { id: "s2", label: "Season 2", img: "" },
    { id: "s3", label: "Season 3", img: "" },
    { id: "s4", label: "Season 4", img: "" },
    { id: "s5", label: "Season 5", img: "" },
    { id: "s6", label: "Season 6", img: "" },
  ],
  lineLabelTop: "BEST",
  lineLabelBottom: "WORST",
};

// Franchise Rankings (RectangleRanking)
export const franchiseRankingQuestion: RectangleRankingQuestion = {
  id: "franchise_ranking",
  type: "rectangle-ranking",
  question: "Rank your favorite Real Housewives franchises",
  required: false,
  items: [
    { id: "rhoa", label: "Atlanta", img: "" },
    { id: "rhobh", label: "Beverly Hills", img: "" },
    { id: "rhod", label: "Dubai", img: "" },
    { id: "rhom", label: "Miami", img: "" },
    { id: "rhonj", label: "New Jersey", img: "" },
    { id: "rhony", label: "New York", img: "" },
    { id: "rhoc", label: "Orange County", img: "" },
    { id: "rhop", label: "Potomac", img: "" },
    { id: "rhoslc", label: "Salt Lake City", img: "" },
  ],
  lineLabelTop: "FAVORITE",
  lineLabelBottom: "LEAST FAVORITE",
};

// Keep/Fire/Demote (ThreeChoiceSlider)
export const keepFireDemoteQuestion: ThreeChoiceSliderQuestion = {
  id: "keep_fire_demote",
  type: "three-choice-slider",
  question: "For each cast member, should Bravo keep, demote, or fire them?",
  required: true,
  subjects: RHOSLC_S6_CAST,
  choices: [
    { value: "fire", label: "Fire" },
    { value: "demote", label: "Demote to Friend" },
    { value: "keep", label: "Keep" },
  ],
};

// Agree/Disagree (AgreeLikertScale)
export const agreeDisagreeQuestion: AgreeLikertScaleQuestion = {
  id: "agree_disagree",
  type: "agree-likert-scale",
  question: "Rate your agreement with the following statements",
  required: true,
  statements: [
    { id: "statement_1", label: "This season is better than last season" },
    { id: "statement_2", label: "The cast has good chemistry" },
    { id: "statement_3", label: "There is too much producer manipulation" },
    { id: "statement_4", label: "I would recommend this show to a friend" },
  ],
  scale: [
    { value: "strongly_disagree", label: "Strongly Disagree" },
    { value: "disagree", label: "Disagree" },
    { value: "neutral", label: "Neutral" },
    { value: "agree", label: "Agree" },
    { value: "strongly_agree", label: "Strongly Agree" },
  ],
};

// Cast Member Sliders (NumericScaleSlider - Boring/Entertaining scale)
export function createCastSliderQuestions(): NumericScaleSliderQuestion[] {
  return RHOSLC_S6_CAST.map((member) => ({
    id: `slider_${member.id}`,
    type: "numeric-scale-slider" as const,
    question: `Rate ${member.name} on the following scale`,
    subject: member,
    minValue: 0,
    maxValue: 100,
    minLabel: "Boring",
    maxLabel: "Entertaining",
    step: 1,
  }));
}

// Whose Side Questions (TwoChoiceSlider - Feuds)
export const whoseSideQuestions: TwoChoiceSliderQuestion[] = [
  {
    id: "feud_lisa_meredith",
    type: "two-choice-slider",
    question: "In the ongoing tension between Lisa and Meredith, whose side are you on?",
    optionA: getCastMember("lisa")!,
    optionB: getCastMember("meredith")!,
    neutralOption: "Neither / Both are wrong",
  },
  {
    id: "feud_heather_whitney",
    type: "two-choice-slider",
    question: "In the conflict between Heather and Whitney, whose side are you on?",
    optionA: getCastMember("heather")!,
    optionB: getCastMember("whitney")!,
    neutralOption: "Neither / Both are wrong",
  },
  {
    id: "feud_mary_bronwyn",
    type: "two-choice-slider",
    question: "In the disagreement between Mary and Bronwyn, whose side are you on?",
    optionA: getCastMember("mary")!,
    optionB: getCastMember("bronwyn")!,
    neutralOption: "Neither / Both are wrong",
  },
  {
    id: "feud_angie_britani",
    type: "two-choice-slider",
    question: "In the drama between Angie and Britani, whose side are you on?",
    optionA: getCastMember("angie")!,
    optionB: getCastMember("britani")!,
    neutralOption: "Neither / Both are wrong",
  },
];

// Select Two Housewives (MultiSelectChoice)
export const selectTwoHousewivesQuestion: MultiSelectChoiceQuestion = {
  id: "select_two_housewives",
  type: "multi-select-choice",
  question: "Which two housewives would you most want to see in a spin-off together?",
  required: true,
  minSelections: 2,
  maxSelections: 2,
  options: RHOSLC_S6_CAST.map((member) => ({
    value: member.id,
    label: member.name,
  })),
};

// MVP of the Episode (MultiSelectChoice)
export const mvpQuestion: MultiSelectChoiceQuestion = {
  id: "episode_mvp",
  type: "multi-select-choice",
  question: "Who was the MVP of this episode? (Select up to 2)",
  required: true,
  minSelections: 1,
  maxSelections: 2,
  options: RHOSLC_S6_CAST.map((member) => ({
    value: member.id,
    label: member.name,
  })),
};

// ============================================================================
// FULL SURVEY TEMPLATE
// ============================================================================

export const rhoslcS6SurveyTemplate: SurveyTemplate = {
  id: "rhoslc_s6_weekly",
  title: "RHOSLC Season 6 Weekly Survey",
  description: "Share your thoughts on this week's episode of Real Housewives of Salt Lake City",
  showId: "tt12623782",
  seasonNumber: 6,
  sections: [
    {
      id: "episode_reaction",
      title: "Episode Reaction",
      description: "Tell us what you thought of this week's episode",
      questions: [episodeRatingQuestion, castRankingQuestion],
    },
    {
      id: "feuds",
      title: "Whose Side Are You On?",
      description: "Pick your side in this season's biggest conflicts",
      questions: whoseSideQuestions,
    },
    {
      id: "cast_evaluation",
      title: "Cast Evaluation",
      description: "Rate each cast member and share your opinions",
      questions: [keepFireDemoteQuestion, ...createCastSliderQuestions()],
    },
    {
      id: "favorites",
      title: "Favorites & Rankings",
      description: "Share your preferences",
      questions: [
        selectTwoHousewivesQuestion,
        mvpQuestion,
        seasonRankingQuestion,
        franchiseRankingQuestion,
      ],
    },
    {
      id: "statements",
      title: "Hot Takes",
      description: "Do you agree or disagree with these statements?",
      questions: [agreeDisagreeQuestion],
    },
  ],
};

// Export all templates
export const allQuestionTemplates = {
  episodeRating: episodeRatingQuestion,
  castRanking: castRankingQuestion,
  seasonRanking: seasonRankingQuestion,
  franchiseRanking: franchiseRankingQuestion,
  keepFireDemote: keepFireDemoteQuestion,
  agreeDisagree: agreeDisagreeQuestion,
  castSliders: createCastSliderQuestions(),
  whoseSide: whoseSideQuestions,
  selectTwoHousewives: selectTwoHousewivesQuestion,
  mvp: mvpQuestion,
};
