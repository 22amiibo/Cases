import concepts from "@/content/concepts.json";
import type { CaseDefinition, CaseEvent } from "./schema";
import { withinTolerance } from "./validation";

export type CaseStage =
  | "clarify"
  | "structure"
  | "investigate"
  | "recommend"
  | "complete";

export type CaseSession = {
  caseDefinition: CaseDefinition;
  events: CaseEvent[];
  revealedFactIds: string[];
  revealedExhibitIds: string[];
  completedCalculationIds: string[];
  currentStage: CaseStage;
};

export type AvailableAction = {
  id: string;
  conceptId: string;
  label: string;
  interviewerResponse: string;
};

export type RevealedFact = CaseDefinition["facts"][number];

function unique(values: string[]) {
  return [...new Set(values)];
}

function investigatedNodeIds(events: CaseEvent[]) {
  return new Set(
    events
      .filter((event) => event.type === "node_investigated")
      .map((event) => event.nodeId),
  );
}

function includesId(items: Array<{ id: string }>, id: string) {
  return items.some((item) => item.id === id);
}

const canonicalConceptIds = new Set(concepts.map(({ id }) => id));

export function isCaseEventAllowed(
  session: CaseSession,
  event: CaseEvent,
): boolean {
  const { caseDefinition, currentStage } = session;
  const visited = investigatedNodeIds(session.events);
  const revealedFacts = new Set(session.revealedFactIds);

  switch (event.type) {
    case "clarification_selected":
      return (
        (currentStage === "clarify" || currentStage === "structure") &&
        !session.events.some((candidate) => candidate.type === "framework_submitted") &&
        includesId(caseDefinition.clarificationOptions, event.clarificationId)
      );
    case "framework_submitted": {
      return (
        currentStage === "structure" &&
        event.conceptIds.every((conceptId) => canonicalConceptIds.has(conceptId)) &&
        event.conceptIds.includes(event.priorityConceptId)
      );
    }
    case "node_investigated": {
      const node = caseDefinition.investigationNodes.find(
        (candidate) => candidate.id === event.nodeId,
      );
      return Boolean(
        currentStage === "investigate" &&
          node &&
          node.prerequisiteNodeIds.every((nodeId) => visited.has(nodeId)),
      );
    }
    case "exhibit_insight_submitted": {
      const exhibit = caseDefinition.exhibits.find(
        (candidate) => candidate.id === event.exhibitId,
      );
      return Boolean(
        currentStage === "investigate" &&
          exhibit &&
          session.revealedExhibitIds.includes(exhibit.id) &&
          event.insightIds.every((insightId) => includesId(exhibit.insights, insightId)),
      );
    }
    case "calculation_submitted": {
      const calculation = caseDefinition.calculations.find(
        (candidate) => candidate.id === event.taskId,
      );
      return Boolean(
        currentStage === "investigate" &&
          calculation &&
          calculation.prerequisiteNodeIds.every((nodeId) => visited.has(nodeId)),
      );
    }
    case "synthesis_submitted":
      return (
        currentStage === "investigate" &&
        event.evidenceIds.every((factId) => revealedFacts.has(factId)) &&
        getAvailableActions(session).some(({ id }) => id === event.nextStepNodeId)
      );
    case "recommendation_submitted":
      return (
        currentStage === "recommend" &&
        includesId(caseDefinition.recommendation.decisions, event.decisionId) &&
        includesId(caseDefinition.recommendation.risks, event.riskId) &&
        includesId(caseDefinition.recommendation.nextSteps, event.nextStepId) &&
        event.evidenceIds.every((factId) => revealedFacts.has(factId))
      );
    case "hypothesis_selected":
      return false;
  }
}

export function createCaseSession(caseDefinition: CaseDefinition): CaseSession {
  return {
    caseDefinition,
    events: [],
    revealedFactIds: [],
    revealedExhibitIds: [],
    completedCalculationIds: [],
    currentStage: "clarify",
  };
}

function nextStage(currentStage: CaseStage, event: CaseEvent): CaseStage {
  switch (event.type) {
    case "clarification_selected":
      return currentStage === "clarify" ? "structure" : currentStage;
    case "framework_submitted":
      return "investigate";
    case "synthesis_submitted":
      return "recommend";
    case "recommendation_submitted":
      return "complete";
    default:
      return currentStage;
  }
}

export function applyCaseEvent(
  session: CaseSession,
  event: CaseEvent,
): CaseSession {
  if (!isCaseEventAllowed(session, event)) return session;

  if (event.type === "node_investigated") {
    const node = session.caseDefinition.investigationNodes.find(
      (candidate) => candidate.id === event.nodeId,
    );
    const visited = investigatedNodeIds(session.events);

    if (!node || !node.prerequisiteNodeIds.every((nodeId) => visited.has(nodeId))) {
      return session;
    }

    return {
      ...session,
      events: [...session.events, event],
      revealedFactIds: unique([...session.revealedFactIds, ...node.factIds]),
      revealedExhibitIds: unique([
        ...session.revealedExhibitIds,
        ...node.exhibitIds,
      ]),
      currentStage: nextStage(session.currentStage, event),
    };
  }

  if (event.type === "calculation_submitted") {
    const calculation = session.caseDefinition.calculations.find(
      (candidate) => candidate.id === event.taskId,
    );
    const completedCalculationIds = [...session.completedCalculationIds];
    const revealedFactIds = [...session.revealedFactIds];

    if (
      calculation &&
      withinTolerance(
        event.answer,
        calculation.expectedAnswer,
        calculation.tolerance,
      )
    ) {
      completedCalculationIds.push(calculation.id);
      revealedFactIds.push(calculation.evidenceFactId);
    }

    return {
      ...session,
      events: [...session.events, event],
      completedCalculationIds: unique(completedCalculationIds),
      revealedFactIds: unique(revealedFactIds),
      currentStage: nextStage(session.currentStage, event),
    };
  }

  return {
    ...session,
    events: [...session.events, event],
    currentStage: nextStage(session.currentStage, event),
  };
}

export function getAvailableActions(session: CaseSession): AvailableAction[] {
  const visited = investigatedNodeIds(session.events);

  return session.caseDefinition.investigationNodes
    .filter(
      (node) =>
        !visited.has(node.id) &&
        node.prerequisiteNodeIds.every((nodeId) => visited.has(nodeId)),
    )
    .map(({ id, conceptId, label, interviewerResponse }) => ({
      id,
      conceptId,
      label,
      interviewerResponse,
    }));
}

export function getRevealedFacts(session: CaseSession): RevealedFact[] {
  const revealed = new Set(session.revealedFactIds);
  return session.caseDefinition.facts.filter((fact) => revealed.has(fact.id));
}
