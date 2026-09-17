import v1 from "./alpinefit-profitability.json";

function cycle(
  interactionId: string,
  responseKind: string,
  prompt: string,
  guidance: string[],
  criteria: Array<{ id: string; label: string; code: string }>,
  comparison: { title: string; text: string },
) {
  return {
    interactionId,
    responseKind,
    prompt,
    scaffoldingLevel: "beginner",
    guidance,
    criteria: criteria.map(({ id, label }) => ({ id, label })),
    comparison,
    diagnosticRules: criteria.map(({ id, code }) => ({
      criterionId: id,
      when: "not_met",
      code,
      severity: "coaching",
    })),
  };
}

const opening = cycle(
  "alpinefit-opening",
  "case_opening",
  "Restate the decision objective, name the boundary of the problem, and propose the first clarifying questions you would ask.",
  ["Separate the outcome to explain from the action management may take.", "Ask only questions that could change your structure or first test."],
  [
    { id: "objective", label: "Restates the EBITDA-margin objective", code: "objective_not_reframed" },
    { id: "scope", label: "Names a useful scope or time boundary", code: "constraint_missed" },
    { id: "questions", label: "Proposes decision-relevant questions", code: "low_value_question" },
  ],
  { title: "One strong opening", text: "I would explain the six-point EBITDA-margin decline across all 18 clubs over the latest twelve months, then recommend a response that protects service. I would confirm the metric, period, and whether the decline is concentrated by location." },
);

const initialHypothesis = cycle(
  "alpinefit-initial-hypothesis",
  "initial_hypothesis",
  "State an initial, testable hypothesis and the evidence that would support or weaken it.",
  ["A hypothesis is a starting claim, not a conclusion.", "Name the first comparison you would run."],
  [
    { id: "testable", label: "Makes a testable causal claim", code: "hypothesis_missing" },
    { id: "test", label: "Names evidence that could change the claim", code: "hypothesis_not_linked" },
  ],
  { title: "Two defensible starting points", text: "Revenue economics may have weakened despite volume growth, so test price and mix; or operating costs—especially labor—may have outpaced revenue, so compare cost categories and locations." },
);

const updateHypothesis = cycle(
  "alpinefit-hypothesis-update",
  "hypothesis_update",
  "Use the evidence you uncovered to retain, revise, or reject your initial hypothesis.",
  ["Name the evidence before the update.", "Explain why it changes—or does not change—the causal claim."],
  [
    { id: "evidence", label: "Links specific evidence to the update", code: "evidence_link_missing" },
    { id: "update", label: "Explains retain, revise, or reject", code: "failed_to_update" },
  ],
  { title: "Evidence-led update", text: "Costs grew 17% while revenue grew 8%, and labor is the clear cost outlier. That weakens a revenue-led explanation and shifts the working hypothesis toward labor pressure." },
);

const calculation = cycle(
  "alpinefit-overtime-calculation",
  "quantitative_reasoning",
  "Before entering the result, explain the setup, unit, a quick sense-check, and what the result would mean for management.",
  ["Write the multiplication in words or symbols.", "Keep total dollars separate from dollars per hour."],
  [
    { id: "setup", label: "Uses clubs × hours × premium", code: "setup_error" },
    { id: "unit", label: "States total annual dollars", code: "unit_error" },
    { id: "sense", label: "Includes a magnitude check", code: "sense_check_missing" },
    { id: "implication", label: "Connects the result to the margin problem", code: "business_implication_missing" },
  ],
  { title: "Worked reasoning", text: "6 clubs × 3,600 overtime hours per club × $35 premium per hour = $756,000 of incremental annual expense. The result is below $1 million but large enough to make targeted staffing action material." },
);

