import { z } from "zod";
import { diagnosticCodes } from "./diagnostics";

export const ContentVersionSchema = z.number().int().positive();
export const EventSchemaVersionSchema = z.number().int().positive();
export const ScoringVersionSchema = z.enum(["v1", "v2"]);
export const ScaffoldingLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "interview",
]);

export const V2SkillIdSchema = z.enum([
  "clarification",
  "structure",
  "prioritization",
  "quantitative",
  "exhibit",
  "synthesis",
]);

export type V2SkillId = z.infer<typeof V2SkillIdSchema>;

export const SkillIdSchema = z.enum([
  "structure",
  "prioritization",
  "quantitative",
  "exhibit",
  "synthesis",
  "clarification",
  "recommendation",
]);

export type SkillId = z.infer<typeof SkillIdSchema>;

const IdentifierSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:[a-z0-9_-]*[a-z0-9])?$/, "Use a stable slug ID");

export const CommittedResponseSchema = z.object({
  responseId: IdentifierSchema,
  interactionId: IdentifierSchema,
  revision: z.number().int().positive(),
  revisionOf: IdentifierSchema.nullable(),
  responseKind: IdentifierSchema,
  text: z.string().min(1).max(10_000),
  committedAtMs: z.number().int().nonnegative(),
});

export type CommittedResponse = z.infer<typeof CommittedResponseSchema>;

export const CommittedResponseChainSchema = z
  .array(CommittedResponseSchema)
  .min(1)
  .superRefine((responses, context) => {
    const ids = new Set<string>();
    const revisionByNumber = new Map<number, CommittedResponse>();
    const interactionId = responses[0]?.interactionId;

    responses.forEach((response, index) => {
      if (ids.has(response.responseId)) {
        context.addIssue({
          code: "custom",
          message: "Response IDs must be unique",
          path: [index, "responseId"],
        });
      }
      ids.add(response.responseId);
      if (revisionByNumber.has(response.revision)) {
        context.addIssue({
          code: "custom",
          message: "Revision numbers must be unique",
          path: [index, "revision"],
        });
      }
      revisionByNumber.set(response.revision, response);
      if (response.interactionId !== interactionId) {
        context.addIssue({
          code: "custom",
          message: "A revision chain must use one interaction ID",
          path: [index, "interactionId"],
        });
      }
    });

    responses.forEach((response, index) => {
      if (response.revision === 1 && response.revisionOf !== null) {
        context.addIssue({
          code: "custom",
          message: "Revision 1 cannot reference an earlier response",
          path: [index, "revisionOf"],
        });
      }
      if (response.revision > 1) {
        const prior = revisionByNumber.get(response.revision - 1);
        if (!prior || response.revisionOf !== prior.responseId) {
          context.addIssue({
            code: "custom",
            message: "Each revision must link to the preceding revision",
            path: [index, "revisionOf"],
          });
        }
      }
    });
  });

export const RubricOutcomeSchema = z.object({
  criterionId: IdentifierSchema,
  met: z.boolean(),
});

export type RubricOutcome = z.infer<typeof RubricOutcomeSchema>;

export const DiagnosticOutcomeSchema = z.object({
  code: z.enum(diagnosticCodes),
  source: z.enum(["system", "self_assessment"]),
  severity: z.enum(["strength", "coaching", "blocking"]),
  responseId: IdentifierSchema.optional(),
});

export type DiagnosticOutcome = z.infer<typeof DiagnosticOutcomeSchema>;

const LegacyLearningEvidenceRecordSchema = z.object({
  interactionId: IdentifierSchema,
  skillId: SkillIdSchema,
  scoringVersion: z.literal("v1"),
  contentVersion: z.never().optional(),
  eventSchemaVersion: z.never().optional(),
  scaffoldingLevel: z.never().optional(),
  responses: z.never().optional(),
  rubricOutcomes: z.never().optional(),
  diagnostics: z.never().optional(),
});

const V2LearningEvidenceRecordSchema = z.object({
  interactionId: IdentifierSchema,
  skillId: V2SkillIdSchema,
  scoringVersion: z.literal("v2"),
  contentVersion: ContentVersionSchema,
  eventSchemaVersion: EventSchemaVersionSchema,
  scaffoldingLevel: ScaffoldingLevelSchema,
  responses: CommittedResponseChainSchema,
  rubricOutcomes: z.array(RubricOutcomeSchema),
  diagnostics: z.array(DiagnosticOutcomeSchema),
});

