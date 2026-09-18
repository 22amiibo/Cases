import { describe, expect, it } from "vitest";
import {
  activeCaseVersions,
  caseDefinitions,
  getCaseDefinition,
} from "@/content/cases";
import { MemoryPracticeRepository } from "@/data/memory-repository";
import { toLearnerCaseReview } from "./learner-case";
import { CaseEventSchema, LearningEvidenceRecordSchema } from "./schema";

describe("V3 compatibility baseline", () => {
  it("preserves the released active case versions", () => {
    expect(activeCaseVersions).toEqual({
      "alpinefit-profitability": 2,
      "northstar-profitability": 1,
      "fleetfix-market-entry": 1,
      "paypilot-growth": 2,
      "goldenloaf-operations": 2,
      "morningjet-pricing-breakeven": 1,
    });
    expect(caseDefinitions.map(({ id, version }) => [id, version])).toEqual([
      ["alpinefit-profitability", 2],
      ["northstar-profitability", 1],
      ["fleetfix-market-entry", 1],
      ["paypilot-growth", 2],
      ["goldenloaf-operations", 2],
      ["morningjet-pricing-breakeven", 1],
    ]);
  });

  it("keeps representative V1 and V2 evidence parseable without relabeling", () => {
    const legacy = LearningEvidenceRecordSchema.parse({
      interactionId: "legacy-structure",
      skillId: "structure",
      scoringVersion: "v1",
    });
    const v2 = LearningEvidenceRecordSchema.parse({
      interactionId: "alpinefit-opening",
      skillId: "clarification",
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      responses: [{
        responseId: "opening-1",
        interactionId: "alpinefit-opening",
        revision: 1,
        revisionOf: null,
        responseKind: "case_opening",
        text: "Identify and size the controllable profit decline driver.",
        committedAtMs: 1,
      }],
      rubricOutcomes: [{ criterionId: "objective-restated", met: true }],
      diagnostics: [{
        code: "strong_opening",
        source: "self_assessment",
        severity: "strength",
        responseId: "opening-1",
      }],
    });

    expect(legacy).toEqual({
      interactionId: "legacy-structure",
      skillId: "structure",
      scoringVersion: "v1",
    });
    expect(v2).toMatchObject({
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
    });
  });

  it("preserves representative V1 and V2 replay projections", () => {
    const definition = getCaseDefinition("alpinefit-profitability", 2)!;
    const legacyEvent = CaseEventSchema.parse({
      type: "framework_submitted",
      conceptIds: ["revenue", "variable_cost"],
      priorityConceptId: "variable_cost",
      atMs: 1,
    });
    const v2Event = CaseEventSchema.parse({
      type: "framework_submitted",
      eventSchemaVersion: 2,
      branches: [{
        conceptId: "variable_cost",
        children: [{ conceptId: "labor", children: [] }],
      }],
      priorityConceptId: "labor",
      rationale: "Labor is the largest actionable cost change.",
      atMs: 2,
    });

    expect(toLearnerCaseReview(definition, [legacyEvent]).framework).toEqual({
      branches: [
        { conceptId: "revenue", children: [] },
        { conceptId: "variable_cost", children: [] },
      ],
      priorityConceptId: "variable_cost",
      rationale: null,
      source: "legacy_flattened",
    });
    expect(toLearnerCaseReview(definition, [v2Event]).framework).toEqual({
      branches: [{
        conceptId: "variable_cost",
        children: [{ conceptId: "labor", children: [] }],
      }],
      priorityConceptId: "labor",
      rationale: "Labor is the largest actionable cost change.",
      source: "v2_hierarchy",
    });
  });

  it("keeps V1 and V2 attempt history separated", async () => {
    const storage = {
      getItem: () => JSON.stringify({
        drillAttempts: [{
          attemptId: "legacy-attempt",
          userId: "user-1",
          drillId: "legacy-structure",
          skillId: "structure",
          score: 80,
          feedbackCodes: [],
          conceptIdsPracticed: ["revenue"],
          completedAt: "2026-09-16T00:00:00.000Z",
          scoringVersion: "v1",
          contentVersion: null,
          eventSchemaVersion: null,
          scaffoldingLevel: null,
          learningEvidence: null,
          diagnostics: [],
        }, {
          attemptId: "v2-attempt",
          userId: "user-1",
          drillId: "alpinefit-opening-clarification",
          skillId: "clarification",
          score: 0,
          feedbackCodes: ["strong_opening"],
          conceptIdsPracticed: ["objective"],
          completedAt: "2026-09-17T00:00:00.000Z",
          scoringVersion: "v2",
          contentVersion: 2,
          eventSchemaVersion: 2,
          scaffoldingLevel: "beginner",
          learningEvidence: {
            interactionId: "alpinefit-opening",
            skillId: "clarification",
            scoringVersion: "v2",
            contentVersion: 2,
            eventSchemaVersion: 2,
            scaffoldingLevel: "beginner",
            responses: [{
              responseId: "opening-1",
              interactionId: "alpinefit-opening",
              revision: 1,
              revisionOf: null,
              responseKind: "case_opening",
              text: "Identify the controllable profit decline driver.",
              committedAtMs: 1,
            }],
            rubricOutcomes: [],
            diagnostics: [],
          },
          diagnostics: [],
        }],
        caseAttempts: [],
      }),
      setItem: () => undefined,
    };
    const history = await new MemoryPracticeRepository({ storage })
      .getSkillHistory("user-1");

    expect(history.map(({ attemptId, scoringVersion }) => ({
      attemptId,
      scoringVersion,
    }))).toEqual([
      { attemptId: "v2-attempt", scoringVersion: "v2" },
      { attemptId: "legacy-attempt", scoringVersion: "v1" },
    ]);
  });
});
