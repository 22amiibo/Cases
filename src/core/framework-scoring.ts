import type { FrameworkRubricSchema, FrameworkSubmission } from "./schema";
import type { z } from "zod";

type FrameworkRubric = z.infer<typeof FrameworkRubricSchema>;

export type FrameworkScore = {
  coverage: number;
  overlapPenalty: number;
  priorityScore: number;
  missedConceptIds: string[];
};

function flattenConceptIds(branches: FrameworkSubmission["branches"]): string[] {
  return branches.flatMap((branch) => [
    branch.conceptId,
    ...flattenConceptIds(branch.children),
  ]);
}

function roundScore(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function scoreFramework(
  submission: FrameworkSubmission,
  rubric: FrameworkRubric,
): FrameworkScore {
  const selectedConceptIds = flattenConceptIds(submission.branches);
  const uniqueConceptIds = new Set(selectedConceptIds);
  const totalWeight = rubric.concepts.reduce(
    (total, concept) => total + concept.weight,
    0,
  );
  const coveredWeight = rubric.concepts.reduce(
    (total, concept) =>
      total + (uniqueConceptIds.has(concept.conceptId) ? concept.weight : 0),
    0,
  );
  const duplicateCount = selectedConceptIds.length - uniqueConceptIds.size;
  const overlapCount = rubric.overlapGroups.reduce((total, group) => {
    const selectedInGroup = group.filter((conceptId) =>
      uniqueConceptIds.has(conceptId),
    ).length;
    return total + Math.max(0, selectedInGroup - 1);
  }, 0);

  return {
    coverage: roundScore(totalWeight === 0 ? 0 : coveredWeight / totalWeight),
    overlapPenalty: roundScore(Math.min(1, (duplicateCount + overlapCount) * 0.1)),
    priorityScore: rubric.priorityConceptIds.includes(
      submission.priorityConceptId,
    )
      ? 1
      : 0,
    missedConceptIds: rubric.concepts
      .filter(
        (concept) => concept.required && !uniqueConceptIds.has(concept.conceptId),
      )
      .map((concept) => concept.conceptId),
  };
}
