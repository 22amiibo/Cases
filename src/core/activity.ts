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
