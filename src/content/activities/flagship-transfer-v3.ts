import { ActivityDefinitionSchema } from "@/core/activity";

const clarificationFeedback = { paths: [
  {
    id: "strong",
    classification: "strong" as const,
    diagnosticCodes: ["strong_opening"],
    explanation: "This question resolves an ambiguity that can change the first analysis.",
    principle: "Clarify the decision, metric, timing, or binding constraint before requesting detail.",
    nextAction: "Use the answer to sharpen the first branch or test.",
  },
  {
    id: "reasonable",
    classification: "reasonable" as const,
    diagnosticCodes: ["material_term_unresolved"],
    explanation: "This question is useful, but another unresolved term has more influence on the first analysis.",
    principle: "Ask the question with the greatest ability to change your approach.",
    nextAction: "Resolve the decision boundary or success metric first.",
  },
  {
    id: "weak",
    classification: "premature" as const,
    diagnosticCodes: ["low_value_question"],
    explanation: "This detail is unlikely to change the first structure or recommendation.",
    principle: "Defer details that do not change the immediate analysis.",
    nextAction: "Choose a question tied directly to the decision or constraint.",
  },
] };

const exhibitFeedback = { paths: [
  {
    id: "strong",
    classification: "strong" as const,
    diagnosticCodes: ["strong_exhibit_chain"],
    explanation: "You connected the decisive comparison to a supported implication and focused next test.",
    principle: "Keep observation, priority, implication, and action distinct.",
    nextAction: "Use the next analysis to test the implication rather than repeat the exhibit.",
  },
  {
    id: "reasonable",
    classification: "reasonable" as const,
    diagnosticCodes: ["next_test_missing"],
    explanation: "Your reading is supported, but one link in the chain could be more decision-focused.",
    principle: "Let the strongest comparison determine the next cut.",
    nextAction: "Choose the analysis most likely to confirm or overturn the implication.",
  },
  {
    id: "weak",
    classification: "unsupported" as const,
    diagnosticCodes: ["observation_error"],
    explanation: "At least one step goes beyond, misreads, or fails to act on the exhibit.",
    principle: "State only what the exhibit supports before inferring a cause.",
    nextAction: "Restart with a precise comparison, then build one supported implication.",
  },
] };

const brainstormFeedback = { paths: [
  {
    id: "strong",
    classification: "strong" as const,
    diagnosticCodes: ["strong_brainstorm"],
    explanation: "Your set covers distinct relevant drivers and identifies a useful priority.",
    principle: "Breadth comes from distinct categories, not a long list.",
    nextAction: "Test the prioritized idea with decision-relevant evidence.",
  },
  {
    id: "reasonable",
    classification: "reasonable" as const,
    diagnosticCodes: ["brainstorm_breadth_narrow"],
    explanation: "The ideas are relevant, but one major category is missing.",
    principle: "Check category coverage before adding detail within one bucket.",
    nextAction: "Add one distinct idea from the missing category.",
  },
  {
    id: "narrow",
    classification: "weak" as const,
    diagnosticCodes: ["brainstorm_breadth_narrow"],
    explanation: "The set stays inside one category and misses major alternatives.",
    principle: "Build across independent sources before prioritizing.",
    nextAction: "Add ideas from two other relevant categories.",
  },
  {
    id: "weak",
    classification: "weak" as const,
    diagnosticCodes: ["brainstorm_categories_overlap", "brainstorm_off_objective"],
    explanation: "The set includes overlap, a misplaced idea, or an item outside the objective.",
    principle: "Each selected idea should be relevant, distinct, and placed once.",
    nextAction: "Remove overlap and keep only ideas that could change the decision.",
  },
] };

