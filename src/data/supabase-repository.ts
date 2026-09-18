import { validateCourseContext, validateEnrollment } from "@/core/course-progress";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ActivityAttemptSchema, type ActivityAttempt, type CourseContext } from "@/core/activity";
import {
  CaseEventSchema,
  DiagnosticOutcomeSchema,
  LearningEvidenceRecordSchema,
  ScaffoldingLevelSchema,
  SkillIdSchema,
} from "@/core/schema";
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

// PostgREST returns timestamptz values with offsets; domain timestamps use UTC.
function databaseTimestamp(value: unknown) {
  return new Date(z.iso.datetime({ offset: true }).parse(value)).toISOString();
}

type DrillAttemptRow = {
  id: string;
  user_id: string;
  skill_id: string;
  score: number;
  feedback_codes: string[];
  completed_at: string;
  scoring_version?: string | null;
  content_version?: number | null;
  event_schema_version?: number | null;
  scaffolding_level?: string | null;
  learning_evidence?: unknown;
  diagnostics?: unknown;
};

type CaseAttemptRow = {
  id: string;
  user_id: string;
  case_id?: string;
  skill_scores: Record<string, number>;
  feedback_codes: string[];
  completed_at: string;
  scoring_version?: string | null;
  content_version?: number | null;
  event_schema_version?: number | null;
  scaffolding_level?: string | null;
  learning_evidence?: unknown;
  diagnostics?: unknown;
};

type CaseEventRow = { sequence: number; event: unknown };
type ActivityEventRow = { sequence: number; event: unknown };
type ActivityAttemptRow = {
  id: string;
  user_id: string;
  activity_id: string;
  content_version: number;
  event_schema_version: number;
  scoring_version: string;
  primary_skill_id: string;
  skill_evidence: unknown;
  diagnostics: unknown;
  course_id: string | null;
  course_version: number | null;
  course_step_id: string | null;
  started_at: string;
  completed_at: string;
};
type V3CaseAttemptRow = CaseAttemptRow & {
  case_mode: string | null;
  skill_evidence: unknown;
  course_id: string | null;
  course_version: number | null;
  course_step_id: string | null;
};

export type DrillAttemptInsert = DrillAttemptRow & {
  id: string;
  drill_id: string;
  concept_ids_practiced: string[];
};

export type CaseAttemptInsert = CaseAttemptRow & {
  id: string;
  case_id: string;
  events: CaseAttempt["events"];
};
export type ActivityAttemptInsert = ActivityAttemptRow & {
  events: ActivityAttempt["events"];
};
export type V3CaseAttemptInsert = V3CaseAttemptRow & {
  case_id: string;
  events: V3CaseAttempt["events"];
};

export interface PracticeDatabaseClient {
  insertDrillAttempt(row: DrillAttemptInsert): Promise<void>;
  insertCaseAttempt(row: CaseAttemptInsert): Promise<void>;
  selectDrillAttempts(userId: string): Promise<DrillAttemptRow[]>;
  selectCaseAttempts(userId: string): Promise<CaseAttemptRow[]>;
  selectCaseAttempt(userId: string, attemptId: string): Promise<CaseAttemptRow | null>;
  selectCaseEvents(userId: string, attemptId: string): Promise<CaseEventRow[]>;
  insertActivityAttempt(row: ActivityAttemptInsert): Promise<void>;
  selectActivityAttempts(userId: string): Promise<ActivityAttemptRow[]>;
  selectActivityAttempt(userId: string, attemptId: string): Promise<ActivityAttemptRow | null>;
  selectActivityEvents(userId: string, attemptId: string): Promise<ActivityEventRow[]>;
  insertV3CaseAttempt(row: V3CaseAttemptInsert): Promise<void>;
  selectV3CaseAttempts(userId: string): Promise<V3CaseAttemptRow[]>;
  upsertCourseEnrollment(enrollment: CourseEnrollment): Promise<void>;
  insertCourseStepEvent(event: CourseStepEvent): Promise<void>;
  advanceCourseActivity(userId: string, context: CourseContext, occurredAt: string): Promise<void>;
  selectCourseEnrollments(userId: string): Promise<unknown[]>;
  selectCourseStepEvents(userId: string): Promise<unknown[]>;
}

