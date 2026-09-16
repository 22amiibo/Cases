import { z } from "zod";

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
    });
  },
);

export type CaseDefinition = z.infer<typeof CaseDefinitionSchema>;
export type ExhibitDefinition = z.infer<typeof ExhibitDefinitionSchema>;
export type CalculationDefinition = z.infer<typeof CalculationDefinitionSchema>;

const TimedEventSchema = z.object({ atMs: z.number().int().nonnegative() });

export const CaseEventSchema = z.discriminatedUnion("type", [
  TimedEventSchema.extend({
    type: z.literal("clarification_selected"),
    clarificationId: IdentifierSchema,
  }),
  TimedEventSchema.extend({
    type: z.literal("framework_submitted"),
    conceptIds: z.array(IdentifierSchema).min(1),
    priorityConceptId: IdentifierSchema,
  }),
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
