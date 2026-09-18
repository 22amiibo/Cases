import { validateCourseContext, validateEnrollment } from "@/core/course-progress";
import { z } from "zod";
import {
  CaseEventSchema,
  DiagnosticOutcomeSchema,
  LearningEvidenceRecordSchema,
  ScaffoldingLevelSchema,
  SkillIdSchema,
} from "@/core/schema";
import { ActivityAttemptSchema, type CourseContext } from "@/core/activity";
import type {
  CaseAttempt,
  DrillAttempt,
  PracticeRepository,
  SkillAttempt,
} from "./repository";
import { getCaseSkillLearningEvidence } from "./attempts";
import {
  CourseEnrollmentSchema,
  CourseStepEventSchema,
  V3CaseAttemptSchema,
  type CourseEnrollment,
  type CourseStepEvent,
  type V3CaseAttempt,
  type V3Repository,
} from "./v3-repository";

const STORAGE_KEY = "casework:practice-history";

const metadataFields = {
  scoringVersion: z.enum(["v1", "v2"]).default("v1"),
  contentVersion: z.number().int().positive().nullable().default(null),
  eventSchemaVersion: z.number().int().positive().nullable().default(null),
  scaffoldingLevel: ScaffoldingLevelSchema.nullable().default(null),
  learningEvidence: LearningEvidenceRecordSchema.nullable().default(null),
  diagnostics: z.array(DiagnosticOutcomeSchema).default([]),
};

function validateMetadata(
  value: {
    scoringVersion: "v1" | "v2";
    contentVersion: number | null;
    eventSchemaVersion: number | null;
    scaffoldingLevel: "beginner" | "intermediate" | "interview" | null;
    learningEvidence: unknown;
  },
  context: z.RefinementCtx,
  requireLearningEvidence: boolean,
) {
  if (value.scoringVersion === "v1") {
    if (
      value.contentVersion !== null ||
      value.eventSchemaVersion !== null ||
      value.scaffoldingLevel !== null ||
      value.learningEvidence !== null
    ) {
      context.addIssue({
        code: "custom",
        message: "Legacy attempts cannot contain V2 metadata",
        path: ["scoringVersion"],
      });
    }
    return;
  }
  for (const field of [
    "contentVersion",
    "eventSchemaVersion",
    "scaffoldingLevel",
  ] as const) {
    if (value[field] === null) {
      context.addIssue({
        code: "custom",
        message: `${field} is required for V2 attempts`,
        path: [field],
      });
    }
  }
  if (requireLearningEvidence && value.learningEvidence === null) {
    context.addIssue({
      code: "custom",
      message: "learningEvidence is required for V2 drill attempts",
      path: ["learningEvidence"],
    });
  }
}

const DrillAttemptSchema = z.object({
  attemptId: z.string().min(1),
  userId: z.string().min(1),
  drillId: z.string().min(1),
  skillId: SkillIdSchema,
  score: z.number().finite().min(0).max(100),
  feedbackCodes: z.array(z.string()),
  conceptIdsPracticed: z.array(z.string()),
  completedAt: z.iso.datetime(),
  ...metadataFields,
}).superRefine((value, context) => validateMetadata(value, context, true));

const CaseAttemptSchema = z.object({
  attemptId: z.string().min(1),
  userId: z.string().min(1),
  caseId: z.string().min(1),
  completedAt: z.iso.datetime(),
  skillScores: z.partialRecord(
    SkillIdSchema,
    z.number().finite().min(0).max(100),
  ),
  feedbackCodes: z.array(z.string()),
  events: z.array(CaseEventSchema),
  ...metadataFields,
}).superRefine((value, context) => validateMetadata(value, context, false));

const StoredHistorySchema = z.object({
  drillAttempts: z.array(DrillAttemptSchema),
  caseAttempts: z.array(CaseAttemptSchema),
  activityAttempts: z.array(ActivityAttemptSchema).default([]),
  v3CaseAttempts: z.array(V3CaseAttemptSchema).default([]),
  courseEnrollments: z.array(CourseEnrollmentSchema).default([]),
  courseStepEvents: z.array(CourseStepEventSchema).default([]),
});

type StoredHistory = z.infer<typeof StoredHistorySchema>;
type SessionStorage = Pick<Storage, "getItem" | "setItem">;

type MemoryPracticeRepositoryOptions = {
  storage?: SessionStorage;
  storageKey?: string;
};

function emptyHistory(): StoredHistory {
  return {
    drillAttempts: [],
    caseAttempts: [],
    activityAttempts: [],
    v3CaseAttempts: [],
    courseEnrollments: [],
    courseStepEvents: [],
  };
}

