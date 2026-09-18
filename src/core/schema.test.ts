import { describe, expect, it } from "vitest";
import {
  CaseEventSchema,
  CaseDefinitionSchema,
  CommittedResponseChainSchema,
  DiagnosticOutcomeSchema,
  LearningEvidenceRecordSchema,
} from "./schema";

function validCase() {
  return {
    id: "sample-case",
    version: 1,
    title: "Sample case",
    category: "profitability",
    difficulty: "beginner",
    prompt: "Revenue is growing, but profit is shrinking.",
    objective: "Find the primary profit driver and recommend a response.",
    clarificationOptions: [
      {
        id: "metric",
        label: "Which profit metric matters?",
        response: "Focus on EBITDA margin.",
        highValue: true,
      },
    ],
    facts: [{ id: "cost-fact", text: "Variable cost rose 20%." }],
    investigationNodes: [
      {
        id: "costs",
        conceptId: "variable_cost",
        label: "Break down costs",
        interviewerResponse: "Variable cost rose 20%.",
        factIds: ["cost-fact"],
        exhibitIds: ["cost-exhibit"],
        prerequisiteNodeIds: [],
        critical: true,
        rootCause: false,
        value: "high",
      },
    ],
    exhibits: [
      {
        id: "cost-exhibit",
        title: "Cost change",
        type: "table",
        unit: "$m",
        sourceFactIds: ["cost-fact"],
        columns: ["Category", "Current"],
        rows: [["Variable cost", 12]],
        series: [],
        insights: [
          {
            id: "cost-up",
            label: "Variable cost explains the decline.",
            strength: 1,
          },
        ],
      },
    ],
    calculations: [],
    frameworkRubric: {
      concepts: [
        { conceptId: "revenue", weight: 1, required: true },
        { conceptId: "variable_cost", weight: 2, required: true },
      ],
      overlapGroups: [["fixed_cost", "variable_cost"]],
      priorityConceptIds: ["variable_cost"],
    },
    recommendation: {
      minimumEvidence: 1,
      decisions: [
        {
          id: "fix-costs",
          label: "Address variable costs",
          supportingEvidenceIds: ["cost-fact"],
          weight: 1,
        },
      ],
      risks: [{ id: "service-risk", label: "Service levels could fall." }],
      nextSteps: [{ id: "pilot", label: "Pilot the change." }],
    },
    efficientPaths: [
      { id: "cost-path", label: "Cost-first path", nodeIds: ["costs"] },
    ],
  };
}

describe("CaseDefinitionSchema", () => {
  it("accepts a complete deterministic case", () => {
    expect(CaseDefinitionSchema.safeParse(validCase()).success).toBe(true);
  });

  it("rejects a case without an objective", () => {
    const definition = validCase();
    Reflect.deleteProperty(definition, "objective");

    expect(CaseDefinitionSchema.safeParse(definition).success).toBe(false);
  });

  it("rejects an exhibit that references an unknown fact", () => {
    const definition = validCase();
    definition.exhibits[0].sourceFactIds = ["missing-fact"];

    const result = CaseDefinitionSchema.safeParse(definition);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("unknown fact");
    }
  });

  it("rejects a recommendation rubric with no evidence requirement", () => {
    const definition = validCase();
    definition.recommendation.minimumEvidence = 0;

    expect(CaseDefinitionSchema.safeParse(definition).success).toBe(false);
  });
});

describe("V2 learning contracts", () => {
  const v2Record = {
    interactionId: "opening-alpinefit",
    skillId: "clarification",
    scoringVersion: "v2",
    contentVersion: 2,
    eventSchemaVersion: 2,
    scaffoldingLevel: "beginner",
    responses: [
      {
        responseId: "opening-r1",
        interactionId: "opening-alpinefit",
        revision: 1,
        revisionOf: null,
        responseKind: "case_opening",
        text: "We need to identify the main profit decline driver.",
        committedAtMs: 100,
      },
      {
        responseId: "opening-r2",
        interactionId: "opening-alpinefit",
        revision: 2,
        revisionOf: "opening-r1",
        responseKind: "case_opening",
        text: "We need to identify and size the controllable profit decline driver.",
        committedAtMs: 200,
      },
    ],
    rubricOutcomes: [{ criterionId: "objective-restated", met: true }],
    diagnostics: [
      {
        code: "strong_opening",
        source: "self_assessment",
        severity: "strength",
        responseId: "opening-r1",
      },
    ],
  } as const;

  it("keeps legacy V1 data parseable", () => {
    expect(
      LearningEvidenceRecordSchema.safeParse({
        interactionId: "legacy-structure",
        skillId: "structure",
        scoringVersion: "v1",
      }).success,
    ).toBe(true);
  });

  it("accepts complete V2 evidence and a linked revision chain", () => {
    expect(LearningEvidenceRecordSchema.safeParse(v2Record).success).toBe(true);
  });

  it("rejects invalid diagnostic sources", () => {
    const result = DiagnosticOutcomeSchema.safeParse({
      code: "strong_opening",
      source: "author",
      severity: "strength",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["source"]);
  });

  it("rejects broken revision links with a useful path", () => {
    const result = CommittedResponseChainSchema.safeParse([
      v2Record.responses[0],
      { ...v2Record.responses[1], revisionOf: "missing-response" },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual([1, "revisionOf"]);
  });

  it("requires version and scaffolding metadata for V2", () => {
    const missingVersion: Record<string, unknown> = { ...v2Record };
    Reflect.deleteProperty(missingVersion, "contentVersion");
    const result = LearningEvidenceRecordSchema.safeParse(missingVersion);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("contentVersion"))).toBe(true);
    }
  });

  it("rejects V2-only metadata on a legacy record", () => {
    expect(
      LearningEvidenceRecordSchema.safeParse({
        interactionId: "mixed",
        skillId: "structure",
        scoringVersion: "v1",
        contentVersion: 2,
        eventSchemaVersion: 2,
        scaffoldingLevel: "beginner",
      }).success,
    ).toBe(false);
  });
});

