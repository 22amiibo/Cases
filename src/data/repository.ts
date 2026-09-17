import type { CaseEvent, SkillId } from "@/core/schema";

export type SkillAttempt = {
  attemptId: string;
  attemptType: "drill" | "case";
  userId: string;
  skillId: SkillId;
  score: number;
  feedbackCodes: string[];
  completedAt: string;
};

export type DrillAttempt = Omit<SkillAttempt, "attemptType"> & {
  attemptType?: "drill";
  drillId: string;
  conceptIdsPracticed: string[];
};

export type CaseAttempt = {
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
}
