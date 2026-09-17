import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SkillIdSchema } from "@/core/schema";
import type {
  CaseAttempt,
  DrillAttempt,
  PracticeRepository,
  SkillAttempt,
} from "./repository";

type DrillAttemptRow = {
  id: string;
  user_id: string;
  skill_id: string;
  score: number;
  feedback_codes: string[];
  completed_at: string;
};

type CaseAttemptRow = {
  id: string;
  user_id: string;
  skill_scores: Record<string, number>;
  feedback_codes: string[];
  completed_at: string;
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

export interface PracticeDatabaseClient {
  insertDrillAttempt(row: DrillAttemptInsert): Promise<void>;
  insertCaseAttempt(row: CaseAttemptInsert): Promise<void>;
  selectDrillAttempts(userId: string): Promise<DrillAttemptRow[]>;
  selectCaseAttempts(userId: string): Promise<CaseAttemptRow[]>;
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
    const { error } = await this.client.rpc("save_case_attempt", {
      p_attempt_id: row.id,
      p_user_id: row.user_id,
      p_case_id: row.case_id,
      p_skill_scores: row.skill_scores,
      p_feedback_codes: row.feedback_codes,
      p_events: row.events,
      p_completed_at: row.completed_at,
    });
    if (error) throw error;
  }

  async selectDrillAttempts(userId: string) {
    const { data, error } = await this.client
      .from("drill_attempts")
      .select("id, user_id, skill_id, score, feedback_codes, completed_at")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as DrillAttemptRow[];
  }

  async selectCaseAttempts(userId: string) {
    const { data, error } = await this.client
      .from("case_attempts")
      .select("id, user_id, skill_scores, feedback_codes, completed_at")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as CaseAttemptRow[];
  }
}

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
    });
  }

  async getSkillHistory(userId: string): Promise<SkillAttempt[]> {
    const [drillRows, caseRows] = await Promise.all([
      this.database.selectDrillAttempts(userId),
      this.database.selectCaseAttempts(userId),
    ]);

    return [
      ...drillRows.flatMap((row) => {
        const skillId = SkillIdSchema.safeParse(row.skill_id);
        return skillId.success && Number.isFinite(row.score) && row.score >= 0 && row.score <= 100
          ? [{
              attemptId: row.id,
              attemptType: "drill" as const,
              userId: row.user_id,
              skillId: skillId.data,
              score: row.score,
              feedbackCodes: row.feedback_codes,
              completedAt: row.completed_at,
            }]
          : [];
      }),
      ...caseRows.flatMap((row) =>
        Object.entries(row.skill_scores).flatMap(([rawSkillId, score]) => {
          const skillId = SkillIdSchema.safeParse(rawSkillId);
          return skillId.success && Number.isFinite(score) && score >= 0 && score <= 100
            ? [{
                attemptId: row.id,
                attemptType: "case" as const,
                userId: row.user_id,
                skillId: skillId.data,
                score,
                feedbackCodes: row.feedback_codes,
                completedAt: row.completed_at,
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
