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

const manualSolveFixtures = [
  {
    caseId: "alpinefit-profitability",
    rootCauseNodeId: "turnover",
    preferredDecisionId: "stabilize-staffing",
    decisiveEvidenceIds: [
      "labor-growth",
      "overtime-spike",
      "turnover-link",
      "incremental-labor",
    ],
  },
  {
    caseId: "northstar-profitability",
    rootCauseNodeId: "repricing_lag",
    preferredDecisionId: "accelerate-repricing",
    decisiveEvidenceIds: [
      "input-inflation",
      "annual-repricing",
      "repricing-lag",
      "indexed-performance",
      "renewal-window",
    ],
  },
  {
    caseId: "fleetfix-market-entry",
    rootCauseNodeId: "expected-adoption",
    preferredDecisionId: "stage-entry",
    decisiveEvidenceIds: [
      "serviceable-vehicles",
      "year-two-penetration",
      "annual-contribution",
      "launch-fixed-cost",
      "break-even-fleet",
    ],
  },
  {
    caseId: "paypilot-growth",
    rootCauseNodeId: "compare-options",
    preferredDecisionId: "choose-cross-sell",
    decisiveEvidenceIds: [
      "cross-sell-contribution",
      "cross-sell-net-profit",
      "expansion-net-profit",
    ],
  },
  {
    caseId: "goldenloaf-operations",
    rootCauseNodeId: "oven-changeovers",
    preferredDecisionId: "sequence-and-flex",
    decisiveEvidenceIds: [
      "process-capacity",
      "changeover-capacity-loss",
      "sequencing-pilot",
      "peak-gap",
      "flex-hours",
    ],
  },
  {
    caseId: "morningjet-pricing-breakeven",
    rootCauseNodeId: "commercial-feasibility",
    preferredDecisionId: "launch-at-midpoint",
    decisiveEvidenceIds: [
      "contribution-mid",
      "breakeven-demand",
      "demand-buffer",
      "launch-profit",
    ],
  },
] as const;

const preferredRecommendationBundleFixtures = [
  {
    caseId: "northstar-profitability",
    decisionId: "accelerate-repricing",
    riskId: "customer-pushback",
    nextStepId: "renewal-pilot",
    riskRequiredTerms: [/indexed pricing at renewal/i],
    nextStepRequiredTerms: [],
    unsupportedTerms: [/interim surcharge/i],
  },
  {
    caseId: "fleetfix-market-entry",
    decisionId: "stage-entry",
    riskId: "single-hub-coverage",
    nextStepId: "pre-sell-gap",
    riskRequiredTerms: [/fixed cost/i, /vehicle commitments/i],
    nextStepRequiredTerms: [/4,000-vehicle threshold/i, /two-hub launch/i],
    unsupportedTerms: [/one hub/i, /second hub/i],
  },
] as const;

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
    expect(
      definitions.reduce<Record<string, number>>((counts, { definition }) => {
        counts[definition.category] = (counts[definition.category] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({
      profitability: 2,
      market_entry: 1,
      growth: 1,
      operations: 1,
      pricing: 1,
    });

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

  it("preserves the unambiguous conclusion from each manual solve-through", () => {
    for (const fixture of manualSolveFixtures) {
      const definition = getCaseDefinition(fixture.caseId);
      expect(definition, fixture.caseId).toBeDefined();
      if (!definition) continue;

      expect(
        definition.investigationNodes
          .filter((node) => node.rootCause)
          .map((node) => node.id),
        `${fixture.caseId} root cause`,
      ).toEqual([fixture.rootCauseNodeId]);

      const preferredDecision = [...definition.recommendation.decisions].sort(
        (left, right) => right.weight - left.weight,
      )[0];
      expect(preferredDecision.id, `${fixture.caseId} preferred decision`).toBe(
        fixture.preferredDecisionId,
      );
      expect(
        preferredDecision.supportingEvidenceIds,
        `${fixture.caseId} decisive evidence`,
      ).toEqual(expect.arrayContaining([...fixture.decisiveEvidenceIds]));

      for (const path of definition.efficientPaths) {
        const pathNodeIds = new Set(path.nodeIds);
        const discoverableEvidence = new Set(
          definition.investigationNodes
            .filter((node) => pathNodeIds.has(node.id))
            .flatMap((node) => node.factIds),
        );
        definition.calculations
          .filter((calculation) =>
            calculation.prerequisiteNodeIds.every((nodeId) =>
              pathNodeIds.has(nodeId),
            ),
          )
          .forEach((calculation) =>
            discoverableEvidence.add(calculation.evidenceFactId),
          );

        expect(
          fixture.decisiveEvidenceIds.every((factId) =>
            discoverableEvidence.has(factId),
          ),
          `${fixture.caseId} path ${path.id} decisive evidence`,
        ).toBe(true);
      }
    }
  });

  it("keeps learner-facing preferred recommendation bundles within supported actions", () => {
    for (const fixture of preferredRecommendationBundleFixtures) {
      const definition = getCaseDefinition(fixture.caseId);
      expect(definition, fixture.caseId).toBeDefined();
      if (!definition) continue;

      const decision = definition.recommendation.decisions.find(
        ({ id }) => id === fixture.decisionId,
      );
      const risk = definition.recommendation.risks.find(
        ({ id }) => id === fixture.riskId,
      );
      const nextStep = definition.recommendation.nextSteps.find(
        ({ id }) => id === fixture.nextStepId,
      );
      expect(decision, `${fixture.caseId} decision`).toBeDefined();
      expect(risk, `${fixture.caseId} risk`).toBeDefined();
      expect(nextStep, `${fixture.caseId} next step`).toBeDefined();
      if (!decision || !risk || !nextStep) continue;

      fixture.riskRequiredTerms.forEach((term) => {
        expect(risk.label, `${fixture.caseId} risk`).toMatch(term);
      });
      fixture.nextStepRequiredTerms?.forEach((term) => {
        expect(nextStep.label, `${fixture.caseId} next step`).toMatch(term);
      });

      const bundleText = [decision.label, risk.label, nextStep.label].join(" ");
      fixture.unsupportedTerms.forEach((term) => {
        expect(bundleText, `${fixture.caseId} unsupported action`).not.toMatch(term);
      });
    }
  });
});
