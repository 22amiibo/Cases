import { z } from "zod";
import {
  CommittedResponseSchema,
  GeneratedResponseDefinitionSchema,
  IdentifierSchema,
  RubricOutcomeSchema,
} from "./schema";
import {
  CaseTypeIdSchema,
  DifficultySchema,
  IndustryIdSchema,
  SkillLabIdSchema,
  V3SkillIdSchema,
} from "./v3-taxonomy";
import { getV3DiagnosticDefinition } from "./v3-diagnostics";

const uniqueIds = (
  values: readonly string[],
  context: z.RefinementCtx,
  path: PropertyKey[],
) => {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message: "IDs must be unique", path });
  }
};

const ClassificationSchema = z.enum([
  "strong",
  "reasonable",
  "weak",
  "premature",
  "unsupported",
  "redundant",
]);

const OutcomeIdsSchema = z.array(IdentifierSchema).min(1);
const ChoiceSchema = z.object({
  id: IdentifierSchema,
  label: z.string().min(1),
  outcomeId: IdentifierSchema,
});
const RankedItemSchema = z.object({ id: IdentifierSchema, label: z.string().min(1) });

const SelectInteractionSchema = z.object({
  type: z.enum(["single_select", "multi_select"]),
  interactionId: IdentifierSchema,
  prompt: z.string().min(1),
  options: z.array(ChoiceSchema).min(2),
  outcomeIds: OutcomeIdsSchema,
}).superRefine((interaction, context) => {
  uniqueIds(interaction.options.map(({ id }) => id), context, ["options"]);
  uniqueIds(interaction.outcomeIds, context, ["outcomeIds"]);
  const outcomes = new Set(interaction.outcomeIds);
  interaction.options.forEach((option, index) => {
    if (!outcomes.has(option.outcomeId)) {
      context.addIssue({
        code: "custom",
        message: "Option references an unknown outcome",
        path: ["options", index, "outcomeId"],
      });
    }
  });
});

const RankingInteractionSchema = z.object({
  type: z.literal("ranking"),
  interactionId: IdentifierSchema,
  prompt: z.string().min(1),
  items: z.array(RankedItemSchema).min(2),
  strongOrder: z.array(IdentifierSchema).min(2),
  outcomeIds: OutcomeIdsSchema,
}).superRefine((interaction, context) => {
  const itemIds = interaction.items.map(({ id }) => id);
  uniqueIds(itemIds, context, ["items"]);
  uniqueIds(interaction.strongOrder, context, ["strongOrder"]);
  uniqueIds(interaction.outcomeIds, context, ["outcomeIds"]);
  if (
    itemIds.length !== interaction.strongOrder.length ||
    interaction.strongOrder.some((id) => !itemIds.includes(id))
  ) {
    context.addIssue({
      code: "custom",
      message: "Strong order must reference every ranked item exactly once",
      path: ["strongOrder"],
    });
  }
});

const CategorizationInteractionSchema = z.object({
  type: z.literal("categorization"),
  interactionId: IdentifierSchema,
  prompt: z.string().min(1),
  categories: z.array(RankedItemSchema).min(2),
  items: z.array(RankedItemSchema.extend({
    acceptedCategoryIds: z.array(IdentifierSchema).min(1),
  })).min(1),
  outcomeIds: OutcomeIdsSchema,
}).superRefine((interaction, context) => {
  const categoryIds = interaction.categories.map(({ id }) => id);
  uniqueIds(categoryIds, context, ["categories"]);
  uniqueIds(interaction.items.map(({ id }) => id), context, ["items"]);
  uniqueIds(interaction.outcomeIds, context, ["outcomeIds"]);
  interaction.items.forEach((item, itemIndex) => {
    uniqueIds(item.acceptedCategoryIds, context, ["items", itemIndex, "acceptedCategoryIds"]);
    item.acceptedCategoryIds.forEach((categoryId) => {
      if (!categoryIds.includes(categoryId)) {
        context.addIssue({
          code: "custom",
          message: "Item references an unknown category",
          path: ["items", itemIndex, "acceptedCategoryIds"],
        });
      }
    });
  });
});

