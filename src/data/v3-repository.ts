import { z } from "zod";
import {
  ActivityAttemptSchema,
  CourseContextSchema,
  V3DiagnosticOutcomeSchema,
  V3SkillEvidenceSchema,
  type ActivityAttempt,
} from "@/core/activity";
import {
  CaseEventSchema,
  ScaffoldingLevelSchema,
  SkillIdSchema,
} from "@/core/schema";
import { CaseModeSchema } from "@/core/v3-taxonomy";
import type { PracticeRepository } from "./repository";

export const V3CaseAttemptSchema = z.object({
  attemptId: z.string().min(1),
  userId: z.string().min(1),
  caseId: z.string().min(1),
  contentVersion: z.number().int().positive(),
  eventSchemaVersion: z.literal(2),
  scoringVersion: z.literal("v3"),
  scaffoldingLevel: ScaffoldingLevelSchema.nullable(),
  caseMode: CaseModeSchema,
  completedAt: z.iso.datetime(),
  skillScores: z.partialRecord(SkillIdSchema, z.number().min(0).max(100)),
  feedbackCodes: z.array(z.string()),
  skillEvidence: z.array(V3SkillEvidenceSchema),
  diagnostics: z.array(V3DiagnosticOutcomeSchema),
  courseContext: CourseContextSchema.nullable(),
  events: z.array(CaseEventSchema),
});

export const CourseStepEventSchema = z.object({
  eventType: z.literal("lesson_viewed"),
  userId: z.string().min(1),
  courseId: z.string().min(1),
  courseVersion: z.number().int().positive(),
  courseStepId: z.string().min(1),
  lessonId: z.string().min(1),
  lessonVersion: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
});

export const CourseEnrollmentSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  courseVersion: z.number().int().positive(),
  startedAt: z.iso.datetime(),
  lastActivityAt: z.iso.datetime(),
  lastStepId: z.string().min(1),
});

export type V3CaseAttempt = z.infer<typeof V3CaseAttemptSchema>;
export type CourseStepEvent = z.infer<typeof CourseStepEventSchema>;
export type CourseEnrollment = z.infer<typeof CourseEnrollmentSchema>;
export type CourseEvidence = {
  enrollments: CourseEnrollment[];
  lessonEvents: CourseStepEvent[];
  activityAttempts: ActivityAttempt[];
  caseAttempts: V3CaseAttempt[];
};

export interface ActivityAttemptRepository {
  saveActivityAttempt(attempt: ActivityAttempt): Promise<void>;
  getActivityAttempt(userId: string, attemptId: string): Promise<ActivityAttempt | null>;
  listActivityAttempts(userId: string): Promise<ActivityAttempt[]>;
}

export interface V3CaseAttemptRepository {
  saveV3CaseAttempt(attempt: V3CaseAttempt): Promise<void>;
}

export interface CourseRepository {
  enroll(enrollment: CourseEnrollment): Promise<void>;
  recordLessonViewed(event: CourseStepEvent): Promise<void>;
  listCourseEvidence(userId: string): Promise<CourseEvidence>;
}

export type V3Repository = ActivityAttemptRepository &
  V3CaseAttemptRepository &
  CourseRepository &
  PracticeRepository;

export { ActivityAttemptSchema };