const hypothesisFeedback = { paths: [
  {
    id: "strong",
    classification: "strong" as const,
    diagnosticCodes: ["strong_hypothesis_update"],
    explanation: "You changed the working claim when the evidence changed the balance.",
    principle: "A hypothesis focuses the next test and changes with evidence.",
    nextAction: "Use the revised claim to choose the next analysis.",
  },
  {
    id: "reasonable",
    classification: "reasonable" as const,
    diagnosticCodes: [],
    explanation: "Your claim remained consistent with the evidence revealed so far.",
    principle: "Retaining a hypothesis is valid when new evidence supports it.",
    nextAction: "Name the next fact that would disconfirm the claim.",
  },
  {
    id: "evidence-missing",
    classification: "unsupported" as const,
    diagnosticCodes: ["evidence_link_missing"],
    explanation: "The update did not use the evidence revealed in that round.",
    principle: "Link every update to the evidence that changed or supported the claim.",
    nextAction: "Use the revealed fact before deciding whether to retain or revise.",
  },
  {
    id: "weak",
    classification: "unsupported" as const,
    diagnosticCodes: ["contradicted_hypothesis_retained"],
    explanation: "The retained claim conflicts with the evidence you used.",
    principle: "Revise or reject a claim when contrary evidence changes the balance.",
    nextAction: "Choose the claim most consistent with the latest evidence.",
  },
] };