const synthesis = cycle(
  "alpinefit-synthesis",
  "case_synthesis",
  "Give an answer-first synthesis of the likely cause, the decisive evidence, and the next test or action.",
  ["Lead with the current answer in one sentence.", "Use two or three facts, then name what should happen next."],
  [
    { id: "answer", label: "Leads with the current answer", code: "answer_not_first" },
    { id: "evidence", label: "Uses decisive, connected evidence", code: "evidence_unsupported" },
    { id: "next", label: "Names a logical next step", code: "next_step_missing" },
  ],
  { title: "Answer-first synthesis", text: "AlpineFit's margin decline is primarily a labor-cost problem concentrated in six clubs: labor rose 34%, overtime nearly tripled, and those clubs have 31% turnover. Quantify the overtime burden and test a targeted staffing intervention." },
);

const recommendation = cycle(
  "alpinefit-recommendation",
  "case_recommendation",
  "Deliver an answer-first recommendation with supporting evidence, one risk, and a concrete next step.",
  ["Say what management should do first.", "Keep the action narrower than the evidence supports."],
  [
    { id: "answer", label: "Starts with a clear recommendation", code: "recommendation_not_answer_first" },
    { id: "support", label: "Supports it with case evidence", code: "support_insufficient" },
    { id: "risk", label: "Names a material risk and next step", code: "risk_missing" },
  ],
  { title: "Supported recommendation", text: "Stabilize staffing in the six high-overtime clubs through faster hiring and targeted retention while tightening overtime controls. The action targets the 34% labor increase and $756,000 annual overtime burden; protect service by piloting it for 90 days before wider rollout." },
);

const exhibitCycles = {
  "cost-category": cycle(
    "alpinefit-cost-exhibit",
    "exhibit_interpretation",
    "Describe the strongest observation, its business implication, and the next analysis you would request.",
    ["Compare categories, not just individual values.", "Separate what the exhibit shows from why it may be happening."],
    [
      { id: "observation", label: "Identifies labor as the outlier", code: "comparison_missed" },
      { id: "implication", label: "Connects labor growth to margin pressure", code: "implication_missing" },
      { id: "next", label: "Requests a focused labor cut", code: "next_test_missing" },
    ],
    { title: "Observation to next test", text: "Club labor rose from $18.1m to $24.3m, far more than any other category, making it the leading margin-pressure candidate. Break labor down by location and driver." },
  ),
  "location-turnover": cycle(
    "alpinefit-location-exhibit",
    "exhibit_interpretation",
    "Describe the strongest comparison, the likely implication, and the next step.",
    ["Compare the same club groups across both measures.", "Do not claim causality beyond the exhibit."],
    [
      { id: "observation", label: "Identifies the six-club concentration", code: "comparison_missed" },
      { id: "implication", label: "Links overtime and turnover cautiously", code: "implication_missing" },
      { id: "next", label: "Proposes a targeted follow-up", code: "next_test_missing" },
    ],
    { title: "Concentrated pattern", text: "The six high-overtime clubs show 146 overtime hours per FTE and 31% turnover versus 49 hours and 12% elsewhere. Investigate vacancies and quantify the overtime premium before targeting those clubs." },
  ),
} as const;

const alpineFitV2Content = {
  ...v1,
  version: 2,
  completeLearningLoop: true,
  opening: {
    responseCycle: opening,
    recommendedQuestionCount: 3,
    minimumHighValueQuestions: 2,
  },
  hypothesisPractice: {
    options: [
      { id: "revenue-economics", label: "Revenue economics or mix compressed margin despite volume growth" },
      { id: "labor-pressure", label: "Operating-cost and labor pressure compressed margin" },
    ],
    initial: initialHypothesis,
    update: updateHypothesis,
    contradictions: [
      { hypothesisId: "revenue-economics", evidenceFactIds: ["cost-growth", "labor-growth", "overtime-spike"] },
    ],
  },
  exhibits: v1.exhibits.map((exhibit) => ({
    ...exhibit,
    interpretation: exhibitCycles[exhibit.id as keyof typeof exhibitCycles],
  })),
  calculations: v1.calculations.map((item) => ({ ...item, responseCycle: calculation })),
  synthesis: { responseCycle: synthesis },
  recommendation: { ...v1.recommendation, responseCycle: recommendation },
};

export default alpineFitV2Content;
