import type { CaseEvent, SkillId } from "@/core/schema";

export type SkillAttempt = {
  userId: string;
  skillId: SkillId;
  score: number;
  feedbackCode: string;
  completedAt: string;
};

export type DrillAttempt = SkillAttempt & {
  drillId: string;
  conceptIdsPracticed: string[];
};

export type CaseAttempt = {
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