export const flagshipTransferActivitiesV3 = [
  ActivityDefinitionSchema.parse({
    id: "paypilot-clarifying-v3", contentVersion: 1, eventSchemaVersion: 3, scoringVersion: "v3", status: "active",
    title: "Clarify PayPilot's growth choice", labId: "clarifying", primarySkillId: "clarification", secondarySkillIds: [],
    difficulty: "intermediate", estimatedMinutes: 4, caseTypeIds: ["growth"], industryIds: ["saas"],
    interaction: {
      type: "single_select", interactionId: "paypilot-clarifying",
      prompt: "PayPilot can fund either a forecasting-module cross-sell or entry into a neighboring country. What should you clarify first?",
      options: [
        { id: "office-layout", label: "How is the product team's office arranged?", outcomeId: "weak" },
        { id: "decision-criteria", label: "Which outcomes and time horizon will determine the better initiative?", outcomeId: "strong" },
        { id: "brand-awareness", label: "What is PayPilot's unaided brand awareness?", outcomeId: "reasonable" },
        { id: "founder-history", label: "Why did the founders start PayPilot?", outcomeId: "weak" },
      ],
      outcomeIds: ["strong", "reasonable", "weak"],
    },
    feedback: clarificationFeedback,
    takeaway: "Clarify how the alternatives will be judged before comparing them.",
  }),
  ActivityDefinitionSchema.parse({
    id: "goldenloaf-clarifying-v3", contentVersion: 1, eventSchemaVersion: 3, scoringVersion: "v3", status: "active",
    title: "Clarify GoldenLoaf's service problem", labId: "clarifying", primarySkillId: "clarification", secondarySkillIds: [],
    difficulty: "intermediate", estimatedMinutes: 4, caseTypeIds: ["operations"], industryIds: ["restaurants"],
    interaction: {
      type: "single_select", interactionId: "goldenloaf-clarifying",
      prompt: "GoldenLoaf wants to restore service without expanding its facility. What should you clarify first?",
      options: [
        { id: "menu-font", label: "When was the menu font last updated?", outcomeId: "weak" },
        { id: "competitor-count", label: "How many bakeries operate nationally?", outcomeId: "reasonable" },
        { id: "service-measure", label: "Which service measure declined, over what period, and where?", outcomeId: "strong" },
        { id: "supplier-bios", label: "Who founded each ingredient supplier?", outcomeId: "weak" },
      ],
      outcomeIds: ["strong", "reasonable", "weak"],
    },
    feedback: clarificationFeedback,
    takeaway: "Define the service gap and operating boundary before diagnosing the process.",
  }),
  ActivityDefinitionSchema.parse({
    id: "paypilot-exhibit-v3", contentVersion: 1, eventSchemaVersion: 3, scoringVersion: "v3", status: "active",
    title: "Turn PayPilot economics into a next test", labId: "exhibit", primarySkillId: "exhibit", secondarySkillIds: ["prioritization"],
    difficulty: "intermediate", estimatedMinutes: 8, caseTypeIds: ["growth"], industryIds: ["saas"],
    interaction: {
      type: "exhibit_chain", interactionId: "paypilot-economics-chain", prompt: "Separate the economic comparison from its implication and next test.",
      caseId: "paypilot-growth", caseContentVersion: 2, exhibitId: "initiative-economics",
      observationOptions: [
        { id: "investment-only", label: "Geographic expansion requires $0.8m more fixed investment", outcomeId: "reasonable" },
        { id: "cross-sell-profit", label: "Cross-sell produces $1.2m incremental profit while expansion loses $0.35m", outcomeId: "strong" },
        { id: "expansion-contribution", label: "Expansion has the larger contribution profit", outcomeId: "weak" },
        { id: "cross-sell-cause", label: "Cross-sell wins because existing merchants trust PayPilot", outcomeId: "weak" },
      ],
      priorityOptions: [
        { id: "execution-priority", label: "Prioritize explaining the implementation process", outcomeId: "weak" },
        { id: "profit-gap-priority", label: "Prioritize the $1.55m incremental-profit gap", outcomeId: "strong" },
        { id: "investment-priority", label: "Prioritize fixed investment without considering contribution", outcomeId: "reasonable" },
      ],
      interpretationOptions: [
        { id: "cross-sell-current", label: "Cross-sell has the stronger first-year economic case, subject to its assumptions", outcomeId: "strong" },
        { id: "cross-sell-certain", label: "The exhibit proves cross-sell will succeed strategically", outcomeId: "weak" },
        { id: "expansion-long-term", label: "Expansion may still have long-term value not shown here", outcomeId: "reasonable" },
      ],
      actionOptions: [
        { id: "launch-now", label: "Launch cross-sell immediately in every market", outcomeId: "weak" },
        { id: "validate-assumptions", label: "Test cross-sell adoption and contribution assumptions", outcomeId: "strong" },
        { id: "repeat-math", label: "Recalculate the displayed totals without new evidence", outcomeId: "reasonable" },
      ],
      outcomeIds: ["strong", "reasonable", "weak"],
    },
    feedback: exhibitFeedback,
    takeaway: "A strong exhibit read separates the comparison from what still needs validation.",
  }),
  ActivityDefinitionSchema.parse({
    id: "goldenloaf-exhibit-v3", contentVersion: 1, eventSchemaVersion: 3, scoringVersion: "v3", status: "active",
    title: "Find GoldenLoaf's operating constraint", labId: "exhibit", primarySkillId: "exhibit", secondarySkillIds: ["prioritization"],
    difficulty: "intermediate", estimatedMinutes: 8, caseTypeIds: ["operations"], industryIds: ["restaurants"],
    interaction: {
      type: "exhibit_chain", interactionId: "goldenloaf-capacity-chain", prompt: "Use the capacity comparison to identify the constraint and next analysis.",
      caseId: "goldenloaf-operations", caseContentVersion: 2, exhibitId: "stage-capacity",
      observationOptions: [
        { id: "all-busy", label: "All four stages operate at roughly the same utilization", outcomeId: "weak" },
        { id: "baking-outlier", label: "Baking has the lowest capacity and highest utilization", outcomeId: "strong" },
        { id: "mixing-capacity", label: "Mixing has the highest stated capacity", outcomeId: "reasonable" },
        { id: "demand-cause", label: "Demand growth caused the baking constraint", outcomeId: "weak" },
      ],
      priorityOptions: [
        { id: "packaging-priority", label: "Prioritize packaging because it is last in the process", outcomeId: "weak" },
        { id: "all-stage-priority", label: "Study every stage equally before narrowing", outcomeId: "reasonable" },
        { id: "baking-priority", label: "Prioritize baking as the likely bottleneck", outcomeId: "strong" },
      ],
      interpretationOptions: [
        { id: "facility-proof", label: "The exhibit proves a new facility is required", outcomeId: "weak" },
        { id: "baking-constrains", label: "Baking likely constrains system throughput while other stages retain capacity", outcomeId: "strong" },
        { id: "mixing-unused", label: "Unused mixing capacity is the main service problem", outcomeId: "reasonable" },
      ],
      actionOptions: [
        { id: "buy-oven", label: "Buy another oven immediately", outcomeId: "weak" },
        { id: "study-all", label: "Run a broad review of every production stage", outcomeId: "reasonable" },
        { id: "test-baking-loss", label: "Break down lost baking capacity by downtime and changeovers", outcomeId: "strong" },
      ],
      outcomeIds: ["strong", "reasonable", "weak"],
    },
    feedback: exhibitFeedback,
    takeaway: "Identify the system constraint before choosing a capacity response.",
  }),
  ActivityDefinitionSchema.parse({
    id: "paypilot-brainstorming-v3", contentVersion: 1, eventSchemaVersion: 3, scoringVersion: "v3", status: "active",
    title: "Build tests for PayPilot's growth options", labId: "brainstorming", primarySkillId: "brainstorming", secondarySkillIds: ["prioritization"],
    difficulty: "intermediate", estimatedMinutes: 7, caseTypeIds: ["growth"], industryIds: ["saas"],
    interaction: {
      type: "brainstorm_builder", interactionId: "paypilot-growth-drivers", prompt: "Choose distinct factors that could change the initiative decision, organize them, and prioritize the best tests.",
      categories: [{ id: "economics", label: "Economics" }, { id: "customer", label: "Customer adoption" }, { id: "execution", label: "Execution risk" }],
      ideas: [
        { id: "profit", label: "Incremental profit after investment", categoryIds: ["economics"], relevant: true, redundantWithIds: ["roi"] },
        { id: "roi", label: "Return after launch investment", categoryIds: ["economics"], relevant: true, redundantWithIds: ["profit"] },
        { id: "adoption", label: "Eligible-merchant adoption", categoryIds: ["customer"], relevant: true, redundantWithIds: [] },
        { id: "retention", label: "Effect on merchant retention", categoryIds: ["customer"], relevant: true, redundantWithIds: [] },
        { id: "localization", label: "Localization and regulatory effort", categoryIds: ["execution"], relevant: true, redundantWithIds: [] },
        { id: "sales-capacity", label: "Sales and support capacity", categoryIds: ["execution"], relevant: true, redundantWithIds: [] },
        { id: "logo", label: "Logo redesign preference", categoryIds: ["customer"], relevant: false, redundantWithIds: [] },
      ],
      minimumCategoryCoverage: 3, maximumPriorityIdeas: 2, outcomeIds: ["strong", "reasonable", "narrow", "weak"],
    },
    feedback: brainstormFeedback,
    takeaway: "Compare growth options across economics, adoption, and execution before choosing a lead.",
  }),
  ActivityDefinitionSchema.parse({
    id: "goldenloaf-brainstorming-v3", contentVersion: 1, eventSchemaVersion: 3, scoringVersion: "v3", status: "active",
    title: "Map GoldenLoaf's service-loss drivers", labId: "brainstorming", primarySkillId: "brainstorming", secondarySkillIds: ["prioritization"],
    difficulty: "intermediate", estimatedMinutes: 7, caseTypeIds: ["operations"], industryIds: ["restaurants"],
    interaction: {
      type: "brainstorm_builder", interactionId: "goldenloaf-service-drivers", prompt: "Choose distinct drivers of the service decline, organize them, and prioritize the strongest tests.",
      categories: [{ id: "demand", label: "Demand and mix" }, { id: "capacity", label: "Capacity and flow" }, { id: "people", label: "People and process" }],
      ideas: [
        { id: "peak-demand", label: "Higher peak-hour demand", categoryIds: ["demand"], relevant: true, redundantWithIds: [] },
        { id: "product-mix", label: "More complex product mix", categoryIds: ["demand"], relevant: true, redundantWithIds: [] },
        { id: "bottleneck", label: "A binding production-stage bottleneck", categoryIds: ["capacity"], relevant: true, redundantWithIds: ["low-throughput"] },
        { id: "low-throughput", label: "Insufficient throughput at one stage", categoryIds: ["capacity"], relevant: true, redundantWithIds: ["bottleneck"] },
        { id: "changeovers", label: "Longer or more frequent changeovers", categoryIds: ["people"], relevant: true, redundantWithIds: [] },
        { id: "staffing", label: "Staffing gaps or training variation", categoryIds: ["people"], relevant: true, redundantWithIds: [] },
        { id: "packaging-color", label: "Seasonal packaging color", categoryIds: ["demand"], relevant: false, redundantWithIds: [] },
      ],
      minimumCategoryCoverage: 3, maximumPriorityIdeas: 2, outcomeIds: ["strong", "reasonable", "narrow", "weak"],
    },
    feedback: brainstormFeedback,
    takeaway: "Cover demand, flow, and process causes before narrowing to the likely constraint.",
  }),
  ActivityDefinitionSchema.parse({
    id: "paypilot-hypothesis-v3", contentVersion: 1, eventSchemaVersion: 3, scoringVersion: "v3", status: "active",
    title: "Update PayPilot's growth hypothesis", labId: "hypothesis", primarySkillId: "hypothesis", secondarySkillIds: [],
    difficulty: "intermediate", estimatedMinutes: 8, caseTypeIds: ["growth"], industryIds: ["saas"],
    interaction: {
      type: "hypothesis_sequence", interactionId: "paypilot-hypothesis", prompt: "Which initiative currently appears more attractive, and why?",
      hypotheses: [
        { id: "expansion", label: "Geographic expansion offers the stronger near-term growth path" },
        { id: "cross-sell", label: "Installed-base cross-sell offers the stronger near-term growth path" },
      ],
      evidenceSteps: [
        { id: "reachable-scale", evidenceId: "reachable-scale", text: "Expected first-year wins are 1,500 for expansion versus 2,000 forecasting-module subscribers.", contradictedHypothesisIds: ["expansion"] },
        { id: "incremental-profit", evidenceId: "incremental-profit", text: "Cross-sell produces $1.2m incremental profit; expansion produces a $0.35m loss.", contradictedHypothesisIds: ["expansion"] },
      ],
      outcomeIds: ["strong", "reasonable", "evidence-missing", "weak"],
    },
    feedback: hypothesisFeedback,
    takeaway: "Update the preferred initiative when comparative evidence changes the case.",
  }),
  ActivityDefinitionSchema.parse({
    id: "goldenloaf-hypothesis-v3", contentVersion: 1, eventSchemaVersion: 3, scoringVersion: "v3", status: "active",
    title: "Update GoldenLoaf's constraint hypothesis", labId: "hypothesis", primarySkillId: "hypothesis", secondarySkillIds: [],
    difficulty: "intermediate", estimatedMinutes: 8, caseTypeIds: ["operations"], industryIds: ["restaurants"],
    interaction: {
      type: "hypothesis_sequence", interactionId: "goldenloaf-hypothesis", prompt: "What is the strongest starting explanation for GoldenLoaf's service decline?",
      hypotheses: [
        { id: "demand-overload", label: "Total demand has exceeded facility-wide capacity" },
        { id: "baking-constraint", label: "Baking has become the binding constraint because changeovers reduce effective capacity" },
      ],
      evidenceSteps: [
        { id: "stage-capacity", evidenceId: "stage-capacity", text: "Baking runs at 98% utilization and 760 trays per day; every other stage has at least 1,050 trays per day of capacity.", contradictedHypothesisIds: ["demand-overload"] },
        { id: "sequencing-pilot", evidenceId: "sequencing-pilot", text: "A sequencing pilot reduced changeovers from 24 to 15 and restored oven capacity from 760 to 880 trays per day.", contradictedHypothesisIds: ["demand-overload"] },
      ],
      outcomeIds: ["strong", "reasonable", "evidence-missing", "weak"],
    },
    feedback: hypothesisFeedback,
    takeaway: "Revise a broad capacity claim when process evidence isolates the constraint.",
  }),
];