export const LearningEvidenceRecordSchema = z.discriminatedUnion(
  "scoringVersion",
  [LegacyLearningEvidenceRecordSchema, V2LearningEvidenceRecordSchema],
);

export type LearningEvidenceRecord = z.infer<typeof LearningEvidenceRecordSchema>;

export const ConceptSchema = z.object({
  id: IdentifierSchema,
  label: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
});

export const FrameworkRubricSchema = z.object({
  concepts: z
    .array(
      z.object({
        conceptId: IdentifierSchema,
        weight: z.number().positive(),
        required: z.boolean().default(false),
      }),
    )
    .min(1),
  overlapGroups: z.array(z.array(IdentifierSchema).min(2)).default([]),
  priorityConceptIds: z.array(IdentifierSchema).min(1),
});

const FrameworkBranchSchema: z.ZodType<FrameworkBranch> = z.lazy(() =>
  z.object({
    conceptId: IdentifierSchema,
    children: z.array(FrameworkBranchSchema).default([]),
  }),
);

export type FrameworkBranch = {
  conceptId: string;
  children: FrameworkBranch[];
};

export const FrameworkSubmissionSchema = z.object({
  branches: z.array(FrameworkBranchSchema).min(1).max(4),
  priorityConceptId: IdentifierSchema,
  rationale: z.string().trim().min(1).max(2_000).optional(),
});

export type FrameworkSubmission = z.infer<typeof FrameworkSubmissionSchema>;

export const ClarificationOptionSchema = z.object({
  id: IdentifierSchema,
  label: z.string().min(1),
  response: z.string().min(1),
  highValue: z.boolean(),
});

export const FactDefinitionSchema = z.object({
  id: IdentifierSchema,
  text: z.string().min(1),
});

export const GeneratedResponseDefinitionSchema = z.object({
  interactionId: IdentifierSchema,
  responseKind: IdentifierSchema,
  prompt: z.string().min(1),
  scaffoldingLevel: ScaffoldingLevelSchema,
  guidance: z.array(z.string().min(1)),
  criteria: z
    .array(z.object({ id: IdentifierSchema, label: z.string().min(1) }))
    .min(1),
  comparison: z.object({
    title: z.string().min(1),
    text: z.string().min(1).max(10_000),
  }),
  diagnosticRules: z.array(
    z.object({
      criterionId: IdentifierSchema,
      when: z.enum(["met", "not_met"]),
      code: z.enum(diagnosticCodes),
      severity: z.enum(["strength", "coaching", "blocking"]),
    }),
  ),
});

export const InvestigationNodeSchema = z.object({
  id: IdentifierSchema,
  conceptId: IdentifierSchema,
  label: z.string().min(1),
  interviewerResponse: z.string().min(1),
  factIds: z.array(IdentifierSchema).min(1),
  exhibitIds: z.array(IdentifierSchema).default([]),
  prerequisiteNodeIds: z.array(IdentifierSchema).default([]),
  critical: z.boolean().default(false),
  rootCause: z.boolean().default(false),
  value: z.enum(["high", "medium", "low"]),
});

export const ExhibitDefinitionSchema = z.object({
  id: IdentifierSchema,
  title: z.string().min(1),
  type: z.enum(["table", "grouped_bar", "stacked_bar", "line", "waterfall"]),
  unit: z.string().min(1),
  sourceFactIds: z.array(IdentifierSchema).min(1),
  columns: z.array(z.string().min(1)).default([]),
  rows: z.array(z.array(z.union([z.string(), z.number()]))).default([]),
  series: z
    .array(
      z.object({
        name: z.string().min(1),
        data: z.array(z.number()),
      }),
    )
    .default([]),
  categories: z.array(z.string()).default([]),
  insights: z
    .array(
      z.object({
        id: IdentifierSchema,
        label: z.string().min(1),
        strength: z.number().min(0).max(1),
      }),
    )
    .min(1),
  interpretation: GeneratedResponseDefinitionSchema.optional(),
});

