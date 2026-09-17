import { describe, expect, it } from "vitest";
import { CaseDefinitionSchema } from "@/core/schema";
import { assertValidCase } from "@/core/validation";
import {
  applyCaseEvent,
  createCaseSession,
  getAvailableActions,
} from "@/core/case-engine";
import { caseDefinitions, getCaseDefinition } from ".";

const caseModules = import.meta.glob("./*.json", {
  eager: true,
  import: "default",
});

describe("case content", () => {
  it("publishes every authored case through the runtime registry", () => {
    expect(caseDefinitions).toHaveLength(6);
    for (const definition of caseDefinitions) {
      expect(getCaseDefinition(definition.id)).toBe(definition);
    }
    expect(getCaseDefinition("missing-case")).toBeUndefined();
  });

  it("contains validated case definitions", () => {
    expect(Object.keys(caseModules).length).toBeGreaterThan(0);

    Object.entries(caseModules).forEach(([path, content]) => {
      const definition = CaseDefinitionSchema.parse(content);
      expect(() => assertValidCase(definition), path).not.toThrow();
    });
  });

  it("contains the complete six-case MVP library with required depth", () => {
    const definitions = Object.entries(caseModules).map(([path, content]) => ({
      path,
      definition: CaseDefinitionSchema.parse(content),
    }));

    expect(definitions).toHaveLength(6);
    expect(definitions.filter(({ definition }) => definition.calculations.length > 0))
      .toHaveLength(4);

    for (const { path, definition } of definitions) {
      expect(definition.exhibits.length, `${path} exhibits`).toBeGreaterThanOrEqual(2);
      expect(
        definition.investigationNodes.some(
          (node) => !node.critical && node.value !== "low",
        ),
        `${path} relevant noncritical branch`,
      ).toBe(true);
      expect(
        definition.investigationNodes.some((node) => node.value === "low"),
        `${path} decoy branch`,
      ).toBe(true);
      expect(
        definition.efficientPaths.length,
        `${path} alternate efficient path`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("supports a clean deterministic solve through every efficient path", () => {
    Object.entries(caseModules).forEach(([path, content]) => {
      const definition = CaseDefinitionSchema.parse(content);

      definition.efficientPaths.forEach((efficientPath, pathIndex) => {
        let atMs = 1;
        const clarification =
          definition.clarificationOptions.find((option) => option.highValue) ??
          definition.clarificationOptions[0];
        let session = applyCaseEvent(createCaseSession(definition), {
          type: "clarification_selected",
          clarificationId: clarification.id,
          atMs: atMs++,
        });
        const priorityConceptId = definition.frameworkRubric.priorityConceptIds[0];
        const frameworkConceptIds = [
          priorityConceptId,
          ...definition.frameworkRubric.concepts
            .map(({ conceptId }) => conceptId)
            .filter((conceptId) => conceptId !== priorityConceptId),
        ].slice(0, 4);
        session = applyCaseEvent(session, {
          type: "framework_submitted",
          conceptIds: frameworkConceptIds,
          priorityConceptId,
          atMs: atMs++,
        });

        efficientPath.nodeIds.forEach((nodeId) => {
          expect(
            getAvailableActions(session).map(({ id }) => id),
            `${path} path ${efficientPath.id} step ${nodeId}`,
          ).toContain(nodeId);
          session = applyCaseEvent(session, {
            type: "node_investigated",
            nodeId,
            atMs: atMs++,
          });
        });

        const visited = new Set(efficientPath.nodeIds);
        definition.calculations
          .filter((calculation) =>
            calculation.prerequisiteNodeIds.every((nodeId) => visited.has(nodeId)),
          )
          .forEach((calculation) => {
            session = applyCaseEvent(session, {
              type: "calculation_submitted",
              taskId: calculation.id,
              answer: calculation.expectedAnswer,
              atMs: atMs++,
            });
          });

        const bestDecision = [...definition.recommendation.decisions].sort(
          (left, right) => right.weight - left.weight,
        )[0];
        const evidenceIds = bestDecision.supportingEvidenceIds.filter((factId) =>
          session.revealedFactIds.includes(factId),
        );
        expect(
          evidenceIds.length,
          `${path} path ${efficientPath.id} recommendation evidence`,
        ).toBeGreaterThanOrEqual(definition.recommendation.minimumEvidence);

        const nextAction = getAvailableActions(session)[0];
        expect(nextAction, `${path} path ${efficientPath.id} next action`).toBeDefined();
        session = applyCaseEvent(session, {
          type: "synthesis_submitted",
          evidenceIds,
          nextStepNodeId: nextAction.id,
          atMs: atMs++,
        });
        session = applyCaseEvent(session, {
          type: "recommendation_submitted",
          decisionId: bestDecision.id,
          evidenceIds,
          riskId: definition.recommendation.risks[0].id,
          nextStepId: definition.recommendation.nextSteps[0].id,
          atMs: atMs++,
        });

        expect(session.currentStage, `${path} path ${pathIndex}`).toBe("complete");
      });
    });
  });
});
