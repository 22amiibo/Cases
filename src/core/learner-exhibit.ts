import type { LearnerExhibitDefinition } from "./learner-case";
import type { ExhibitDefinition } from "./schema";

export function projectLearnerExhibit({
  id, title, type, unit, columns, rows, series, categories,
}: ExhibitDefinition): LearnerExhibitDefinition {
  return { id, title, type, unit, columns, rows, series, categories };
}
