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
  if (event.type === "node_investigated") {
    const node = session.caseDefinition.investigationNodes.find(
      (candidate) => candidate.id === event.nodeId,
    );
    const visited = investigatedNodeIds(session.events);

    if (
      !node ||
      !node.prerequisiteNodeIds.every((nodeId) => visited.has(nodeId))
    ) {
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