function loadHistory(
  storage: SessionStorage | undefined,
  storageKey: string,
): StoredHistory {
  if (!storage) return emptyHistory();

  const serialized = storage.getItem(storageKey);
  if (!serialized) return emptyHistory();

  try {
    const parsed = StoredHistorySchema.safeParse(JSON.parse(serialized));
    return parsed.success ? parsed.data : emptyHistory();
  } catch {
    return emptyHistory();
  }
}

function toCaseSkillHistory(attempt: CaseAttempt): SkillAttempt[] {
  return Object.entries(attempt.skillScores).map(([skillId, score]) => {
    const parsedSkillId = SkillIdSchema.parse(skillId);
    const derived = getCaseSkillLearningEvidence(
      attempt.events,
      parsedSkillId,
      {
        contentVersion: attempt.contentVersion ?? null,
        eventSchemaVersion: attempt.eventSchemaVersion ?? null,
        scaffoldingLevel: attempt.scaffoldingLevel ?? null,
      },
    );
    const learningEvidence = derived.learningEvidence ?? (
      attempt.learningEvidence?.skillId === parsedSkillId
        ? attempt.learningEvidence
        : null
    );
    return {
      attemptId: attempt.attemptId,
      attemptType: "case",
      userId: attempt.userId,
      caseId: attempt.caseId,
      skillId: parsedSkillId,
      score,
      feedbackCodes: attempt.feedbackCodes,
      completedAt: attempt.completedAt,
      scoringVersion: attempt.scoringVersion ?? "v1",
      contentVersion: attempt.contentVersion ?? null,
      eventSchemaVersion: attempt.eventSchemaVersion ?? null,
      scaffoldingLevel: attempt.scaffoldingLevel ?? null,
      learningEvidence,
      diagnostics: derived.learningEvidence
        ? derived.diagnostics
        : learningEvidence?.diagnostics ?? [],
      caseDiagnostics: attempt.diagnostics ?? [],
    };
  });
}

export class MemoryPracticeRepository implements PracticeRepository, V3Repository {
  private history: StoredHistory;
  private readonly storage?: SessionStorage;
  private readonly storageKey: string;

  constructor(options: MemoryPracticeRepositoryOptions = {}) {
    this.storage = options.storage;
    this.storageKey = options.storageKey ?? STORAGE_KEY;
    this.history = loadHistory(this.storage, this.storageKey);
  }

  async saveDrillAttempt(attempt: DrillAttempt): Promise<void> {
    if (
      !this.history.drillAttempts.some(
        (saved) => saved.attemptId === attempt.attemptId,
      )
    ) {
      this.history.drillAttempts.push(DrillAttemptSchema.parse(attempt));
    }
    this.persist();
  }

  async saveCaseAttempt(attempt: CaseAttempt): Promise<void> {
    if (
      !this.history.caseAttempts.some(
        (saved) => saved.attemptId === attempt.attemptId,
      )
    ) {
      this.history.caseAttempts.push(CaseAttemptSchema.parse(attempt));
    }
    this.persist();
  }

  async getSkillHistory(userId: string): Promise<SkillAttempt[]> {
    return [
      ...this.history.drillAttempts
        .filter((attempt) => attempt.userId === userId)
        .map((attempt) => ({
          attemptId: attempt.attemptId,
          attemptType: "drill" as const,
          userId: attempt.userId,
          skillId: attempt.skillId,
          score: attempt.score,
          feedbackCodes: attempt.feedbackCodes,
          completedAt: attempt.completedAt,
          scoringVersion: attempt.scoringVersion,
          contentVersion: attempt.contentVersion,
          eventSchemaVersion: attempt.eventSchemaVersion,
          scaffoldingLevel: attempt.scaffoldingLevel,
          learningEvidence: attempt.learningEvidence,
          diagnostics: attempt.diagnostics,
        })),
      ...this.history.caseAttempts
        .filter((attempt) => attempt.userId === userId)
        .flatMap(toCaseSkillHistory),
    ].sort(
      (left, right) =>
        new Date(right.completedAt).getTime() -
        new Date(left.completedAt).getTime(),
    );
  }

  async getCaseEvents(userId: string, attemptId: string) {
    const attempt = this.history.caseAttempts.find(
      (candidate) =>
        candidate.userId === userId && candidate.attemptId === attemptId,
    );
    return attempt ? [...attempt.events] : [];
  }

  async getCaseAttempt(userId: string, attemptId: string) {
    const attempt = this.history.caseAttempts.find(
      (candidate) =>
        candidate.userId === userId && candidate.attemptId === attemptId,
    );
    return attempt ? { ...attempt, events: [...attempt.events] } : null;
  }

  async saveActivityAttempt(attempt: z.infer<typeof ActivityAttemptSchema>) {
    const parsed = ActivityAttemptSchema.parse(attempt);
    validateCourseContext(parsed.courseContext, { type: "activity", id: parsed.activityId, contentVersion: parsed.contentVersion });
    this.requireCourseEnrollment(parsed);
    this.saveImmutable(this.history.activityAttempts, parsed);
    if (parsed.events.some(event => event.type === "activity_completed")) this.advanceCourseActivity(parsed.userId, parsed.courseContext, parsed.completedAt);
    this.persist();
  }

