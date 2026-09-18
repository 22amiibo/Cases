import type { ActivityAttempt } from "./activity";
import type { SkillAttempt } from "@/data/repository";
import type { V3CaseAttempt } from "@/data/v3-repository";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  progress: number;
  goal: number;
};

export function buildAchievements(
  history: SkillAttempt[],
  activities: ActivityAttempt[],
  v3Cases: V3CaseAttempt[],
): Achievement[] {
  const caseCount = new Set(
    history.filter(({ attemptType }) => attemptType === "case").map(({ attemptId }) => attemptId),
  ).size + v3Cases.length;
  const exhibitCount = activities.filter(({ primarySkillId }) => primarySkillId === "exhibit").length;
  const evidenceRevision = activities.some(({ events }) => events.some((event) =>
    event.type === "hypothesis_committed" &&
    (event.status === "revise" || event.status === "reject") &&
    event.evidenceIds.length > 0,
  ));
  const interviewCount = v3Cases.filter(({ caseMode }) => caseMode === "interview").length;
  return [
    { id: "first-case", title: "First case completed", description: "Finish one complete case.", earned: caseCount > 0, progress: Math.min(caseCount, 1), goal: 1 },
    { id: "first-interview-case", title: "First Interview Mode case", description: "Complete a case under Interview Mode rules.", earned: interviewCount > 0, progress: Math.min(interviewCount, 1), goal: 1 },
    { id: "five-exhibits", title: "Five exhibit drills", description: "Complete five focused Exhibit Analysis activities.", earned: exhibitCount >= 5, progress: Math.min(exhibitCount, 5), goal: 5 },
    { id: "evidence-revision", title: "Evidence changed the hypothesis", description: "Revise or reject a hypothesis using revealed evidence.", earned: evidenceRevision, progress: evidenceRevision ? 1 : 0, goal: 1 },
  ];
}