export const CalculationDefinitionSchema = z.object({
  id: IdentifierSchema,
  prompt: z.string().min(1),
  unit: z.string().min(1),
  formula: z.object({
    operation: z.enum(["sum", "subtract", "multiply", "divide", "percentage"]),
    inputs: z.array(z.number()).min(1),
  }),
  expectedAnswer: z.number(),
  tolerance: z.number().nonnegative(),
  prerequisiteNodeIds: z.array(IdentifierSchema).default([]),
  evidenceFactId: IdentifierSchema,
});

const RecommendationRubricSchema = z.object({
  minimumEvidence: z.number().int().min(1).max(3),
  decisions: z
    .array(
      z.object({
        id: IdentifierSchema,
        label: z.string().min(1),
        supportingEvidenceIds: z.array(IdentifierSchema).min(1),
        weight: z.number().min(0).max(1),
      }),
    )
    .min(1),
  risks: z.array(z.object({ id: IdentifierSchema, label: z.string().min(1) })).min(1),
  nextSteps: z
    .array(z.object({ id: IdentifierSchema, label: z.string().min(1) }))
    .min(1),
});

const CaseDefinitionBaseSchema = z.object({
  id: IdentifierSchema,
  version: z.number().int().positive(),
  title: z.string().min(1),
  category: z.enum([
    "profitability",
    "market_entry",
    "growth",
    "operations",
    "pricing",
  ]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  prompt: z.string().min(1),
  objective: z.string().min(1),
  clarificationOptions: z.array(ClarificationOptionSchema).min(1),
  opening: z
    .object({
      responseCycle: GeneratedResponseDefinitionSchema,
      recommendedQuestionCount: z.number().int().positive(),
      minimumHighValueQuestions: z.number().int().positive(),
    })
    .optional(),
  hypothesisPractice: z
    .object({
      options: z.array(z.object({ id: IdentifierSchema, label: z.string().min(1) })).min(2),
      initial: GeneratedResponseDefinitionSchema,
      update: GeneratedResponseDefinitionSchema,
      contradictions: z.array(z.object({
        hypothesisId: IdentifierSchema,
        evidenceFactIds: z.array(IdentifierSchema).min(1),
      })).default([]),
    })
    .optional(),
  facts: z.array(FactDefinitionSchema).min(1),
  investigationNodes: z.array(InvestigationNodeSchema).min(1),
  exhibits: z.array(ExhibitDefinitionSchema).min(1),
  calculations: z.array(CalculationDefinitionSchema).default([]),
  frameworkRubric: FrameworkRubricSchema,
  recommendation: RecommendationRubricSchema,
  efficientPaths: z
    .array(
      z.object({
        id: IdentifierSchema,
        label: z.string().min(1),
        nodeIds: z.array(IdentifierSchema).min(1),
      }),
    )
    .min(1),
});

export const CaseDefinitionSchema = CaseDefinitionBaseSchema.superRefine(
  (definition, context) => {
    const factIds = new Set(definition.facts.map((fact) => fact.id));

    if (definition.hypothesisPractice) {
      if (definition.version < 2) {
        context.addIssue({
          code: "custom",
          message: "Hypothesis practice requires a V2 case definition",
          path: ["hypothesisPractice"],
        });
      }
      const hypothesisIds = new Set(
        definition.hypothesisPractice.options.map(({ id }) => id),
      );
      definition.hypothesisPractice.contradictions.forEach((rule, ruleIndex) => {
        if (!hypothesisIds.has(rule.hypothesisId)) {
          context.addIssue({
            code: "custom",
            message: `Unknown hypothesis ${rule.hypothesisId}`,
            path: ["hypothesisPractice", "contradictions", ruleIndex, "hypothesisId"],
          });
        }
        rule.evidenceFactIds.forEach((factId, factIndex) => {
          if (!factIds.has(factId)) {
            context.addIssue({
              code: "custom",
              message: `Unknown hypothesis evidence ${factId}`,
              path: ["hypothesisPractice", "contradictions", ruleIndex, "evidenceFactIds", factIndex],
            });
          }
        });
      });
    }

    definition.exhibits.forEach((exhibit, exhibitIndex) => {
      exhibit.sourceFactIds.forEach((factId, factIndex) => {
        if (!factIds.has(factId)) {
          context.addIssue({
            code: "custom",
            message: `Exhibit ${exhibit.id} references unknown fact ${factId}`,
            path: ["exhibits", exhibitIndex, "sourceFactIds", factIndex],
          });
        }
      });
      if (exhibit.interpretation) {
        const criterionIds = new Set(
          exhibit.interpretation.criteria.map(({ id }) => id),
        );
        if (criterionIds.size !== exhibit.interpretation.criteria.length) {
          context.addIssue({
            code: "custom",
            message: `Exhibit ${exhibit.id} interpretation criteria must be unique`,
            path: ["exhibits", exhibitIndex, "interpretation", "criteria"],
          });
        }
        exhibit.interpretation.diagnosticRules.forEach((rule, ruleIndex) => {
          if (!criterionIds.has(rule.criterionId)) {
            context.addIssue({
              code: "custom",
              message: `Exhibit ${exhibit.id} diagnostic references unknown criterion ${rule.criterionId}`,
              path: [
                "exhibits",
                exhibitIndex,
                "interpretation",
                "diagnosticRules",
                ruleIndex,
              ],
            });
          }
        });
      }
    });
  },
);

export type CaseDefinition = z.infer<typeof CaseDefinitionSchema>;
export type ExhibitDefinition = z.infer<typeof ExhibitDefinitionSchema>;
export type CalculationDefinition = z.infer<typeof CalculationDefinitionSchema>;

const TimedEventSchema = z.object({ atMs: z.number().int().nonnegative() });

const LegacyFrameworkSubmittedEventSchema = TimedEventSchema.extend({
  type: z.literal("framework_submitted"),
  conceptIds: z.array(IdentifierSchema).min(1),
  priorityConceptId: IdentifierSchema,
});

const V2FrameworkSubmittedEventSchema = TimedEventSchema.extend({
  type: z.literal("framework_submitted"),
  eventSchemaVersion: z.literal(2),
  branches: z.array(FrameworkBranchSchema).min(1).max(4),
  priorityConceptId: IdentifierSchema,
  rationale: z.string().trim().min(1).max(2_000),
});

const HypothesisEvidenceSchema = z.object({
  eventSchemaVersion: z.literal(2),
  responses: CommittedResponseChainSchema,
  rubricOutcomes: z.array(RubricOutcomeSchema),
  diagnostics: z.array(DiagnosticOutcomeSchema),
  rationale: z.string().trim().min(1).max(10_000),
  authoredComparisonViewed: z.literal(true),
});

const HypothesisFormedEventSchema = TimedEventSchema.extend({
  type: z.literal("hypothesis_formed"),
  hypothesisId: IdentifierSchema,
  evidenceIds: z.array(IdentifierSchema).length(0),
  revisionOfResponseId: z.null(),
}).and(HypothesisEvidenceSchema);

const HypothesisUpdatedEventSchema = TimedEventSchema.extend({
  type: z.literal("hypothesis_updated"),
  status: z.enum(["retain", "revise", "reject"]),
  previousHypothesisId: IdentifierSchema,
  hypothesisId: IdentifierSchema.nullable(),
  evidenceIds: z.array(IdentifierSchema).min(1),
  revisionOfResponseId: IdentifierSchema,
}).and(HypothesisEvidenceSchema).superRefine((event, context) => {
  if (event.status === "retain" && event.hypothesisId !== event.previousHypothesisId) {
    context.addIssue({ code: "custom", message: "A retained hypothesis cannot change", path: ["hypothesisId"] });
  }
  if (event.status === "revise" && (!event.hypothesisId || event.hypothesisId === event.previousHypothesisId)) {
    context.addIssue({ code: "custom", message: "A revision must select a different hypothesis", path: ["hypothesisId"] });
  }
  if (event.status === "reject" && event.hypothesisId !== null) {
    context.addIssue({ code: "custom", message: "A rejected hypothesis must clear the current hypothesis", path: ["hypothesisId"] });
  }
});

export const CaseEventSchema = z.union([
  TimedEventSchema.extend({
    type: z.literal("clarification_selected"),
    clarificationId: IdentifierSchema,
  }),
  TimedEventSchema.extend({
    type: z.literal("case_opening_submitted"),
    eventSchemaVersion: z.literal(2),
    responses: CommittedResponseChainSchema,
    rubricOutcomes: z.array(RubricOutcomeSchema),
    diagnostics: z.array(DiagnosticOutcomeSchema),
    questions: z.array(
      z.object({ questionId: IdentifierSchema, interviewerResponse: z.string().min(1) }),
    ).min(1),
    authoredComparisonViewed: z.literal(true),
  }),
  LegacyFrameworkSubmittedEventSchema,
  V2FrameworkSubmittedEventSchema,
  HypothesisFormedEventSchema,
  HypothesisUpdatedEventSchema,
  TimedEventSchema.extend({
    type: z.literal("hypothesis_selected"),
    hypothesisId: IdentifierSchema,
  }),
  TimedEventSchema.extend({
    type: z.literal("node_investigated"),
    nodeId: IdentifierSchema,
  }),
  TimedEventSchema.extend({
    type: z.literal("exhibit_insight_submitted"),
    exhibitId: IdentifierSchema,
    insightIds: z.array(IdentifierSchema).min(1),
  }),
  TimedEventSchema.extend({
    type: z.literal("exhibit_interpretation_submitted"),
    eventSchemaVersion: z.literal(2),
    exhibitId: IdentifierSchema,
    responses: CommittedResponseChainSchema,
    rubricOutcomes: z.array(RubricOutcomeSchema),
    diagnostics: z.array(DiagnosticOutcomeSchema),
    insightIds: z.array(IdentifierSchema).min(1),
    authoredComparisonViewed: z.literal(true),
  }),
  TimedEventSchema.extend({
    type: z.literal("calculation_submitted"),
    taskId: IdentifierSchema,
    answer: z.number(),
  }),
  TimedEventSchema.extend({
    type: z.literal("synthesis_submitted"),
    evidenceIds: z.array(IdentifierSchema).min(1),
    nextStepNodeId: IdentifierSchema,
  }),
  TimedEventSchema.extend({
    type: z.literal("recommendation_submitted"),
    decisionId: IdentifierSchema,
    evidenceIds: z.array(IdentifierSchema).min(1).max(3),
    riskId: IdentifierSchema,
    nextStepId: IdentifierSchema,
  }),
]);

export type CaseEvent = z.infer<typeof CaseEventSchema>;

export const RecommendationSubmissionSchema = z.object({
  decisionId: IdentifierSchema,
  evidenceIds: z.array(IdentifierSchema).min(1).max(3),
  riskId: IdentifierSchema,
  nextStepId: IdentifierSchema,
});

export type RecommendationSubmission = z.infer<
  typeof RecommendationSubmissionSchema
>;

const DrillBaseSchema = z.object({
  id: IdentifierSchema,
  prompt: z.string().min(1),
  conceptIdsPracticed: z.array(IdentifierSchema).min(1),
});

const ChoiceSchema = z.object({ id: IdentifierSchema, label: z.string().min(1) });

export const DrillDefinitionSchema = z.discriminatedUnion("skillId", [
  DrillBaseSchema.extend({
    skillId: z.literal("structure"),
    conceptOptions: z.array(ChoiceSchema).min(2),
    rubric: FrameworkRubricSchema,
  }),
  DrillBaseSchema.extend({
    skillId: z.literal("prioritization"),
    options: z
      .array(ChoiceSchema.extend({ weight: z.number().min(0).max(1) }))
      .min(2),
  }),
  DrillBaseSchema.extend({
    skillId: z.literal("quantitative"),
    expectedAnswer: z.number(),
    tolerance: z.number().nonnegative(),
    requiredUnit: z.string().min(1),
  }),
  DrillBaseSchema.extend({
    skillId: z.literal("exhibit"),
    exhibit: ExhibitDefinitionSchema,
    observationOptions: z.array(ChoiceSchema).min(2),
    implicationOptions: z.array(ChoiceSchema).min(2),
    nextInvestigationOptions: z.array(ChoiceSchema).min(2),
    correct: z.object({
      observationId: IdentifierSchema,
      implicationId: IdentifierSchema,
      nextInvestigationId: IdentifierSchema,
    }),
  }),
  DrillBaseSchema.extend({
    skillId: z.literal("synthesis"),
    evidenceOptions: z.array(ChoiceSchema).min(3),
    correctEvidenceIds: z.array(IdentifierSchema).length(2),
    nextStepOptions: z.array(ChoiceSchema).min(2),
    correctNextStepId: IdentifierSchema,
  }),
]);

export type DrillDefinition = z.infer<typeof DrillDefinitionSchema>;

export const V2ClarificationDrillDefinitionSchema = z.object({
  id: IdentifierSchema,
  contentVersion: z.literal(2),
  eventSchemaVersion: z.literal(2),
  scoringVersion: z.literal("v2"),
  scaffoldingLevel: ScaffoldingLevelSchema,
  skillId: z.literal("clarification"),
  conceptIdsPracticed: z.array(IdentifierSchema).min(1),
  title: z.string().min(1),
  casePrompt: z.string().min(1),
  responseCycle: GeneratedResponseDefinitionSchema,
  questionOptions: z
    .array(
      z.object({
        id: IdentifierSchema,
        label: z.string().min(1),
        response: z.string().min(1),
        highValue: z.boolean(),
      }),
    )
    .min(3),
  recommendedQuestionCount: z.number().int().positive(),
  minimumHighValueQuestions: z.number().int().positive(),
});

export type V2ClarificationDrillDefinition = z.infer<
  typeof V2ClarificationDrillDefinitionSchema
>;

const V2DrillBaseSchema = z.object({
  id: IdentifierSchema,
  contentVersion: z.literal(2),
  eventSchemaVersion: z.literal(2),
  scoringVersion: z.literal("v2"),
  scaffoldingLevel: ScaffoldingLevelSchema,
  conceptIdsPracticed: z.array(IdentifierSchema).min(1),
  title: z.string().min(1),
  scenario: z.string().min(1),
  responseCycle: GeneratedResponseDefinitionSchema,
});

const V2ChoiceCheckpointSchema = z.object({
  kind: z.literal("choice"),
  label: z.string().min(1),
  options: z.array(z.object({ id: IdentifierSchema, label: z.string().min(1) })).min(2),
  correctId: IdentifierSchema,
  successCode: z.enum(diagnosticCodes),
  coachingCode: z.enum(diagnosticCodes),
});

export const V2PracticeDrillDefinitionSchema = z.discriminatedUnion("skillId", [
  V2DrillBaseSchema.extend({
    skillId: z.literal("structure"),
    checkpoint: z.object({
      kind: z.literal("framework"),
      conceptOptions: z.array(z.object({ id: IdentifierSchema, label: z.string().min(1) })).min(3),
      rubric: FrameworkRubricSchema,
    }),
  }),
  V2DrillBaseSchema.extend({
    skillId: z.literal("prioritization"),
    checkpoint: V2ChoiceCheckpointSchema,
  }),
  V2DrillBaseSchema.extend({
    skillId: z.literal("quantitative"),
    checkpoint: z.object({
      kind: z.literal("quantitative"),
      expectedAnswer: z.number(),
      tolerance: z.number().nonnegative(),
      requiredUnit: z.string().min(1),
    }),
  }),
  V2DrillBaseSchema.extend({
    skillId: z.literal("exhibit"),
    checkpoint: V2ChoiceCheckpointSchema,
  }),
  V2DrillBaseSchema.extend({
    skillId: z.literal("synthesis"),
    checkpoint: z.object({
      kind: z.literal("synthesis"),
      evidenceOptions: z.array(z.object({ id: IdentifierSchema, label: z.string().min(1) })).min(3),
      correctEvidenceIds: z.array(IdentifierSchema).min(2).max(3),
      nextStepOptions: z.array(z.object({ id: IdentifierSchema, label: z.string().min(1) })).min(2),
      correctNextStepId: IdentifierSchema,
    }),
  }),
]);

export type V2PracticeDrillDefinition = z.infer<
  typeof V2PracticeDrillDefinitionSchema
>;

export type V2DrillDefinition =
  | V2ClarificationDrillDefinition
  | V2PracticeDrillDefinition;