const GeneratedResponseInteractionSchema = z.object({
  type: z.literal("generated_response"),
  interactionId: IdentifierSchema,
  responseCycle: GeneratedResponseDefinitionSchema,
  outcomeIds: OutcomeIdsSchema,
}).superRefine((interaction, context) => {
  uniqueIds(interaction.outcomeIds, context, ["outcomeIds"]);
  uniqueIds(
    interaction.responseCycle.criteria.map(({ id }) => id),
    context,
    ["responseCycle", "criteria"],
  );
  if (interaction.responseCycle.interactionId !== interaction.interactionId) {
    context.addIssue({
      code: "custom",
      message: "Response cycle must use the interaction ID",
      path: ["responseCycle", "interactionId"],
    });
  }
});

const BrainstormInteractionSchema = z.object({
  type: z.literal("brainstorm_builder"),
  interactionId: IdentifierSchema,
  prompt: z.string().min(1),
  categories: z.array(RankedItemSchema).min(2),
  ideas: z.array(RankedItemSchema.extend({
    categoryIds: z.array(IdentifierSchema).min(1),
  })).min(2),
  minimumCategoryCoverage: z.number().int().positive(),
  maximumPriorityIdeas: z.number().int().positive(),
  outcomeIds: OutcomeIdsSchema,
}).superRefine((interaction, context) => {
  const categoryIds = interaction.categories.map(({ id }) => id);
  uniqueIds(categoryIds, context, ["categories"]);
  uniqueIds(interaction.ideas.map(({ id }) => id), context, ["ideas"]);
  uniqueIds(interaction.outcomeIds, context, ["outcomeIds"]);
  interaction.ideas.forEach((idea, index) => idea.categoryIds.forEach((categoryId) => {
    if (!categoryIds.includes(categoryId)) {
      context.addIssue({
        code: "custom",
        message: "Idea references an unknown category",
        path: ["ideas", index, "categoryIds"],
      });
    }
  }));
  if (interaction.minimumCategoryCoverage > categoryIds.length) {
    context.addIssue({
      code: "custom",
      message: "Minimum coverage exceeds available categories",
      path: ["minimumCategoryCoverage"],
    });
  }
});

const HypothesisInteractionSchema = z.object({
  type: z.literal("hypothesis_sequence"),
  interactionId: IdentifierSchema,
  prompt: z.string().min(1),
  hypotheses: z.array(RankedItemSchema).min(2),
  evidenceSteps: z.array(z.object({
    id: IdentifierSchema,
    evidenceId: IdentifierSchema,
    text: z.string().min(1),
    contradictedHypothesisIds: z.array(IdentifierSchema),
  })).min(2),
  outcomeIds: OutcomeIdsSchema,
}).superRefine((interaction, context) => {
  const hypothesisIds = interaction.hypotheses.map(({ id }) => id);
  uniqueIds(hypothesisIds, context, ["hypotheses"]);
  uniqueIds(interaction.evidenceSteps.map(({ id }) => id), context, ["evidenceSteps"]);
  uniqueIds(interaction.outcomeIds, context, ["outcomeIds"]);
  interaction.evidenceSteps.forEach((step, index) => {
    step.contradictedHypothesisIds.forEach((id) => {
      if (!hypothesisIds.includes(id)) {
        context.addIssue({
          code: "custom",
          message: "Evidence references an unknown hypothesis",
          path: ["evidenceSteps", index, "contradictedHypothesisIds"],
        });
      }
    });
  });
});

const ExhibitInteractionSchema = z.object({
  type: z.literal("exhibit_chain"),
  interactionId: IdentifierSchema,
  prompt: z.string().min(1),
  caseId: IdentifierSchema,
  caseContentVersion: z.number().int().positive(),
  exhibitId: IdentifierSchema,
  observationOptions: z.array(ChoiceSchema).min(2),
  actionOptions: z.array(ChoiceSchema).min(2),
  outcomeIds: OutcomeIdsSchema,
}).superRefine((interaction, context) => {
  const outcomeIds = new Set(interaction.outcomeIds);
  for (const field of ["observationOptions", "actionOptions"] as const) {
    uniqueIds(interaction[field].map(({ id }) => id), context, [field]);
    interaction[field].forEach((option, index) => {
      if (!outcomeIds.has(option.outcomeId)) {
        context.addIssue({
          code: "custom",
          message: "Option references an unknown outcome",
          path: [field, index, "outcomeId"],
        });
      }
    });
  }
  uniqueIds(interaction.outcomeIds, context, ["outcomeIds"]);
});