  async getActivityAttempt(userId: string, attemptId: string) {
    return this.history.activityAttempts.find(
      (attempt) => attempt.userId === userId && attempt.attemptId === attemptId,
    ) ?? null;
  }

  async listActivityAttempts(userId: string) {
    return this.history.activityAttempts
      .filter((attempt) => attempt.userId === userId)
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  }

  async saveV3CaseAttempt(attempt: V3CaseAttempt) {
    const parsed = V3CaseAttemptSchema.parse(attempt);
    validateCourseContext(parsed.courseContext, { type: "case", id: parsed.caseId, contentVersion: parsed.contentVersion, mode: parsed.caseMode });
    this.requireCourseEnrollment(parsed);
    this.saveImmutable(this.history.v3CaseAttempts, parsed);
    if (parsed.events.some(event => event.type === "recommendation_submitted")) this.advanceCourseActivity(parsed.userId, parsed.courseContext, parsed.completedAt);
    this.persist();
  }

  async enroll(enrollment: CourseEnrollment) {
    const parsed = CourseEnrollmentSchema.parse(enrollment);
    const index = this.history.courseEnrollments.findIndex((candidate) =>
      candidate.userId === parsed.userId &&
      candidate.courseId === parsed.courseId &&
      candidate.courseVersion === parsed.courseVersion,
    );
    validateEnrollment(parsed, index >= 0);
    if (index < 0) this.history.courseEnrollments.push(parsed);
    this.persist();
  }

  async recordLessonViewed(event: CourseStepEvent) {
    const parsed = CourseStepEventSchema.parse(event);
    validateCourseContext(parsed, { type: "lesson", id: parsed.lessonId, contentVersion: parsed.lessonVersion });
    const enrolled = this.history.courseEnrollments.some((candidate) =>
      candidate.userId === parsed.userId &&
      candidate.courseId === parsed.courseId &&
      candidate.courseVersion === parsed.courseVersion,
    );
    if (!enrolled) throw new Error("Course enrollment not found");
    const existing = this.history.courseStepEvents.find((candidate) =>
      candidate.userId === parsed.userId &&
      candidate.courseId === parsed.courseId &&
      candidate.courseVersion === parsed.courseVersion &&
      candidate.courseStepId === parsed.courseStepId &&
      candidate.eventType === parsed.eventType,
    );
    if (!existing) this.history.courseStepEvents.push(parsed);
    this.advanceCourseActivity(parsed.userId, parsed, (existing ?? parsed).occurredAt);
    this.persist();
  }

  async listCourseEvidence(userId: string) {
    return {
      enrollments: this.history.courseEnrollments.filter((item) => item.userId === userId),
      lessonEvents: this.history.courseStepEvents.filter((item) => item.userId === userId),
      activityAttempts: await this.listActivityAttempts(userId),
      caseAttempts: this.history.v3CaseAttempts.filter((item) => item.userId === userId),
    };
  }

  private requireCourseEnrollment(attempt: { userId: string; courseContext: { courseId: string; courseVersion: number } | null }) {
    const context = attempt.courseContext;
    if (context && !this.history.courseEnrollments.some(e => e.userId === attempt.userId && e.courseId === context.courseId && e.courseVersion === context.courseVersion)) throw new Error("Course enrollment not found");
  }

  private advanceCourseActivity(userId: string, context: CourseContext | null, occurredAt: string) {
    if (!context) return;
    const enrollment = this.history.courseEnrollments.find(e => e.userId === userId && e.courseId === context.courseId && e.courseVersion === context.courseVersion);
    if (enrollment && Date.parse(occurredAt) > Date.parse(enrollment.lastActivityAt)) {
      enrollment.lastActivityAt = occurredAt;
      enrollment.lastStepId = context.courseStepId;
    }
  }

  private saveImmutable<T extends { attemptId: string }>(items: T[], item: T) {
    const existing = items.find(({ attemptId }) => attemptId === item.attemptId);
    if (existing && JSON.stringify(existing) !== JSON.stringify(item)) {
      throw new Error(`Conflicting attempt retry: ${item.attemptId}`);
    }
    if (!existing) items.push(item);
  }

  private persist() {
    this.storage?.setItem(this.storageKey, JSON.stringify(this.history));
  }
}

let guestRepository: MemoryPracticeRepository | undefined;

export function getGuestPracticeRepository() {
  if (!guestRepository) {
    guestRepository = new MemoryPracticeRepository({
      storage:
        typeof window === "undefined" ? undefined : window.sessionStorage,
    });
  }
  return guestRepository;
}
