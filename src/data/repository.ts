import type {
  CaseEvent,
  DiagnosticOutcome,
  LearningEvidenceRecord,
  ScaffoldingLevelSchema,
  SkillId,
} from "@/core/schema";
import type { z } from "zod";

export type AttemptLearningMetadata = {
  scoringVersion?: "v1" | "v2";
  contentVersion?: number | null;
  eventSchemaVersion?: number | null;
  scaffoldingLevel?: z.infer<typeof ScaffoldingLevelSchema> | null;
  learningEvidence?: LearningEvidenceRecord | null;
  diagnostics?: DiagnosticOutcome[];
};

export type SkillAttempt = AttemptLearningMetadata & {
  attemptId: string;
  attemptType: "drill" | "case";
  userId: string;
  caseId?: string;
  skillId: SkillId;
  score: number;
  feedbackCodes: string[];
  completedAt: string;
  caseDiagnostics?: DiagnosticOutcome[];
};

export type DrillAttempt = Omit<SkillAttempt, "attemptType"> & {
  attemptType?: "drill";
  drillId: string;
  conceptIdsPracticed: string[];
};

export type CaseAttempt = AttemptLearningMetadata & {
  attemptId: string;
  userId: string;
  caseId: string;
  completedAt: string;
  skillScores: Partial<Record<SkillId, number>>;
  feedbackCodes: string[];
  events: CaseEvent[];
};

export interface PracticeRepository {
  saveDrillAttempt(attempt: DrillAttempt): Promise<void>;
  saveCaseAttempt(attempt: CaseAttempt): Promise<void>;
  getSkillHistory(userId: string): Promise<SkillAttempt[]>;
  getCaseAttempt(userId: string, attemptId: string): Promise<CaseAttempt | null>;
  getCaseEvents(userId: string, attemptId: string): Promise<CaseEvent[]>;
}

export function selectV2SkillHistory(history: SkillAttempt[]) {
  return history.filter(
    (attempt) =>
      attempt.scoringVersion === "v2" &&
      Number.isInteger(attempt.contentVersion) &&
      Number(attempt.contentVersion) > 0 &&
      Number.isInteger(attempt.eventSchemaVersion) &&
      Number(attempt.eventSchemaVersion) > 0 &&
      attempt.scaffoldingLevel != null,
  );
}