export const ActivityInteractionSchema = z.union([
  SelectInteractionSchema,
  RankingInteractionSchema,
  CategorizationInteractionSchema,
  GeneratedResponseInteractionSchema,
  BrainstormInteractionSchema,
  HypothesisInteractionSchema,
  ExhibitInteractionSchema,
]);

export const ActivityFeedbackDefinitionSchema = z.object({
  paths: z.array(z.object({
    id: IdentifierSchema,
    classification: ClassificationSchema,
    diagnosticCodes: z.array(IdentifierSchema),
    explanation: z.string().min(1),
    principle: z.string().min(1),
    nextAction: z.string().min(1),
  })).min(1),
});

export const ActivityDefinitionSchema = z.object({
  id: IdentifierSchema,
  contentVersion: z.number().int().positive(),
  eventSchemaVersion: z.literal(3),
  scoringVersion: z.literal("v3"),
  status: z.enum(["draft", "active", "retired"]),
  title: z.string().min(1),
  labId: SkillLabIdSchema,
  primarySkillId: V3SkillIdSchema,
  secondarySkillIds: z.array(V3SkillIdSchema),
  difficulty: DifficultySchema,
  estimatedMinutes: z.number().int().positive(),
  caseTypeIds: z.array(CaseTypeIdSchema),
  industryIds: z.array(IndustryIdSchema),
  interaction: ActivityInteractionSchema,
  feedback: ActivityFeedbackDefinitionSchema,
  takeaway: z.string().min(1),
}).superRefine((activity, context) => {
  uniqueIds(activity.secondarySkillIds, context, ["secondarySkillIds"]);
  uniqueIds(activity.caseTypeIds, context, ["caseTypeIds"]);
  uniqueIds(activity.industryIds, context, ["industryIds"]);
  uniqueIds(activity.feedback.paths.map(({ id }) => id), context, ["feedback", "paths"]);
  if (activity.secondarySkillIds.includes(activity.primarySkillId)) {
    context.addIssue({
      code: "custom",
      message: "Primary skill cannot also be secondary",
      path: ["secondarySkillIds"],
    });
  }
  const outcomes = [...activity.interaction.outcomeIds].sort();
  const feedbackPaths = activity.feedback.paths.map(({ id }) => id).sort();
  if (JSON.stringify(outcomes) !== JSON.stringify(feedbackPaths)) {
    context.addIssue({
      code: "custom",
      message: "Feedback paths must exactly cover legal outcomes",
      path: ["feedback", "paths"],
    });
  }
});

const TimedActivityEventSchema = z.object({
  eventId: IdentifierSchema,
  atMs: z.number().int().nonnegative(),
});