export class SupabaseDatabaseClient implements PracticeDatabaseClient {
  constructor(private readonly client: SupabaseClient) {}

  async insertDrillAttempt(row: DrillAttemptInsert) {
    const { error } = await this.client
      .from("drill_attempts")
      .upsert(row, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }

  async insertCaseAttempt(row: CaseAttemptInsert) {
    const { error } = await this.client.rpc("save_case_attempt_v2", {
      p_attempt_id: row.id,
      p_user_id: row.user_id,
      p_case_id: row.case_id,
      p_skill_scores: row.skill_scores,
      p_feedback_codes: row.feedback_codes,
      p_events: row.events,
      p_completed_at: row.completed_at,
      p_content_version: row.content_version,
      p_event_schema_version: row.event_schema_version,
      p_scoring_version: row.scoring_version,
      p_scaffolding_level: row.scaffolding_level,
      p_learning_evidence: row.learning_evidence,
      p_diagnostics: row.diagnostics,
    });
    if (error) throw error;
  }

  async selectDrillAttempts(userId: string) {
    const { data, error } = await this.client
      .from("drill_attempts")
      .select("id, user_id, skill_id, score, feedback_codes, completed_at, scoring_version, content_version, event_schema_version, scaffolding_level, learning_evidence, diagnostics")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as DrillAttemptRow[];
  }

  async selectCaseAttempts(userId: string) {
    const { data, error } = await this.client
      .from("case_attempts")
      .select("id, user_id, case_id, skill_scores, feedback_codes, completed_at, scoring_version, content_version, event_schema_version, scaffolding_level, learning_evidence, diagnostics")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as CaseAttemptRow[];
  }

  async selectCaseAttempt(userId: string, attemptId: string) {
    const { data, error } = await this.client
      .from("case_attempts")
      .select("id, user_id, case_id, skill_scores, feedback_codes, completed_at, scoring_version, content_version, event_schema_version, scaffolding_level, learning_evidence, diagnostics")
      .eq("user_id", userId)
      .eq("id", attemptId)
      .maybeSingle();
    if (error) throw error;
    return data as CaseAttemptRow | null;
  }

  async selectCaseEvents(userId: string, attemptId: string) {
    const { data, error } = await this.client
      .from("case_events")
      .select("sequence, event")
      .eq("user_id", userId)
      .eq("case_attempt_id", attemptId)
      .order("sequence", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CaseEventRow[];
  }

  async insertActivityAttempt(row: ActivityAttemptInsert) {
    const { error } = await this.client.rpc("save_activity_attempt_v3", {
      p_attempt_id: row.id,
      p_user_id: row.user_id,
      p_activity_id: row.activity_id,
      p_content_version: row.content_version,
      p_event_schema_version: row.event_schema_version,
      p_primary_skill_id: row.primary_skill_id,
      p_skill_evidence: row.skill_evidence,
      p_diagnostics: row.diagnostics,
      p_course_id: row.course_id,
      p_course_version: row.course_version,
      p_course_step_id: row.course_step_id,
      p_started_at: row.started_at,
      p_completed_at: row.completed_at,
      p_events: row.events,
    });
    if (error) throw error;
  }

  async selectActivityAttempts(userId: string) {
    const { data, error } = await this.client.from("activity_attempts")
      .select("id, user_id, activity_id, content_version, event_schema_version, scoring_version, primary_skill_id, skill_evidence, diagnostics, course_id, course_version, course_step_id, started_at, completed_at")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as ActivityAttemptRow[];
  }

  async selectActivityAttempt(userId: string, attemptId: string) {
    const { data, error } = await this.client.from("activity_attempts")
      .select("id, user_id, activity_id, content_version, event_schema_version, scoring_version, primary_skill_id, skill_evidence, diagnostics, course_id, course_version, course_step_id, started_at, completed_at")
      .eq("user_id", userId).eq("id", attemptId).maybeSingle();
    if (error) throw error;
    return data as ActivityAttemptRow | null;
  }

  async selectActivityEvents(userId: string, attemptId: string) {
    const { data, error } = await this.client.from("activity_events")
      .select("sequence, event").eq("user_id", userId)
      .eq("activity_attempt_id", attemptId).order("sequence", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ActivityEventRow[];
  }

  async insertV3CaseAttempt(row: V3CaseAttemptInsert) {
    const { error } = await this.client.rpc("save_case_attempt_v3", {
      p_attempt_id: row.id,
      p_user_id: row.user_id,
      p_case_id: row.case_id,
      p_skill_scores: row.skill_scores,
      p_feedback_codes: row.feedback_codes,
      p_events: row.events,
      p_completed_at: row.completed_at,
      p_content_version: row.content_version,
      p_event_schema_version: row.event_schema_version,
      p_scaffolding_level: row.scaffolding_level,
      p_case_mode: row.case_mode,
      p_skill_evidence: row.skill_evidence,
      p_diagnostics: row.diagnostics,
      p_course_id: row.course_id,
      p_course_version: row.course_version,
      p_course_step_id: row.course_step_id,
    });
    if (error) throw error;
  }

  async selectV3CaseAttempts(userId: string) {
    const { data, error } = await this.client.from("case_attempts")
      .select("id, user_id, case_id, skill_scores, feedback_codes, completed_at, scoring_version, content_version, event_schema_version, scaffolding_level, learning_evidence, diagnostics, case_mode, skill_evidence, course_id, course_version, course_step_id")
      .eq("user_id", userId).eq("scoring_version", "v3");
    if (error) throw error;
    return (data ?? []) as V3CaseAttemptRow[];
  }

  async upsertCourseEnrollment(enrollment: CourseEnrollment) {
    const { error } = await this.client.from("course_enrollments").upsert({
      user_id: enrollment.userId,
      course_id: enrollment.courseId,
      course_version: enrollment.courseVersion,
      started_at: enrollment.startedAt,
      last_activity_at: enrollment.lastActivityAt,
      last_step_id: enrollment.lastStepId,
    }, { onConflict: "user_id,course_id,course_version", ignoreDuplicates: true });
    if (error) throw error;
  }

  async advanceCourseActivity(userId: string, context: CourseContext, occurredAt: string) {
    const { error } = await this.client.from("course_enrollments")
      .update({ last_activity_at: occurredAt, last_step_id: context.courseStepId })
      .eq("user_id", userId).eq("course_id", context.courseId).eq("course_version", context.courseVersion)
      .lt("last_activity_at", occurredAt);
    if (error) throw error;
  }

  async insertCourseStepEvent(event: CourseStepEvent) {
    const { error } = await this.client.from("course_step_events").upsert({
      user_id: event.userId,
      course_id: event.courseId,
      course_version: event.courseVersion,
      course_step_id: event.courseStepId,
      event_type: event.eventType,
      lesson_id: event.lessonId,
      lesson_version: event.lessonVersion,
      occurred_at: event.occurredAt,
    }, {
      onConflict: "user_id,course_id,course_version,course_step_id,event_type",
      ignoreDuplicates: true,
    });
    if (error) throw error;
  }

  async selectCourseEnrollments(userId: string) {
    const { data, error } = await this.client.from("course_enrollments")
      .select("user_id, course_id, course_version, started_at, last_activity_at, last_step_id")
      .eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  }

  async selectCourseStepEvents(userId: string) {
    const { data, error } = await this.client.from("course_step_events")
      .select("user_id, course_id, course_version, course_step_id, event_type, lesson_id, lesson_version, occurred_at")
      .eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  }
}

function metadataFromRow(
  row: DrillAttemptRow | CaseAttemptRow,
  requireLearningEvidence: boolean,
) {
  const scoringVersion = row.scoring_version ?? "v1";
  if (scoringVersion === "v1") {
    return {
      scoringVersion: "v1" as const,
      contentVersion: null,
      eventSchemaVersion: null,
      scaffoldingLevel: null,
      learningEvidence: null,
      diagnostics: [],
    };
  }
  if (scoringVersion !== "v2") return null;
  const scaffolding = ScaffoldingLevelSchema.safeParse(row.scaffolding_level);
  const evidence = row.learning_evidence == null
    ? null
    : LearningEvidenceRecordSchema.safeParse(row.learning_evidence);
  const diagnostics = DiagnosticOutcomeSchema.array().safeParse(row.diagnostics ?? []);
  if (
    !Number.isInteger(row.content_version) ||
    Number(row.content_version) < 1 ||
    !Number.isInteger(row.event_schema_version) ||
    Number(row.event_schema_version) < 1 ||
    !scaffolding.success ||
    (requireLearningEvidence && !evidence?.success) ||
    (evidence?.success && evidence.data.scoringVersion !== "v2") ||
    (evidence?.success && evidence.data.contentVersion !== row.content_version) ||
    (evidence?.success && evidence.data.eventSchemaVersion !== row.event_schema_version) ||
    (evidence?.success && evidence.data.scaffoldingLevel !== scaffolding.data) ||
    !diagnostics.success
  ) {
    return null;
  }
  return {
    scoringVersion: "v2" as const,
    contentVersion: row.content_version as number,
    eventSchemaVersion: row.event_schema_version as number,
    scaffoldingLevel: scaffolding.data,
    learningEvidence: evidence?.success ? evidence.data : null,
    diagnostics: diagnostics.data,
  };
}

const CaseSkillScoresSchema = z.partialRecord(
  SkillIdSchema,
  z.number().finite().min(0).max(100),
);

export class SupabasePracticeRepository implements PracticeRepository, V3Repository {
  constructor(private readonly database: PracticeDatabaseClient) {}

  async saveDrillAttempt(attempt: DrillAttempt): Promise<void> {
    await this.database.insertDrillAttempt({
      id: attempt.attemptId,
      user_id: attempt.userId,
      drill_id: attempt.drillId,
      skill_id: attempt.skillId,
      score: attempt.score,
      feedback_codes: attempt.feedbackCodes,
      concept_ids_practiced: attempt.conceptIdsPracticed,
      completed_at: attempt.completedAt,
      scoring_version: attempt.scoringVersion ?? "v1",
      content_version: attempt.contentVersion ?? null,
      event_schema_version: attempt.eventSchemaVersion ?? null,
      scaffolding_level: attempt.scaffoldingLevel ?? null,
      learning_evidence: attempt.learningEvidence ?? null,
      diagnostics: attempt.diagnostics ?? [],
    });
  }

  async saveCaseAttempt(attempt: CaseAttempt): Promise<void> {
    await this.database.insertCaseAttempt({
      id: attempt.attemptId,
      user_id: attempt.userId,
      case_id: attempt.caseId,
      skill_scores: attempt.skillScores,
      feedback_codes: attempt.feedbackCodes,
      events: attempt.events,
      completed_at: attempt.completedAt,
      scoring_version: attempt.scoringVersion ?? "v1",
      content_version: attempt.contentVersion ?? null,
      event_schema_version: attempt.eventSchemaVersion ?? null,
      scaffolding_level: attempt.scaffoldingLevel ?? null,
      learning_evidence: attempt.learningEvidence ?? null,
      diagnostics: attempt.diagnostics ?? [],
    });
  }

  async getSkillHistory(userId: string): Promise<SkillAttempt[]> {
    const [drillRows, caseRows] = await Promise.all([
      this.database.selectDrillAttempts(userId),
      this.database.selectCaseAttempts(userId),
    ]);
    // ponytail: one ordered-event read per V2 case; batch when history latency matters.
    const caseEvents = new Map(await Promise.all(
      caseRows.flatMap((row) =>
        metadataFromRow(row, false)?.scoringVersion === "v2"
          ? [this.getCaseEvents(userId, row.id).then((events) => [row.id, events] as const)]
          : [],
      ),
    ));

    return [
      ...drillRows.flatMap((row) => {
        const skillId = SkillIdSchema.safeParse(row.skill_id);
        const metadata = metadataFromRow(row, true);
        return skillId.success && metadata && Number.isFinite(row.score) && row.score >= 0 && row.score <= 100
          ? [{
              attemptId: row.id,
              attemptType: "drill" as const,
              userId: row.user_id,
              skillId: skillId.data,
              score: row.score,
              feedbackCodes: row.feedback_codes,
              completedAt: row.completed_at,
              ...metadata,
            }]
          : [];
      }),
      ...caseRows.flatMap((row) =>
        Object.entries(row.skill_scores).flatMap(([rawSkillId, score]) => {
          const skillId = SkillIdSchema.safeParse(rawSkillId);
          const metadata = metadataFromRow(row, false);
          const derived = skillId.success && metadata?.scoringVersion === "v2"
            ? getCaseSkillLearningEvidence(
                caseEvents.get(row.id) ?? [],
                skillId.data,
                metadata,
              )
            : { learningEvidence: null, diagnostics: [] };
          const learningEvidence = derived.learningEvidence ?? (
            skillId.success && metadata?.learningEvidence?.skillId === skillId.data
              ? metadata.learningEvidence
              : null
          );
          return skillId.success && metadata && Number.isFinite(score) && score >= 0 && score <= 100
            ? [{
                attemptId: row.id,
                attemptType: "case" as const,
                userId: row.user_id,
                ...(row.case_id ? { caseId: row.case_id } : {}),
                skillId: skillId.data,
                score,
                feedbackCodes: row.feedback_codes,
                completedAt: row.completed_at,
                ...metadata,
                learningEvidence,
                diagnostics: derived.learningEvidence
                  ? derived.diagnostics
                  : learningEvidence?.diagnostics ?? [],
                caseDiagnostics: metadata.diagnostics,
              }]
            : [];
        }),
      ),
    ].sort(
      (left, right) =>
        new Date(right.completedAt).getTime() -
        new Date(left.completedAt).getTime(),
    );
  }

  async getCaseEvents(userId: string, attemptId: string) {
    const rows = await this.database.selectCaseEvents(userId, attemptId);
    return [...rows]
      .sort((left, right) => left.sequence - right.sequence)
      .map(({ event }) => CaseEventSchema.parse(event));
  }

  async getCaseAttempt(userId: string, attemptId: string) {
    const row = await this.database.selectCaseAttempt(userId, attemptId);
    if (
      !row ||
      row.user_id !== userId ||
      row.id !== attemptId ||
      !row.case_id
    ) {
      return null;
    }
    const metadata = metadataFromRow(row, false);
    const skillScores = CaseSkillScoresSchema.safeParse(row.skill_scores);
    if (!metadata || !skillScores.success) return null;
    const events = await this.getCaseEvents(userId, attemptId);
    return {
      attemptId: row.id,
      userId: row.user_id,
      caseId: row.case_id,
      completedAt: row.completed_at,
      skillScores: skillScores.data,
      feedbackCodes: row.feedback_codes,
      events,
      ...metadata,
    };
  }

  async saveActivityAttempt(attempt: ActivityAttempt) {
    const parsed = ActivityAttemptSchema.parse(attempt);
    validateCourseContext(parsed.courseContext, { type: "activity", id: parsed.activityId, contentVersion: parsed.contentVersion });
    await this.requireCourseEnrollment(parsed);
    await this.database.insertActivityAttempt({
      id: parsed.attemptId,
      user_id: parsed.userId,
      activity_id: parsed.activityId,
      content_version: parsed.contentVersion,
      event_schema_version: parsed.eventSchemaVersion,
      scoring_version: parsed.scoringVersion,
      primary_skill_id: parsed.primarySkillId,
      skill_evidence: parsed.skillEvidence,
      diagnostics: parsed.diagnostics,
      course_id: parsed.courseContext?.courseId ?? null,
      course_version: parsed.courseContext?.courseVersion ?? null,
      course_step_id: parsed.courseContext?.courseStepId ?? null,
      started_at: parsed.startedAt,
      completed_at: parsed.completedAt,
      events: parsed.events,
    });
    if (parsed.courseContext && parsed.events.some(event => event.type === "activity_completed")) await this.database.advanceCourseActivity(parsed.userId, parsed.courseContext, parsed.completedAt);
  }

  async getActivityAttempt(userId: string, attemptId: string) {
    const row = await this.database.selectActivityAttempt(userId, attemptId);
    if (!row || row.user_id !== userId || row.id !== attemptId) return null;
    return this.activityAttemptFromRow(row);
  }

  async listActivityAttempts(userId: string) {
    const rows = await this.database.selectActivityAttempts(userId);
    const attempts = await Promise.all(rows.flatMap((row) =>
      row.user_id === userId ? [this.activityAttemptFromRow(row)] : [],
    ));
    return attempts.sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  }

  async saveV3CaseAttempt(attempt: V3CaseAttempt) {
    const parsed = V3CaseAttemptSchema.parse(attempt);
    validateCourseContext(parsed.courseContext, { type: "case", id: parsed.caseId, contentVersion: parsed.contentVersion, mode: parsed.caseMode });
    await this.requireCourseEnrollment(parsed);
    await this.database.insertV3CaseAttempt({
      id: parsed.attemptId,
      user_id: parsed.userId,
      case_id: parsed.caseId,
      skill_scores: parsed.skillScores,
      feedback_codes: parsed.feedbackCodes,
      completed_at: parsed.completedAt,
      scoring_version: parsed.scoringVersion,
      content_version: parsed.contentVersion,
      event_schema_version: parsed.eventSchemaVersion,
      scaffolding_level: parsed.scaffoldingLevel,
      learning_evidence: null,
      diagnostics: parsed.diagnostics,
      case_mode: parsed.caseMode,
      skill_evidence: parsed.skillEvidence,
      course_id: parsed.courseContext?.courseId ?? null,
      course_version: parsed.courseContext?.courseVersion ?? null,
      course_step_id: parsed.courseContext?.courseStepId ?? null,
      events: parsed.events,
    });
    if (parsed.courseContext && parsed.events.some(event => event.type === "recommendation_submitted")) await this.database.advanceCourseActivity(parsed.userId, parsed.courseContext, parsed.completedAt);
  }

  async enroll(enrollment: CourseEnrollment) {
    const parsed = CourseEnrollmentSchema.parse(enrollment);
    const rows = await this.database.selectCourseEnrollments(parsed.userId);
    validateEnrollment(parsed, rows.some(value => { const row = value as Record<string, unknown>; return row.user_id === parsed.userId && row.course_id === parsed.courseId && row.course_version === parsed.courseVersion; }));
    await this.database.upsertCourseEnrollment(parsed);
  }

  async recordLessonViewed(event: CourseStepEvent) {
    const parsed = CourseStepEventSchema.parse(event);
    validateCourseContext(parsed, { type: "lesson", id: parsed.lessonId, contentVersion: parsed.lessonVersion });
    await this.requireCourseEnrollment({ userId: parsed.userId, courseContext: parsed });
    await this.database.insertCourseStepEvent(parsed);
    // A duplicate lesson has the original event time, even after an ambiguous save retry.
    const rows = await this.database.selectCourseStepEvents(parsed.userId);
    const saved = rows.map(value => value as Record<string, unknown>).find(row => row.user_id === parsed.userId && row.course_id === parsed.courseId && row.course_version === parsed.courseVersion && row.course_step_id === parsed.courseStepId && row.event_type === parsed.eventType && row.lesson_id === parsed.lessonId && row.lesson_version === parsed.lessonVersion);
    if (!saved) throw new Error("Saved course lesson event not found");
    await this.database.advanceCourseActivity(parsed.userId, parsed, databaseTimestamp(saved.occurred_at));
  }

  async listCourseEvidence(userId: string) {
    const [enrollmentRows, lessonRows, activityAttempts, caseRows] = await Promise.all([
      this.database.selectCourseEnrollments(userId),
      this.database.selectCourseStepEvents(userId),
      this.listActivityAttempts(userId),
      this.database.selectV3CaseAttempts(userId),
    ]);
    const enrollments = enrollmentRows.map((row) => CourseEnrollmentSchema.parse({
      userId: (row as Record<string, unknown>).user_id,
      courseId: (row as Record<string, unknown>).course_id,
      courseVersion: (row as Record<string, unknown>).course_version,
      startedAt: databaseTimestamp((row as Record<string, unknown>).started_at),
      lastActivityAt: databaseTimestamp((row as Record<string, unknown>).last_activity_at),
      lastStepId: (row as Record<string, unknown>).last_step_id,
    }));
    const lessonEvents = lessonRows.map((row) => CourseStepEventSchema.parse({
      eventType: (row as Record<string, unknown>).event_type,
      userId: (row as Record<string, unknown>).user_id,
      courseId: (row as Record<string, unknown>).course_id,
      courseVersion: (row as Record<string, unknown>).course_version,
      courseStepId: (row as Record<string, unknown>).course_step_id,
      lessonId: (row as Record<string, unknown>).lesson_id,
      lessonVersion: (row as Record<string, unknown>).lesson_version,
      occurredAt: databaseTimestamp((row as Record<string, unknown>).occurred_at),
    }));
    // ponytail: one ordered-event read per V3 case; batch when course history latency matters.
    const caseAttempts = await Promise.all(caseRows.flatMap((row) =>
      row.user_id === userId ? [this.v3CaseAttemptFromRow(row)] : [],
    ));
    return { enrollments, lessonEvents, activityAttempts, caseAttempts };
  }

  private async requireCourseEnrollment(attempt: { userId: string; courseContext: { courseId: string; courseVersion: number } | null }) {
    const context = attempt.courseContext;
    if (!context) return;
    const rows = await this.database.selectCourseEnrollments(attempt.userId);
    if (!rows.some(value => { const row = value as Record<string, unknown>; return row.user_id === attempt.userId && row.course_id === context.courseId && row.course_version === context.courseVersion; })) throw new Error("Course enrollment not found");
  }

  private async activityAttemptFromRow(row: ActivityAttemptRow) {
    const events = (await this.database.selectActivityEvents(row.user_id, row.id))
      .sort((left, right) => left.sequence - right.sequence)
      .map(({ event }) => event);
    return ActivityAttemptSchema.parse({
      attemptId: row.id,
      userId: row.user_id,
      activityId: row.activity_id,
      contentVersion: row.content_version,
      eventSchemaVersion: row.event_schema_version,
      scoringVersion: row.scoring_version,
      primarySkillId: row.primary_skill_id,
      skillEvidence: row.skill_evidence,
      diagnostics: row.diagnostics,
      courseContext: row.course_id === null ? null : {
        courseId: row.course_id,
        courseVersion: row.course_version,
        courseStepId: row.course_step_id,
      },
      startedAt: databaseTimestamp(row.started_at),
      completedAt: databaseTimestamp(row.completed_at),
      events,
    });
  }

  private async v3CaseAttemptFromRow(row: V3CaseAttemptRow) {
    const events = await this.getCaseEvents(row.user_id, row.id);
    return V3CaseAttemptSchema.parse({
      attemptId: row.id,
      userId: row.user_id,
      caseId: row.case_id,
      contentVersion: row.content_version,
      eventSchemaVersion: row.event_schema_version,
      scoringVersion: row.scoring_version,
      scaffoldingLevel: row.scaffolding_level,
      caseMode: row.case_mode,
      completedAt: databaseTimestamp(row.completed_at),
      skillScores: row.skill_scores,
      feedbackCodes: row.feedback_codes,
      skillEvidence: row.skill_evidence,
      diagnostics: row.diagnostics,
      courseContext: row.course_id === null ? null : {
        courseId: row.course_id,
        courseVersion: row.course_version,
        courseStepId: row.course_step_id,
      },
      events,
    });
  }
}

let browserClient: SupabaseClient | null | undefined;

export function createBrowserSupabaseClient() {
  if (browserClient !== undefined) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonymousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  browserClient =
    url && anonymousKey ? createClient(url, anonymousKey) : null;
  return browserClient;
}

export function createSupabasePracticeRepository(client: SupabaseClient) {
  return new SupabasePracticeRepository(new SupabaseDatabaseClient(client));
}
