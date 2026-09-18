import v1 from "./paypilot-growth.json";

function cycle(
  interactionId: string,
  responseKind: string,
  prompt: string,
  criteria: Array<{ id: string; label: string; code: string }>,
  comparison: { title: string; text: string },
) {
  return {
    interactionId,
    responseKind,
    prompt,
    scaffoldingLevel: "intermediate",
    guidance: [],
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
  "paypilot-opening",
  "strategic_case_opening",
  "Restate the decision, define the criteria you would use to compare the alternatives, and identify the first clarifications you need.",
  [
    { id: "decision", label: "Frames the choice between the two initiatives", code: "objective_not_reframed" },
    { id: "decision-criteria", label: "Defines economic, strategic, and execution criteria", code: "material_term_unresolved" },
    { id: "constraint", label: "Recognizes that management can fund only one initiative", code: "constraint_missed" },
  ],
  {
    title: "One decision-led opening",
    text: "Choose the initiative with the stronger first-year profit, durable growth, and execution risk profile, given that PayPilot can fund only one. Clarify the profit metric, investment constraint, and eligible customer or market scope before structuring the comparison.",
  },
);

const initialHypothesis = cycle(
  "paypilot-initial-hypothesis",
  "strategic_hypothesis",
  "State which initiative you currently expect to be stronger, why, and what evidence could change your view.",
  [
    { id: "claim", label: "Makes a testable choice between the initiatives", code: "hypothesis_missing" },
    { id: "logic", label: "Links the choice to economics or durable growth", code: "hypothesis_not_linked" },
    { id: "disconfirming-test", label: "Names evidence that could reverse the choice", code: "evidence_link_missing" },
  ],
  {
    title: "Two defensible starting hypotheses",
    text: "The installed-base module may win through lower acquisition cost and strategic fit; alternatively, expansion may offer greater long-run headroom if the reachable market, unit economics, and entry cost support an attractive first year.",
  },
);

const hypothesisUpdate = cycle(
  "paypilot-hypothesis-update",
  "strategic_hypothesis_update",
  "Use the evidence you uncovered to retain, revise, or reject your initial strategic hypothesis.",
  [
    { id: "evidence", label: "Links the update to specific revealed evidence", code: "evidence_link_missing" },
    { id: "comparison", label: "Explains what changed in the relative case for each option", code: "failed_to_update" },
  ],
  {
    title: "Evidence-led update",
    text: "Cross-sell now appears stronger: the qualified installed base supports attractive contribution economics, while expansion's smaller reachable market, first-year loss, and competitive intensity weaken its near-term case.",
  },
);

const calculation = cycle(
  "paypilot-cross-sell-calculation",
  "strategic_quantitative_reasoning",
  "Explain the setup, unit, sense-check, and decision implication before entering the cross-sell contribution result.",
  [
    { id: "setup", label: "Multiplies eligible merchants, adoption, and contribution per subscriber", code: "setup_error" },
    { id: "unit", label: "States annual contribution dollars", code: "unit_error" },
    { id: "sense-check", label: "Checks the implied subscriber count and magnitude", code: "sense_check_missing" },
    { id: "implication", label: "Separates contribution from profit after launch investment", code: "business_implication_missing" },
  ],
  {
    title: "Reconciled contribution calculation",
    text: "8,000 × 25% × $900 = $1.8 million of annual contribution profit from 2,000 subscribers. After the $600,000 launch investment, first-year incremental profit is about $1.2 million.",
  },
);

const synthesis = cycle(
  "paypilot-synthesis",
  "strategic_synthesis",
  "Give an answer-first comparison of the two initiatives using decisive evidence and the remaining uncertainty.",
  [
    { id: "answer", label: "Leads with the stronger current option", code: "answer_not_first" },
    { id: "comparison", label: "Uses connected evidence from both initiatives", code: "evidence_unsupported" },
    { id: "uncertainty", label: "Names the uncertainty that should shape the next step", code: "next_step_missing" },
  ],
  {
    title: "Answer-first strategic comparison",
    text: "Cross-sell is the stronger next-year bet: it produces about $1.2 million of first-year incremental profit and may improve retention, while expansion loses about $350,000 and faces greater acquisition uncertainty. Validate adoption in a staged launch before scaling.",
  },
);

const recommendation = cycle(
  "paypilot-recommendation",
  "strategic_recommendation",
  "Recommend one initiative with supporting evidence, its most material risk, and a concrete next step.",
  [
    { id: "answer", label: "Starts with one clear initiative choice", code: "recommendation_not_answer_first" },
    { id: "support", label: "Uses evidence that distinguishes the alternatives", code: "support_insufficient" },
    { id: "risk", label: "Pairs a material risk with a measurable next step", code: "risk_missing" },
  ],
  {
    title: "Supported recommendation",
    text: "Prioritize a staged forecasting-module cross-sell and defer expansion. Cross-sell produces $1.2 million of first-year incremental profit versus a $350,000 expansion loss, with a possible retention benefit. Manage adoption risk through a measured merchant cohort before scaling.",
  },
);

const exhibitCycles = {
  "cross-sell-funnel": cycle(
    "paypilot-cross-sell-funnel",
    "installed_base_interpretation",
    "Interpret the funnel's strongest observation, business implication, and next test.",
    [
      { id: "observation", label: "Distinguishes eligible merchants from the full installed base", code: "comparison_missed" },
      { id: "implication", label: "Connects expected adoption to cross-sell scale", code: "implication_missing" },
      { id: "next", label: "Tests conversion or contribution economics next", code: "next_test_missing" },
    ],
    { title: "Installed-base opportunity", text: "Of 12,000 merchants, 8,000 qualify and 2,000 are expected to adopt, creating meaningful but bounded scale; validate contribution economics and adoption durability next." },
  ),
  "expansion-funnel": cycle(
    "paypilot-expansion-funnel",
    "market_funnel_interpretation",
    "Interpret the gap between headline market size and first-year reach, then name the next test.",
    [
      { id: "observation", label: "Separates total, reachable, and expected-win populations", code: "comparison_missed" },
      { id: "implication", label: "Explains the impact on first-year scale", code: "implication_missing" },
      { id: "next", label: "Tests entry economics or competitive conversion next", code: "next_test_missing" },
    ],
    { title: "Reachable-market constraint", text: "Only 6,000 of 30,000 merchants are reachable in year one and 1,500 are expected wins, so the headline market overstates near-term scale; test unit economics and entry cost next." },
  ),
  "initiative-economics": cycle(
    "paypilot-initiative-economics",
    "strategic_economics_interpretation",
    "Compare the initiatives' first-year economics and explain what the difference means for the decision.",
    [
      { id: "observation", label: "Compares contribution, investment, and incremental profit", code: "comparison_missed" },
      { id: "implication", label: "Explains the economic advantage of cross-sell", code: "implication_missing" },
      { id: "next", label: "Names the assumption most worth validating", code: "next_test_missing" },
    ],
    { title: "Direct economic comparison", text: "Cross-sell delivers $1.2 million of first-year incremental profit versus a $350,000 expansion loss, a $1.55 million advantage; pressure-test module adoption and delivery timing before committing." },
  ),
} as const;

const payPilotV2Content = {
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
      { id: "installed-base-cross-sell", label: "Use the installed base to cross-sell the forecasting module" },
      { id: "geographic-expansion", label: "Enter the neighboring market with the core payments product" },
    ],
    initial: initialHypothesis,
    update: hypothesisUpdate,
    contradictions: [
      {
        hypothesisId: "geographic-expansion",
        evidenceFactIds: ["expansion-net-profit", "competitive-intensity"],
      },
    ],
  },
  exhibits: v1.exhibits.map((exhibit) => ({
    ...exhibit,
    interpretation: exhibitCycles[exhibit.id as keyof typeof exhibitCycles],
  })),
  calculations: v1.calculations.map((item) => ({
    ...item,
    unitOptions: ["$", "$m", "$/merchant", "%"],
    responseCycle: calculation,
  })),
  synthesis: { responseCycle: synthesis },
  recommendation: { ...v1.recommendation, responseCycle: recommendation },
};

export default payPilotV2Content;