export const ActivityEventSchema = z.union([
  TimedActivityEventSchema.extend({ type: z.literal("activity_started") }),
  TimedActivityEventSchema.extend({
    type: z.literal("selection_committed"),
    interactionId: IdentifierSchema,
    selectedIds: z.array(IdentifierSchema).min(1),
  }),
  TimedActivityEventSchema.extend({
    type: z.literal("ranking_committed"),
    interactionId: IdentifierSchema,
    orderedIds: z.array(IdentifierSchema).min(2),
  }),
  TimedActivityEventSchema.extend({
    type: z.literal("categorization_committed"),
    interactionId: IdentifierSchema,
    placements: z.array(z.object({
      itemId: IdentifierSchema,
      categoryId: IdentifierSchema,
    })).min(1),
  }),
  TimedActivityEventSchema.extend({
    type: z.literal("generated_response_committed"),
    interactionId: IdentifierSchema,
    response: CommittedResponseSchema,
  }),
  TimedActivityEventSchema.extend({
    type: z.literal("brainstorm_committed"),
    interactionId: IdentifierSchema,
    placements: z.array(z.object({
      ideaId: IdentifierSchema,
      categoryId: IdentifierSchema,
    })).min(1),
    priorityIdeaIds: z.array(IdentifierSchema).min(1),
  }),
  TimedActivityEventSchema.extend({
    type: z.literal("hypothesis_committed"),
    interactionId: IdentifierSchema,
    stepId: IdentifierSchema,
    status: z.enum(["form", "retain", "revise", "reject"]),
    hypothesisId: IdentifierSchema.nullable(),
    evidenceIds: z.array(IdentifierSchema),
    rationale: z.string().trim().min(1).max(10_000),
  }),
  TimedActivityEventSchema.extend({
    type: z.literal("exhibit_committed"),
    interactionId: IdentifierSchema,
    stage: z.enum(["observe", "prioritize", "interpret", "act"]),
    selectedIds: z.array(IdentifierSchema),
    response: z.string().trim().min(1).max(10_000).optional(),
  }),
  TimedActivityEventSchema.extend({
    type: z.literal("self_check_committed"),
    interactionId: IdentifierSchema,
    outcomes: z.array(RubricOutcomeSchema),
  }),
  TimedActivityEventSchema.extend({
    type: z.literal("authored_comparison_viewed"),
    interactionId: IdentifierSchema,
  }),
  TimedActivityEventSchema.extend({
    type: z.literal("retry_decided"),
    interactionId: IdentifierSchema,
    decision: z.enum(["retry", "continue"]),
  }),
  TimedActivityEventSchema.extend({ type: z.literal("takeaway_viewed") }),
  TimedActivityEventSchema.extend({ type: z.literal("activity_completed") }),
]);

export const CourseContextSchema = z.object({
  courseId: IdentifierSchema,
  courseVersion: z.number().int().positive(),
  courseStepId: IdentifierSchema,
});

export const V3DiagnosticOutcomeSchema = z.object({
  code: IdentifierSchema,
  skillId: V3SkillIdSchema,
  source: z.enum(["system", "self_assessment"]),
  severity: z.enum(["strength", "coaching", "blocking"]),
});

export const V3SkillEvidenceSchema = z.object({
  skillId: V3SkillIdSchema,
  source: z.enum(["activity", "case"]),
  contextId: IdentifierSchema,
  difficulty: DifficultySchema,
  reviewed: z.boolean(),
  retryOrTransfer: z.boolean(),
  objectiveChecks: z.array(z.object({ id: IdentifierSchema, passed: z.boolean() })),
  diagnosticCodes: z.array(IdentifierSchema),
});

export const ActivityAttemptSchema = z.object({
  attemptId: IdentifierSchema,
  userId: z.string().min(1),
  activityId: IdentifierSchema,
  contentVersion: z.number().int().positive(),
  eventSchemaVersion: z.literal(3),
  scoringVersion: z.literal("v3"),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime(),
  primarySkillId: V3SkillIdSchema,
  skillEvidence: z.array(V3SkillEvidenceSchema),
  diagnostics: z.array(V3DiagnosticOutcomeSchema),
  courseContext: CourseContextSchema.nullable(),
  events: z.array(ActivityEventSchema),
}).superRefine((attempt, context) => {
  uniqueIds(attempt.events.map(({ eventId }) => eventId), context, ["events"]);
  if (attempt.completedAt < attempt.startedAt) {
    context.addIssue({
      code: "custom",
      message: "Completion cannot precede start",
      path: ["completedAt"],
    });
  }
});

export type ActivityDefinition = z.infer<typeof ActivityDefinitionSchema>;
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export type ActivityAttempt = z.infer<typeof ActivityAttemptSchema>;
export type CourseContext = z.infer<typeof CourseContextSchema>;
export type V3DiagnosticOutcome = z.infer<typeof V3DiagnosticOutcomeSchema>;
export type V3SkillEvidence = z.infer<typeof V3SkillEvidenceSchema>;

export type ActivityPhase =
  | "context"
  | "interaction"
  | "feedback"
  | "takeaway"
  | "complete";

export type ActivityState = {
  activityId: string;
  contentVersion: number;
  phase: ActivityPhase;
  reviewStep: "self_check" | "comparison" | "decision" | null;
  outcomeId: string | null;
  takeawayViewed: boolean;
  events: ActivityEvent[];
};

