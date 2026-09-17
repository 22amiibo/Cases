import concepts from "@/content/concepts.json";
import type { CaseDefinition, CaseEvent, DiagnosticOutcome } from "./schema";
import { withinTolerance } from "./validation";
import {
  flattenFrameworkConceptIds,
  frameworkSubmissionFromEvent,
  isFrameworkEventCompatible,
} from "./framework-events";
import {
  getCurrentHypothesisId,
  getHypothesisEvents,
  getHypothesisSystemDiagnostic,
  getLastHypothesisResponseId,
  isHypothesisLearningEvidenceValid,
} from "./hypothesis";
import { getCaseLearningCycle, type CaseCycleKind } from "./case-learning";

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

function hasCompletedRevealedExhibits(session: CaseSession) {
  const requiredIds = session.caseDefinition.exhibits
    .filter(
      (exhibit) =>
        exhibit.interpretation && session.revealedExhibitIds.includes(exhibit.id),
    )
    .map((exhibit) => exhibit.id);
  const completedIds = new Set(
    session.events.flatMap((event) =>
      event.type === "exhibit_interpretation_submitted"
        ? [event.exhibitId]
        : [],
    ),
  );
  return requiredIds.every((id) => completedIds.has(id));
}

function hasGeneratedEvidence(
  definition: CaseDefinition,
  event: CaseEvent,
  kind: CaseCycleKind,
  itemId?: string,
) {
  if (!("eventSchemaVersion" in event) || event.eventSchemaVersion !== 2) return false;
  if (!("responses" in event) || !("rubricOutcomes" in event) || !("diagnostics" in event)) return false;
  const cycle = getCaseLearningCycle(definition, kind, itemId);
  if (!cycle) return false;
  const criterionIds = new Set(cycle.criteria.map(({ id }) => id));
  const submittedIds = new Set(event.rubricOutcomes.map(({ criterionId }) => criterionId));
  const responseIds = new Set(event.responses.map(({ responseId }) => responseId));
  const authoredRules = new Set(
    cycle.diagnosticRules.map(({ code, severity }) => `${code}:${severity}`),
  );
  return (
    event.responses.every((response) =>
      response.interactionId === cycle.interactionId && response.responseKind === cycle.responseKind) &&
    event.rubricOutcomes.length === criterionIds.size &&
    submittedIds.size === criterionIds.size &&
    event.rubricOutcomes.every(({ criterionId }) => criterionIds.has(criterionId)) &&
    event.diagnostics
      .filter(({ source }) => source === "self_assessment")
      .every(({ code, severity, responseId }) =>
        authoredRules.has(`${code}:${severity}`) &&
        Boolean(responseId && responseIds.has(responseId)),
      )
  );
}

function hasExpectedSystemDiagnostic(
  event: CaseEvent,
  code: DiagnosticOutcome["code"],
  severity: DiagnosticOutcome["severity"],
) {
  if (!("responses" in event) || !("diagnostics" in event)) return false;
  const latestResponseId = event.responses.at(-1)?.responseId;
  const diagnostics = event.diagnostics.filter(({ source }) => source === "system");
  return diagnostics.length === 1 && diagnostics[0].code === code &&
    diagnostics[0].severity === severity && diagnostics[0].responseId === latestResponseId;
}

function hasCompletedAvailableCalculations(session: CaseSession) {
  if (session.caseDefinition.completeLearningLoop) {
    return session.caseDefinition.calculations
      .filter(({ responseCycle }) => responseCycle)
      .every(({ id }) => session.completedCalculationIds.includes(id));
  }
  const visited = investigatedNodeIds(session.events);
  const required = session.caseDefinition.calculations.filter((calculation) =>
    calculation.responseCycle && calculation.prerequisiteNodeIds.every((id) => visited.has(id)),
  );
  return required.every(({ id }) => session.completedCalculationIds.includes(id));
}

export function isSynthesisReady(session: CaseSession) {
  const exhibitsComplete = session.caseDefinition.completeLearningLoop
    ? session.caseDefinition.exhibits.every(({ id }) =>
        session.events.some((event) =>
          event.type === "exhibit_interpretation_submitted" && event.exhibitId === id,
        ),
      )
    : hasCompletedRevealedExhibits(session);
  return (
    (!session.caseDefinition.hypothesisPractice ||
      session.events.some(({ type }) => type === "hypothesis_updated")) &&
    exhibitsComplete &&
    (!session.caseDefinition.synthesis || hasCompletedAvailableCalculations(session))
  );
}

