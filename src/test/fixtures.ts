export const legacyLearningEvidenceFixture = {
  interactionId: "legacy-structure",
  skillId: "structure",
  scoringVersion: "v1",
} as const;

export const v2LearningEvidenceFixture = {
  interactionId: "alpinefit-opening",
  skillId: "clarification",
  scoringVersion: "v2",
  contentVersion: 2,
  eventSchemaVersion: 2,
  scaffoldingLevel: "beginner",
  responses: [
    {
      responseId: "alpinefit-opening-r1",
      interactionId: "alpinefit-opening",
      revision: 1,
      revisionOf: null,
      responseKind: "case_opening",
      text: "Identify the primary profit decline driver.",
      committedAtMs: 1,
    },
  ],
  rubricOutcomes: [{ criterionId: "objective-restated", met: true }],
  diagnostics: [],
} as const;