export function createActivityState(
  definition: ActivityDefinition,
): ActivityState {
  return {
    activityId: definition.id,
    contentVersion: definition.contentVersion,
    phase: "context",
    reviewStep: null,
    outcomeId: null,
    takeawayViewed: false,
    events: [],
  };
}

function fail(event: ActivityEvent, state: ActivityState): never {
  throw new Error(`${event.type} is not legal during ${state.phase}`);
}

function commitType(interaction: ActivityDefinition["interaction"]) {
  switch (interaction.type) {
    case "single_select":
    case "multi_select":
      return "selection_committed";
    case "ranking":
      return "ranking_committed";
    case "categorization":
      return "categorization_committed";
    case "generated_response":
      return "generated_response_committed";
    case "brainstorm_builder":
      return "brainstorm_committed";
    case "hypothesis_sequence":
      return "hypothesis_committed";
    case "exhibit_chain":
      return "exhibit_committed";
  }
}

function weakestOutcome(
  outcomeIds: string[],
  selectedOutcomeIds: string[],
) {
  const indexes = selectedOutcomeIds.map((id) => outcomeIds.indexOf(id));
  if (indexes.some((index) => index < 0)) {
    throw new Error("Interaction result references an unknown outcome");
  }
  return outcomeIds[Math.max(...indexes)];
}

function previousCommits(state: ActivityState, type: ActivityEvent["type"]) {
  return state.events.filter((event) => event.type === type);
}