export function isGeneratedCaseCycleAvailable(
  session: CaseSession,
  kind: CaseCycleKind,
  itemId?: string,
) {
  const { caseDefinition, currentStage } = session;
  if (!getCaseLearningCycle(caseDefinition, kind, itemId)) return false;
  if (kind === "opening") return currentStage === "clarify";
  if (kind === "recommendation") return currentStage === "recommend";
  if (currentStage !== "investigate") return false;
  if (kind === "synthesis") return isSynthesisReady(session);

  const calculation = caseDefinition.calculations.find(({ id }) => id === itemId);
  const visited = investigatedNodeIds(session.events);
  return Boolean(
    calculation &&
      !session.completedCalculationIds.includes(calculation.id) &&
      calculation.prerequisiteNodeIds.every((nodeId) => visited.has(nodeId)),
  );
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
        !caseDefinition.opening &&
        !session.events.some((candidate) => candidate.type === "framework_submitted") &&
        includesId(caseDefinition.clarificationOptions, event.clarificationId)
      );
    case "case_opening_submitted": {
      const opening = caseDefinition.opening;
      const criterionIds = new Set(
        opening?.responseCycle.criteria.map(({ id }) => id) ?? [],
      );
      const submittedCriterionIds = new Set(
        event.rubricOutcomes.map(({ criterionId }) => criterionId),
      );
      const responseIds = new Set(event.responses.map(({ responseId }) => responseId));
      const questionIds = event.questions.map(({ questionId }) => questionId);
      const highValueCount = questionIds.filter((id) =>
        caseDefinition.clarificationOptions.some(
          (option) => option.id === id && option.highValue,
        ),
      ).length;
      const strongOpening = highValueCount >= (opening?.minimumHighValueQuestions ?? 1);
      return Boolean(
        currentStage === "clarify" &&
          caseDefinition.version >= 2 &&
          opening &&
          event.responses.every(
            (response) =>
              response.interactionId === opening.responseCycle.interactionId &&
              response.responseKind === opening.responseCycle.responseKind,
          ) &&
          submittedCriterionIds.size === criterionIds.size &&
          event.rubricOutcomes.length === criterionIds.size &&
          event.rubricOutcomes.every(({ criterionId }) => criterionIds.has(criterionId)) &&
          event.diagnostics.every(
            ({ responseId }) => !responseId || responseIds.has(responseId),
          ) &&
          event.questions.every(({ questionId, interviewerResponse }) =>
            caseDefinition.clarificationOptions.some(
              (option) =>
                option.id === questionId && option.response === interviewerResponse,
            ),
          ) &&
          new Set(questionIds).size === questionIds.length &&
          (!caseDefinition.completeLearningLoop || (
            hasGeneratedEvidence(caseDefinition, event, "opening") &&
            hasExpectedSystemDiagnostic(
              event,
              strongOpening ? "strong_opening" : "low_value_question",
              strongOpening ? "strength" : "coaching",
            )
          ))
      );
    }
    case "framework_submitted": {
      const submission = frameworkSubmissionFromEvent(event);
      const conceptIds = flattenFrameworkConceptIds(submission.branches);
      return (
        currentStage === "structure" &&
        isFrameworkEventCompatible(caseDefinition, event) &&
        conceptIds.every((conceptId) => canonicalConceptIds.has(conceptId)) &&
        conceptIds.includes(event.priorityConceptId)
      );
    }
    case "hypothesis_formed": {
      const practice = caseDefinition.hypothesisPractice;
      return Boolean(
        caseDefinition.version >= 2 &&
          practice &&
          currentStage === "investigate" &&
          getHypothesisEvents(session.events).length === 0 &&
          !session.events.some(({ type }) => type === "node_investigated") &&
          includesId(practice.options, event.hypothesisId) &&
          isHypothesisLearningEvidenceValid(caseDefinition, event),
      );
    }
    case "hypothesis_updated": {
      const practice = caseDefinition.hypothesisPractice;
      const currentHypothesisId = getCurrentHypothesisId(session.events);
      const latestResponse = event.responses.at(-1);
      const expectedDiagnostic = latestResponse && currentHypothesisId
        ? getHypothesisSystemDiagnostic(
            caseDefinition,
            currentHypothesisId,
            event.status,
            event.evidenceIds,
            latestResponse.responseId,
          )
        : null;
      const selectionValid = event.status === "reject"
        ? event.hypothesisId === null
        : event.hypothesisId !== null && includesId(practice?.options ?? [], event.hypothesisId);
      const systemDiagnostics = event.diagnostics.filter(({ source }) => source === "system");
      return Boolean(
        caseDefinition.version >= 2 &&
          practice &&
          currentStage === "investigate" &&
          currentHypothesisId &&
          event.previousHypothesisId === currentHypothesisId &&
          event.revisionOfResponseId === getLastHypothesisResponseId(session.events) &&
          event.evidenceIds.every((factId) => revealedFacts.has(factId)) &&
          selectionValid &&
          isHypothesisLearningEvidenceValid(caseDefinition, event) &&
          expectedDiagnostic &&
          systemDiagnostics.length === 1 &&
          systemDiagnostics[0].code === expectedDiagnostic.code &&
          systemDiagnostics[0].severity === expectedDiagnostic.severity &&
          systemDiagnostics[0].responseId === expectedDiagnostic.responseId,
      );
    }
    case "node_investigated": {
      const node = caseDefinition.investigationNodes.find(
        (candidate) => candidate.id === event.nodeId,
      );
      return Boolean(
        currentStage === "investigate" &&
          node &&
          (!caseDefinition.hypothesisPractice || getHypothesisEvents(session.events).length > 0) &&
          node.prerequisiteNodeIds.every((nodeId) => visited.has(nodeId)),
      );
    }
    case "exhibit_insight_submitted": {
      const exhibit = caseDefinition.exhibits.find(
        (candidate) => candidate.id === event.exhibitId,
      );
      return Boolean(
        caseDefinition.version === 1 &&
          currentStage === "investigate" &&
          exhibit &&
          session.revealedExhibitIds.includes(exhibit.id) &&
          event.insightIds.every((insightId) => includesId(exhibit.insights, insightId)),
      );
    }
    case "exhibit_interpretation_submitted": {
      const exhibit = caseDefinition.exhibits.find(
        (candidate) => candidate.id === event.exhibitId,
      );
      const interpretation = exhibit?.interpretation;
      const responseIds = new Set(event.responses.map(({ responseId }) => responseId));
      const criterionIds = new Set(interpretation?.criteria.map(({ id }) => id) ?? []);
      const submittedCriterionIds = new Set(
        event.rubricOutcomes.map(({ criterionId }) => criterionId),
      );
      const diagnosticCodes = new Set(
        interpretation?.diagnosticRules.map(({ code }) => code) ?? [],
      );
      return Boolean(
        caseDefinition.version >= 2 &&
          currentStage === "investigate" &&
          exhibit &&
          interpretation &&
          session.revealedExhibitIds.includes(exhibit.id) &&
          !session.events.some(
            (candidate) =>
              candidate.type === "exhibit_interpretation_submitted" &&
              candidate.exhibitId === exhibit.id,
          ) &&
          event.responses.every(
            (response) =>
              response.interactionId === interpretation.interactionId &&
              response.responseKind === interpretation.responseKind,
          ) &&
          event.rubricOutcomes.length === criterionIds.size &&
          submittedCriterionIds.size === criterionIds.size &&
          event.rubricOutcomes.every(({ criterionId }) =>
            criterionIds.has(criterionId),
          ) &&
          event.diagnostics.every(
            ({ responseId, source, code }) =>
              source === "self_assessment" &&
              diagnosticCodes.has(code) &&
              (!responseId || responseIds.has(responseId)),
          ) &&
          event.insightIds.every((id) => includesId(exhibit.insights, id)),
      );
    }
    case "calculation_submitted": {
      const calculation = caseDefinition.calculations.find(
        (candidate) => candidate.id === event.taskId,
      );
      return Boolean(
        currentStage === "investigate" &&
          calculation &&
          calculation.prerequisiteNodeIds.every((nodeId) => visited.has(nodeId)) &&
          (calculation.responseCycle
            ? "eventSchemaVersion" in event && event.unit === calculation.unit &&
              hasGeneratedEvidence(caseDefinition, event, "calculation", event.taskId) &&
              hasExpectedSystemDiagnostic(
                event,
                withinTolerance(event.answer, calculation.expectedAnswer, calculation.tolerance)
                  ? "strong_quantitative_reasoning"
                  : "arithmetic_error",
                withinTolerance(event.answer, calculation.expectedAnswer, calculation.tolerance)
                  ? "strength"
                  : "blocking",
              )
            : !("eventSchemaVersion" in event)),
      );
    }
    case "synthesis_submitted":
      return (
        currentStage === "investigate" &&
        isSynthesisReady(session) &&
        (!caseDefinition.synthesis ||
          (hasGeneratedEvidence(caseDefinition, event, "synthesis") &&
            hasExpectedSystemDiagnostic(
              event,
              event.evidenceIds.length >= 2 ? "strong_synthesis" : "evidence_unsupported",
              event.evidenceIds.length >= 2 ? "strength" : "coaching",
            ))) &&
        new Set(event.evidenceIds).size === event.evidenceIds.length &&
        event.evidenceIds.every((factId) => revealedFacts.has(factId)) &&
        getAvailableActions(session).some(({ id }) => id === event.nextStepNodeId)
      );
    case "recommendation_submitted":
      return (
        currentStage === "recommend" &&
        (!caseDefinition.recommendation.responseCycle ||
          (hasGeneratedEvidence(caseDefinition, event, "recommendation") &&
            hasExpectedSystemDiagnostic(
              event,
              event.evidenceIds.length >= caseDefinition.recommendation.minimumEvidence
                ? "strong_recommendation"
                : "support_insufficient",
              event.evidenceIds.length >= caseDefinition.recommendation.minimumEvidence
                ? "strength"
                : "blocking",
            ))) &&
        new Set(event.evidenceIds).size === event.evidenceIds.length &&
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

export function replayCaseEvents(
  caseDefinition: CaseDefinition,
  events: CaseEvent[],
): CaseSession | null {
  let session = createCaseSession(caseDefinition);
  for (const event of events) {
    const next = applyCaseEvent(session, event);
    if (next.events.length !== session.events.length + 1) return null;
    session = next;
  }
  return session;
}

function nextStage(currentStage: CaseStage, event: CaseEvent): CaseStage {
  switch (event.type) {
    case "clarification_selected":
      return currentStage === "clarify" ? "structure" : currentStage;
    case "case_opening_submitted":
      return "structure";
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
  if (
    session.caseDefinition.hypothesisPractice &&
    getHypothesisEvents(session.events).length === 0
  ) return [];
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
