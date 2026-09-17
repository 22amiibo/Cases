import { scoreFramework } from "./framework-scoring";
import type { CaseDefinition, CaseEvent } from "./schema";
import { withinTolerance } from "./validation";
import { frameworkSubmissionFromEvent } from "./framework-events";

export type CaseScore = {
  clarification: number;
  structure: number;
  prioritization: number;
  quantitative: number;
  exhibit: number;
  synthesis: number;
  recommendation: number;
  diagnostic: {
    criticalNodesFound: string[];
    criticalNodesMissed: string[];
    lowValueInvestigations: string[];
    repeatedInvestigations: string[];
  };
};

function roundScore(value: number) {
  return Math.round(value * 1000) / 1000;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function investigatedNodeIds(events: CaseEvent[], definition: CaseDefinition) {
  const knownNodeIds = new Set(definition.investigationNodes.map((node) => node.id));
  return events
    .filter(
      (event): event is Extract<CaseEvent, { type: "node_investigated" }> =>
        event.type === "node_investigated" && knownNodeIds.has(event.nodeId),
    )
    .map((event) => event.nodeId);
}

function investigatedNodeIdsBefore(
  events: CaseEvent[],
  definition: CaseDefinition,
  beforeAtMs: number,
) {
  return investigatedNodeIds(
    events.filter((event) => event.atMs < beforeAtMs),
    definition,
  );
}

export function getDiscoveredFactIdsBefore(
  definition: CaseDefinition,
  events: CaseEvent[],
  beforeAtMs: number,
) {
  const nodeIds = investigatedNodeIdsBefore(events, definition, beforeAtMs);
  const visited = new Set(nodeIds);
  const facts = definition.investigationNodes.flatMap((node) =>
    visited.has(node.id) ? node.factIds : [],
  );

  events.forEach((event) => {
    if (event.type !== "calculation_submitted" || event.atMs >= beforeAtMs) {
      return;
    }

    const calculation = definition.calculations.find(
      (candidate) => candidate.id === event.taskId,
    );
    const nodesBeforeCalculation = new Set(
      investigatedNodeIdsBefore(events, definition, event.atMs),
    );
    if (
      calculation &&
      isCorrectCalculation(calculation, event.answer, nodesBeforeCalculation)
    ) {
      facts.push(calculation.evidenceFactId);
    }
  });

  return new Set(facts);
}

function isCorrectCalculation(
  calculation: CaseDefinition["calculations"][number],
  answer: number,
  visitedNodeIds: Set<string>,
) {
  return (
    calculation.prerequisiteNodeIds.every((nodeId) => visitedNodeIds.has(nodeId)) &&
    withinTolerance(answer, calculation.expectedAnswer, calculation.tolerance)
  );
}

function scoreClarification(definition: CaseDefinition, events: CaseEvent[]) {
  const highValueIds = new Set(
    definition.clarificationOptions
      .filter((option) => option.highValue)
      .map((option) => option.id),
  );
  return events.some(
    (event) =>
      event.type === "clarification_selected" &&
      highValueIds.has(event.clarificationId),
  )
    ? 1
    : 0;
}

function scoreStructure(definition: CaseDefinition, events: CaseEvent[]) {
  const submissions = events.filter(
    (event): event is Extract<CaseEvent, { type: "framework_submitted" }> =>
      event.type === "framework_submitted",
  );
  const submission = submissions.at(-1);
  if (!submission) {
    return { structure: 0, prioritization: 0 };
  }

  const frameworkScore = scoreFramework(
    frameworkSubmissionFromEvent(submission),
    definition.frameworkRubric,
  );

  return {
    structure: roundScore(
      Math.max(0, frameworkScore.coverage - frameworkScore.overlapPenalty),
    ),
    prioritization: frameworkScore.priorityScore,
  };
}

function scoreQuantitative(
  definition: CaseDefinition,
  events: CaseEvent[],
) {
  if (definition.calculations.length === 0) {
    return 0;
  }

  const correctCalculationIds = new Set(
    events.flatMap((event) => {
      if (event.type !== "calculation_submitted") {
        return [];
      }
      const calculation = definition.calculations.find(
        (candidate) => candidate.id === event.taskId,
      );
      const nodesBeforeCalculation = new Set(
        investigatedNodeIdsBefore(events, definition, event.atMs),
      );
      return calculation &&
        isCorrectCalculation(calculation, event.answer, nodesBeforeCalculation)
        ? [calculation.id]
        : [];
    }),
  );

  return roundScore(correctCalculationIds.size / definition.calculations.length);
}

function scoreExhibits(
  definition: CaseDefinition,
  events: CaseEvent[],
  nodeIds: string[],
) {
  if (definition.exhibits.length === 0) {
    return 0;
  }

  const visited = new Set(nodeIds);
  const revealedExhibitIds = new Set(
    definition.investigationNodes.flatMap((node) =>
      visited.has(node.id) ? node.exhibitIds : [],
    ),
  );

  const exhibitScores = definition.exhibits.map((exhibit) => {
    if (!revealedExhibitIds.has(exhibit.id)) {
      return 0;
    }
    const submittedInsightIds = new Set(
      events.flatMap((event) =>
        event.type === "exhibit_insight_submitted" && event.exhibitId === exhibit.id
          ? event.insightIds
          : event.type === "exhibit_interpretation_submitted" &&
              event.exhibitId === exhibit.id
            ? event.insightIds
          : [],
      ),
    );
    return Math.max(
      0,
      ...exhibit.insights
        .filter((insight) => submittedInsightIds.has(insight.id))
        .map((insight) => insight.strength),
    );
  });

  return roundScore(
    exhibitScores.reduce((total, score) => total + score, 0) /
      definition.exhibits.length,
  );
}

export function isValidSynthesisSubmission(
  definition: CaseDefinition,
  events: CaseEvent[],
  event: Extract<CaseEvent, { type: "synthesis_submitted" }>,
) {
  const nodeIds = new Set(definition.investigationNodes.map((node) => node.id));
  if (!nodeIds.has(event.nextStepNodeId)) return false;

  const discoveredFacts = getDiscoveredFactIdsBefore(
    definition,
    events,
    event.atMs,
  );
  const discoveredEvidenceCount = unique(event.evidenceIds).filter((factId) =>
    discoveredFacts.has(factId),
  ).length;
  return discoveredEvidenceCount >= definition.recommendation.minimumEvidence;
}

function scoreSynthesis(definition: CaseDefinition, events: CaseEvent[]) {
  return events.some(
    (event) =>
      event.type === "synthesis_submitted" &&
      isValidSynthesisSubmission(definition, events, event),
  )
    ? 1
    : 0;
}

function scoreRecommendation(
  definition: CaseDefinition,
  events: CaseEvent[],
) {
  const riskIds = new Set(definition.recommendation.risks.map((risk) => risk.id));
  const nextStepIds = new Set(
    definition.recommendation.nextSteps.map((nextStep) => nextStep.id),
  );

  return roundScore(
    Math.max(
      0,
      ...events.flatMap((event) => {
        if (event.type !== "recommendation_submitted") {
          return [];
        }
        const discoveredFacts = getDiscoveredFactIdsBefore(
          definition,
          events,
          event.atMs,
        );
        const decision = definition.recommendation.decisions.find(
          (candidate) => candidate.id === event.decisionId,
        );
        if (
          !decision ||
          !riskIds.has(event.riskId) ||
          !nextStepIds.has(event.nextStepId)
        ) {
          return [0];
        }
        const supportedDiscoveredEvidence = unique(event.evidenceIds).filter(
          (factId) =>
            discoveredFacts.has(factId) &&
            decision.supportingEvidenceIds.includes(factId),
        );
        return supportedDiscoveredEvidence.length >=
          definition.recommendation.minimumEvidence
          ? [decision.weight]
          : [0];
      }),
    ),
  );
}

function diagnostics(definition: CaseDefinition, nodeIds: string[]) {
  const visited = new Set(nodeIds);
  const repeatedInvestigations = unique(
    nodeIds.filter((nodeId, index) => nodeIds.indexOf(nodeId) !== index),
  );

  return {
    criticalNodesFound: definition.investigationNodes
      .filter((node) => node.critical && visited.has(node.id))
      .map((node) => node.id),
    criticalNodesMissed: definition.investigationNodes
      .filter((node) => node.critical && !visited.has(node.id))
      .map((node) => node.id),
    lowValueInvestigations: unique(
      nodeIds.filter(
        (nodeId) =>
          definition.investigationNodes.find((node) => node.id === nodeId)?.value ===
          "low",
      ),
    ),
    repeatedInvestigations,
  };
}

export function scoreCase(
  definition: CaseDefinition,
  events: CaseEvent[],
): CaseScore {
  const nodeIds = investigatedNodeIds(events, definition);
  const framework = scoreStructure(definition, events);

  return {
    clarification: scoreClarification(definition, events),
    structure: framework.structure,
    prioritization: framework.prioritization,
    quantitative: scoreQuantitative(definition, events),
    exhibit: scoreExhibits(definition, events, nodeIds),
    synthesis: scoreSynthesis(definition, events),
    recommendation: scoreRecommendation(definition, events),
    diagnostic: diagnostics(definition, nodeIds),
  };
}