function evaluateCommit(
  definition: ActivityDefinition,
  state: ActivityState,
  event: ActivityEvent,
): Pick<ActivityState, "phase" | "reviewStep" | "outcomeId"> {
  const { interaction } = definition;
  if (event.type !== commitType(interaction)) {
    throw new Error(
      `${event.type} cannot commit a ${interaction.type} interaction`,
    );
  }
  if (!("interactionId" in event) || event.interactionId !== interaction.interactionId) {
    throw new Error("Activity event belongs to a different interaction");
  }

  if (
    (interaction.type === "single_select" || interaction.type === "multi_select") &&
    event.type === "selection_committed"
  ) {
    if (interaction.type === "single_select" && event.selectedIds.length !== 1) {
      throw new Error("Single select requires exactly one choice");
    }
    const selected = event.selectedIds.map((id) => {
      const option = interaction.options.find((candidate) => candidate.id === id);
      if (!option) throw new Error(`Unknown selection: ${id}`);
      return option.outcomeId;
    });
    return {
      phase: "feedback",
      reviewStep: "decision",
      outcomeId: weakestOutcome(interaction.outcomeIds, selected),
    };
  }

  if (interaction.type === "ranking" && event.type === "ranking_committed") {
    if (
      event.orderedIds.length !== interaction.items.length ||
      new Set(event.orderedIds).size !== event.orderedIds.length ||
      event.orderedIds.some((id) => !interaction.items.some((item) => item.id === id))
    ) throw new Error("Ranking must contain every item exactly once");
    return {
      phase: "feedback",
      reviewStep: "decision",
      outcomeId: event.orderedIds.every((id, index) => id === interaction.strongOrder[index])
        ? interaction.outcomeIds[0]
        : interaction.outcomeIds.at(-1)!,
    };
  }

  if (
    interaction.type === "categorization" &&
    event.type === "categorization_committed"
  ) {
    const placements = new Map(event.placements.map((placement) => [placement.itemId, placement.categoryId]));
    const strong = interaction.items.every((item) =>
      item.acceptedCategoryIds.includes(placements.get(item.id) ?? ""),
    );
    return {
      phase: "feedback",
      reviewStep: "decision",
      outcomeId: strong ? interaction.outcomeIds[0] : interaction.outcomeIds.at(-1)!,
    };
  }

  if (
    interaction.type === "generated_response" &&
    event.type === "generated_response_committed"
  ) {
    const priorResponses = previousCommits(state, "generated_response_committed")
      .map((candidate) => candidate.type === "generated_response_committed"
        ? candidate.response
        : null)
      .filter((response) => response !== null);
    const previous = priorResponses.at(-1);
    const expectedRevision = priorResponses.length + 1;
    if (
      event.response.revision !== expectedRevision ||
      event.response.revisionOf !== (previous?.responseId ?? null)
    ) throw new Error("Generated revision must link to the preceding response");
    return { phase: "feedback", reviewStep: "self_check", outcomeId: null };
  }

  if (
    interaction.type === "brainstorm_builder" &&
    event.type === "brainstorm_committed"
  ) {
    const categories = new Set(event.placements.map(({ categoryId }) => categoryId));
    const knownIdeas = new Set(interaction.ideas.map(({ id }) => id));
    const strong =
      categories.size >= interaction.minimumCategoryCoverage &&
      event.priorityIdeaIds.length <= interaction.maximumPriorityIdeas &&
      event.priorityIdeaIds.every((id) => knownIdeas.has(id));
    return {
      phase: "feedback",
      reviewStep: "decision",
      outcomeId: strong ? interaction.outcomeIds[0] : interaction.outcomeIds.at(-1)!,
    };
  }

  if (
    interaction.type === "hypothesis_sequence" &&
    event.type === "hypothesis_committed"
  ) {
    const prior = previousCommits(state, "hypothesis_committed");
    const hypothesisIds = new Set(interaction.hypotheses.map(({ id }) => id));
    if (prior.length === 0) {
      if (
        event.status !== "form" ||
        !event.hypothesisId ||
        !hypothesisIds.has(event.hypothesisId) ||
        event.evidenceIds.length > 0
      ) throw new Error("Initial hypothesis event is invalid");
      return { phase: "interaction", reviewStep: null, outcomeId: null };
    }
    const step = interaction.evidenceSteps[prior.length - 1];
    if (
      !step ||
      event.status === "form" ||
      event.stepId !== step.id ||
      !event.evidenceIds.includes(step.evidenceId) ||
      (event.status === "reject" ? event.hypothesisId !== null : !event.hypothesisId)
    ) throw new Error("Hypothesis update does not match the revealed evidence step");
    const contradicted = event.hypothesisId
      ? step.contradictedHypothesisIds.includes(event.hypothesisId)
      : false;
    const isFinal = prior.length === interaction.evidenceSteps.length;
    return {
      phase: isFinal ? "feedback" : "interaction",
      reviewStep: isFinal ? "decision" : null,
      outcomeId: isFinal
        ? contradicted && event.status === "retain"
          ? interaction.outcomeIds.at(-1)!
          : interaction.outcomeIds[0]
        : null,
    };
  }

  if (interaction.type === "exhibit_chain" && event.type === "exhibit_committed") {
    const commits = previousCommits(state, "exhibit_committed");
    const stages = ["observe", "prioritize", "interpret", "act"] as const;
    if (event.stage !== stages[commits.length]) {
      throw new Error("Exhibit stages must be committed in order");
    }
    if (
      (event.stage === "observe" || event.stage === "interpret") &&
      !event.response
    ) throw new Error(`${event.stage} requires a committed response`);
    if (event.stage !== "act") {
      return { phase: "interaction", reviewStep: null, outcomeId: null };
    }
    const selectedOutcomes = [
      ...commits,
      event,
    ].flatMap((candidate) => {
      if (candidate.type !== "exhibit_committed") return [];
      const options = candidate.stage === "act"
        ? interaction.actionOptions
        : interaction.observationOptions;
      return candidate.selectedIds.map((id) => {
        const option = options.find((choice) => choice.id === id);
        if (!option) throw new Error(`Unknown exhibit choice: ${id}`);
        return option.outcomeId;
      });
    });
    return {
      phase: "feedback",
      reviewStep: "decision",
      outcomeId: weakestOutcome(interaction.outcomeIds, selectedOutcomes),
    };
  }

  throw new Error(`Unsupported ${interaction.type} commit`);
}

