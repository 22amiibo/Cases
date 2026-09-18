import v1 from "./goldenloaf-operations.json";

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
    scaffoldingLevel: "interview",
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
  "goldenloaf-opening",
  "operations_case_opening",
  "Open the case by framing the operational decision and the questions you need answered.",
  [
    { id: "objective", label: "Frames the service and capacity decision", code: "objective_not_reframed" },
    { id: "constraint", label: "Includes the facility-expansion constraint", code: "constraint_missed" },
    { id: "questions", label: "Selects questions that distinguish demand, capacity, and process", code: "low_value_question" },
  ],
  {
    title: "One focused opening",
    text: "Identify what reduced on-time fulfillment at the main bakery and restore service using process or targeted capacity changes before considering a major expansion. Clarify the service metric, network scope, and investment constraint.",
  },
);

const initialHypothesis = cycle(
  "goldenloaf-initial-hypothesis",
  "operations_hypothesis",
  "State your leading operational hypothesis and the evidence that would support or weaken it.",
  [
    { id: "claim", label: "Makes a testable claim about the service decline", code: "hypothesis_missing" },
    { id: "process-link", label: "Links demand or product mix to a process constraint", code: "hypothesis_not_linked" },
    { id: "test", label: "Names evidence that could change the claim", code: "evidence_link_missing" },
  ],
  {
    title: "Two plausible starting points",
    text: "Peak demand and the shift toward smaller premium batches may have outgrown effective capacity; or more specifically, product-driven oven changeovers may have made baking the binding process constraint.",
  },
);

const hypothesisUpdate = cycle(
  "goldenloaf-hypothesis-update",
  "operations_hypothesis_update",
  "Use revealed evidence to retain, revise, or reject your operational hypothesis.",
  [
    { id: "evidence", label: "Links the update to specific process evidence", code: "evidence_link_missing" },
    { id: "update", label: "Explains why the causal claim changed or held", code: "failed_to_update" },
  ],
  {
    title: "Evidence-led process update",
    text: "Baking is the binding constraint: it runs at 98% utilization with a queue before the ovens, while other stages retain capacity. The remaining question is what reduced effective oven throughput.",
  },
);

const synthesis = cycle(
  "goldenloaf-synthesis",
  "operations_synthesis",
  "State the current operational diagnosis, decisive evidence, and next action or test.",
  [
    { id: "answer", label: "Leads with the binding operational cause", code: "answer_not_first" },
    { id: "evidence", label: "Connects capacity, mix, and changeover evidence", code: "evidence_unsupported" },
    { id: "next", label: "Closes with a practical capacity response", code: "next_step_missing" },
  ],
  {
    title: "Answer-first process synthesis",
    text: "Frequent changeovers created by the premium small-batch mix have made baking the bottleneck. Sequencing recovers enough capacity for average demand without harming quality, while flexible peak hours close the remaining weekday gap.",
  },
);

const recommendation = cycle(
  "goldenloaf-recommendation",
  "operations_recommendation",
  "Recommend an operational response with evidence, a material risk, and a measurable next step.",
  [
    { id: "answer", label: "Starts with a specific operating recommendation", code: "recommendation_not_answer_first" },
    { id: "support", label: "Uses evidence that rules out unnecessary expansion", code: "support_insufficient" },
    { id: "risk", label: "Pairs quality or peak risk with a measured next step", code: "risk_missing" },
  ],
  {
    title: "Supported operating recommendation",
    text: "Group production by bake temperature and add flexible oven hours on peak weekdays before buying capacity. The pilot lifted oven capacity to 880 trays without reducing quality; track freshness, peak service, and team fatigue through a four-week rollout.",
  },
);

const exhibitCycles = {
  "stage-capacity": cycle(
    "goldenloaf-stage-capacity",
    "process_capacity_interpretation",
    "Interpret the process-capacity exhibit and state the next investigation.",
    [
      { id: "observation", label: "Identifies baking as the capacity and utilization outlier", code: "comparison_missed" },
      { id: "implication", label: "Explains the upstream queue and downstream idle time", code: "implication_missing" },
      { id: "next", label: "Investigates the loss of effective oven capacity", code: "next_test_missing" },
    ],
    { title: "Binding process constraint", text: "Baking is the binding constraint at 760 trays and 98% utilization, consistent with a queue before the ovens and idle packaging; investigate changeovers and lost oven time next." },
  ),
  "oven-changeovers": cycle(
    "goldenloaf-changeovers",
    "changeover_interpretation",
    "Interpret how the operating pattern changed and what the pilot proves.",
    [
      { id: "observation", label: "Links more changeovers to lost oven capacity", code: "comparison_missed" },
      { id: "implication", label: "Uses the pilot to distinguish scheduling from fixed equipment", code: "implication_missing" },
      { id: "next", label: "Tests quality and peak coverage before rollout", code: "next_test_missing" },
    ],
    { title: "Recoverable changeover loss", text: "Changeovers rose from 14 to 24 and capacity fell to 760 trays; temperature sequencing restored capacity to 880 without affecting quality, so validate peak coverage and operating risks before expansion." },
  ),
} as const;

const goldenLoafV2Content = {
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
      { id: "demand-mix-pressure", label: "Demand peaks and product mix have outgrown effective process capacity" },
      { id: "baking-changeover-constraint", label: "Oven changeovers have made baking the binding process constraint" },
    ],
    initial: initialHypothesis,
    update: hypothesisUpdate,
    contradictions: [
      {
        hypothesisId: "demand-mix-pressure",
        evidenceFactIds: ["oven-utilization", "queue-before-oven", "sequencing-pilot"],
      },
    ],
  },
  exhibits: v1.exhibits.map((exhibit) => ({
    ...exhibit,
    interpretation: exhibitCycles[exhibit.id as keyof typeof exhibitCycles],
  })),
  synthesis: { responseCycle: synthesis },
  recommendation: { ...v1.recommendation, responseCycle: recommendation },
};

export default goldenLoafV2Content;
