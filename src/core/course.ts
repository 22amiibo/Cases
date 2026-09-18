import { z } from "zod";
import { IdentifierSchema } from "./schema";
import { CaseTypeIdSchema, DifficultySchema } from "./v3-taxonomy";

const LessonStepSchema = z.object({
  id: IdentifierSchema,
  title: z.string().min(1),
  resource: z.object({
    type: z.literal("lesson"),
    id: IdentifierSchema,
    contentVersion: z.number().int().positive(),
  }),
  completionRule: z.literal("viewed"),
});

const ActivityStepSchema = z.object({
  id: IdentifierSchema,
  title: z.string().min(1),
  resource: z.object({
    type: z.literal("activity"),
    id: IdentifierSchema,
    contentVersion: z.number().int().positive(),
  }),
  completionRule: z.literal("completed"),
});

const CaseStepSchema = z.object({
  id: IdentifierSchema,
  title: z.string().min(1),
  resource: z.object({
    type: z.literal("case"),
    id: IdentifierSchema,
    contentVersion: z.number().int().positive(),
    mode: z.literal("practice"),
  }),
  completionRule: z.literal("completed"),
});

export const CourseStepSchema = z.union([
  LessonStepSchema,
  ActivityStepSchema,
  CaseStepSchema,
]);

export const CourseDefinitionSchema = z.object({
  id: IdentifierSchema,
  contentVersion: z.number().int().positive(),
  status: z.enum(["draft", "active", "retired"]),
  title: z.string().min(1),
  caseTypeId: CaseTypeIdSchema,
  difficulty: DifficultySchema.extract(["beginner", "intermediate"]),
  estimatedMinutes: z.number().int().positive(),
  steps: z.array(CourseStepSchema).min(1),
}).superRefine((course, context) => {
  const stepIds = course.steps.map(({ id }) => id);
  if (new Set(stepIds).size !== stepIds.length) {
    context.addIssue({ code: "custom", message: "Course step IDs must be unique", path: ["steps"] });
  }
});

export type CourseDefinition = z.infer<typeof CourseDefinitionSchema>;
export type CourseStep = z.infer<typeof CourseStepSchema>;
