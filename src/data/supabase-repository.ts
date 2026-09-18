import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
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

export interface PracticeDatabaseClient {
  insertDrillAttempt(row: DrillAttemptInsert): Promise<void>;
  insertCaseAttempt(row: CaseAttemptInsert): Promise<void>;
  selectDrillAttempts(userId: string): Promise<DrillAttemptRow[]>;
  selectCaseAttempts(userId: string): Promise<CaseAttemptRow[]>;
  selectCaseAttempt(userId: string, attemptId: string): Promise<CaseAttemptRow | null>;
  selectCaseEvents(userId: string, attemptId: string): Promise<CaseEventRow[]>;
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

export class SupabasePracticeRepository implements PracticeRepository {
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
