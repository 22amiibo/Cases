import type {
  CaseDefinition,
  CaseEvent,
  FrameworkBranch,
  FrameworkSubmission,
} from "./schema";

export type FrameworkSubmittedEvent = Extract<
  CaseEvent,
  { type: "framework_submitted" }
>;

export function flattenFrameworkConceptIds(branches: FrameworkBranch[]): string[] {
  return branches.flatMap((branch) => [
    branch.conceptId,
    ...flattenFrameworkConceptIds(branch.children),
  ]);
}

export function isV2FrameworkEvent(
  event: FrameworkSubmittedEvent,
): event is Extract<FrameworkSubmittedEvent, { eventSchemaVersion: 2 }> {
  return "branches" in event;
}

export function frameworkSubmissionFromEvent(
  event: FrameworkSubmittedEvent,
): FrameworkSubmission {
  if (isV2FrameworkEvent(event)) {
    return {
      branches: event.branches,
      priorityConceptId: event.priorityConceptId,
      rationale: event.rationale,
    };
  }
  return {
    branches: event.conceptIds.map((conceptId) => ({ conceptId, children: [] })),
    priorityConceptId: event.priorityConceptId,
  };
}

export function isFrameworkEventCompatible(
  definition: CaseDefinition,
  event: FrameworkSubmittedEvent,
) {
  return definition.version >= 2
    ? isV2FrameworkEvent(event)
    : !isV2FrameworkEvent(event);
}