export function applyActivityEvent(
  definition: ActivityDefinition,
  state: ActivityState,
  event: ActivityEvent,
): ActivityState {
  if (
    state.activityId !== definition.id ||
    state.contentVersion !== definition.contentVersion
  ) throw new Error("Activity state belongs to another content version");
  if (state.events.some(({ eventId }) => eventId === event.eventId)) {
    throw new Error(`Duplicate activity event ID: ${event.eventId}`);
  }
  const lastAtMs = state.events.at(-1)?.atMs ?? -1;
  if (event.atMs < lastAtMs) throw new Error("Activity event time cannot decrease");

  let next: Omit<ActivityState, "events">;
  if (state.phase === "context") {
    if (event.type !== "activity_started") return fail(event, state);
    next = { ...state, phase: "interaction" };
  } else if (state.phase === "interaction") {
    const commit = evaluateCommit(definition, state, event);
    next = { ...state, ...commit };
  } else if (state.phase === "feedback") {
    if (state.reviewStep === "self_check") {
      if (
        event.type !== "self_check_committed" ||
        event.interactionId !== definition.interaction.interactionId ||
        definition.interaction.type !== "generated_response"
      ) return fail(event, state);
      const criteria = definition.interaction.responseCycle.criteria.map(({ id }) => id);
      if (
        event.outcomes.length !== criteria.length ||
        new Set(event.outcomes.map(({ criterionId }) => criterionId)).size !== criteria.length ||
        event.outcomes.some(({ criterionId }) => !criteria.includes(criterionId))
      ) throw new Error("Self-check must answer every criterion exactly once");
      next = {
        ...state,
        outcomeId: event.outcomes.every(({ met }) => met)
          ? definition.interaction.outcomeIds[0]
          : definition.interaction.outcomeIds.at(-1)!,
        reviewStep: "comparison",
      };
    } else if (state.reviewStep === "comparison") {
      if (
        event.type !== "authored_comparison_viewed" ||
        event.interactionId !== definition.interaction.interactionId
      ) return fail(event, state);
      next = { ...state, reviewStep: "decision" };
    } else {
      if (
        event.type !== "retry_decided" ||
        event.interactionId !== definition.interaction.interactionId
      ) return fail(event, state);
      next = event.decision === "retry"
        ? { ...state, phase: "interaction", reviewStep: null, outcomeId: null }
        : { ...state, phase: "takeaway", reviewStep: null };
    }
  } else if (state.phase === "takeaway") {
    if (event.type === "takeaway_viewed" && !state.takeawayViewed) {
      next = { ...state, takeawayViewed: true };
    } else if (event.type === "activity_completed" && state.takeawayViewed) {
      next = { ...state, phase: "complete" };
    } else {
      return fail(event, state);
    }
  } else {
    return fail(event, state);
  }

  return { ...next, events: [...state.events, event] };
}

export function evaluateActivityCompletion(
  definition: ActivityDefinition,
  state: ActivityState,
) {
  if (state.phase !== "complete" || !state.outcomeId) {
    throw new Error("Activity is not complete");
  }
  const feedback = definition.feedback.paths.find(({ id }) => id === state.outcomeId);
  if (!feedback) throw new Error(`Missing feedback path: ${state.outcomeId}`);
  const source = definition.interaction.type === "generated_response"
    ? "self_assessment" as const
    : "system" as const;
  const diagnostics = feedback.diagnosticCodes.map((code) => {
    const diagnostic = getV3DiagnosticDefinition(code);
    if (!diagnostic) throw new Error(`Unknown V3 diagnostic code: ${code}`);
    return {
      code,
      skillId: diagnostic.skillId,
      source,
      severity: diagnostic.severity,
    };
  });
  const retryOrTransfer = state.events.some(
    (event) => event.type === "retry_decided" && event.decision === "retry",
  );
  return {
    outcomeId: state.outcomeId,
    feedback,
    diagnostics,
    skillEvidence: [{
      skillId: definition.primarySkillId,
      source: "activity" as const,
      contextId: definition.id,
      difficulty: definition.difficulty,
      reviewed: true,
      retryOrTransfer,
      objectiveChecks: [{
        id: state.outcomeId,
        passed: feedback.classification === "strong" ||
          feedback.classification === "reasonable",
      }],
      diagnosticCodes: feedback.diagnosticCodes,
    }],
  };
}

export function replayActivityEvents(
  definition: ActivityDefinition,
  events: ActivityEvent[],
) {
  return events.reduce(
    (state, event) => applyActivityEvent(definition, state, event),
    createActivityState(definition),
  );
}
