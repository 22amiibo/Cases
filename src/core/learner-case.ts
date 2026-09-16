import type { CaseStage, RevealedFact } from "./case-engine";
import type { CaseDefinition, CaseEvent, ExhibitDefinition } from "./schema";

export type LearnerExhibitDefinition = Omit<
  ExhibitDefinition,
  "sourceFactIds" | "insights"
>;

export type LearnerCalculationDefinition = Pick<
  CaseDefinition["calculations"][number],
  "id" | "prompt" | "unit"
>;

export type LearnerRecommendation = {
  decisions: Array<{ id: string; label: string }>;
  risks: Array<{ id: string; label: string }>;
  nextSteps: Array<{ id: string; label: string }>;
};

export type LearnerCaseDefinition = Pick<
  CaseDefinition,
  "id" | "version" | "title" | "category" | "difficulty" | "prompt" | "objective"
> & {
  clarificationOptions: Array<{ id: string; label: string }>;
};

export type LearnerSessionView = {
  currentStage: CaseStage;
  availableActions: Array<{ id: string; conceptId: string; label: string }>;
  facts: RevealedFact[];
  exhibits: LearnerExhibitDefinition[];
  calculations: LearnerCalculationDefinition[];
  completedCalculationIds: string[];
  interviewerResponse: string | null;
  recommendation: LearnerRecommendation | null;
};

export type StoredCaseWorkspace = {
  events: CaseEvent[];
  clarificationComplete: boolean;
  clarificationDraftIds: string[];
};

export function toLearnerCaseDefinition(
  definition: CaseDefinition,
): LearnerCaseDefinition {
  return {
    id: definition.id,
    version: definition.version,
    title: definition.title,
    category: definition.category,
    difficulty: definition.difficulty,
    prompt: definition.prompt,
    objective: definition.objective,
    clarificationOptions: definition.clarificationOptions.map(({ id, label }) => ({
      id,
      label,
    })),
  };
}