describe("versioned framework events", () => {
  it("keeps legacy flat framework events parseable", () => {
    expect(CaseEventSchema.safeParse({
      type: "framework_submitted",
      conceptIds: ["revenue", "cost"],
      priorityConceptId: "cost",
      atMs: 1,
    }).success).toBe(true);
  });

  it("preserves an ordered V2 tree and committed rationale", () => {
    const event = {
      type: "framework_submitted",
      eventSchemaVersion: 2,
      branches: [
        {
          conceptId: "cost",
          children: [
            { conceptId: "fixed_cost", children: [] },
            { conceptId: "variable_cost", children: [] },
          ],
        },
        { conceptId: "revenue", children: [] },
      ],
      priorityConceptId: "variable_cost",
      rationale: "Costs changed faster than revenue.",
      atMs: 2,
    } as const;
    expect(CaseEventSchema.parse(event)).toEqual(event);
    expect(CaseEventSchema.safeParse({ ...event, insightIds: [] }).success).toBe(true);
    expect(CaseEventSchema.safeParse({ ...event, authoredComparisonViewed: false }).success).toBe(true);
  });
});

describe("V2 exhibit interpretation events", () => {
  it("retains committed revisions, self-check evidence, and the selected insight", () => {
    const event = {
      type: "exhibit_interpretation_submitted",
      eventSchemaVersion: 2,
      exhibitId: "cost-category",
      responses: [{
        responseId: "response-1",
        interactionId: "cost-interpretation",
        revision: 1,
        revisionOf: null,
        responseKind: "exhibit_interpretation",
        text: "Labor is the outlier.",
        committedAtMs: 10,
      }],
      rubricOutcomes: [{ criterionId: "comparison", met: true }],
      diagnostics: [{
        code: "strong_exhibit_chain",
        source: "self_assessment",
        severity: "strength",
        responseId: "response-1",
      }],
      insightIds: ["labor-outlier"],
      authoredComparisonViewed: true,
      atMs: 20,
    } as const;

    expect(CaseEventSchema.parse(event)).toEqual(event);
  });
});

describe("V2 hypothesis events", () => {
  it("preserves initial and evidence-linked update contracts", () => {
    expect(CaseEventSchema.safeParse({
      type: "hypothesis_formed",
      eventSchemaVersion: 2,
      hypothesisId: "cost-pressure",
      evidenceIds: [],
      revisionOfResponseId: null,
      responses: [{
        responseId: "hypothesis-1",
        interactionId: "initial-hypothesis",
        revision: 1,
        revisionOf: null,
        responseKind: "initial_hypothesis",
        text: "Costs are likely driving the decline.",
        committedAtMs: 1,
      }],
      rubricOutcomes: [{ criterionId: "testable", met: true }],
      diagnostics: [],
      rationale: "Costs are likely driving the decline.",
      authoredComparisonViewed: true,
      atMs: 2,
    }).success).toBe(true);

    expect(CaseEventSchema.safeParse({
      type: "hypothesis_updated",
      eventSchemaVersion: 2,
      status: "reject",
      previousHypothesisId: "revenue-pressure",
      hypothesisId: "cost-pressure",
      evidenceIds: ["cost-growth"],
      revisionOfResponseId: "hypothesis-1",
      responses: [{
        responseId: "hypothesis-2",
        interactionId: "hypothesis-update",
        revision: 1,
        revisionOf: null,
        responseKind: "hypothesis_update",
        text: "The evidence rejects the prior view.",
        committedAtMs: 3,
      }],
      rubricOutcomes: [{ criterionId: "evidence", met: true }],
      diagnostics: [],
      rationale: "The evidence rejects the prior view.",
      authoredComparisonViewed: true,
      atMs: 4,
    }).success).toBe(false);
  });
});
