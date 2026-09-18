import type { CaseDefinition, CaseEvent, CommittedResponse, DiagnosticOutcome } from "./schema";
import { isCorrectCalculationSubmission } from "./case-engine";

export type ReplayEvidence = { id: string; text: string; eventNumber: number };
export type CaseReplayEntry = {
  eventNumber: number;
  atMs: number;
  decision: string;
  availableEvidence: ReplayEvidence[];
  revealedEvidence: ReplayEvidence[];
  citedEvidenceIds: string[];
  unavailableEvidenceIds: string[];
  contraryEvidenceWithoutUpdate: ReplayEvidence[];
  responses: CommittedResponse[];
  diagnostics: DiagnosticOutcome[];
  nextDecision: string | null;
};

// The caller supplies the exact definition and persisted event order; ties keep that order.
export function buildCaseReplayTimeline(
  definition: CaseDefinition,
  attempt: { events: CaseEvent[]; caseMode?: "practice" | "interview" },
): CaseReplayEntry[] {
  const evidence = new Map<string, ReplayEvidence>();
  let hypothesisId: string | null = null;
  let lastHypothesisEvent = 0;
  const entries = attempt.events.map((event, index): CaseReplayEntry => {
    const eventNumber = index + 1;
    const availableEvidence = [...evidence.values()];
    const citedEvidenceIds = "evidenceIds" in event ? [...event.evidenceIds] : [];
    let decision = event.type.replaceAll("_", " ");
    let revealIds: string[] = [];
    if (event.type === "node_investigated") {
      const node = definition.investigationNodes.find(({ id }) => id === event.nodeId);
      decision = node?.label ?? event.nodeId;
      revealIds = node?.factIds ?? [];
    } else if (event.type === "calculation_submitted") {
      const calculation = definition.calculations.find(({ id }) => id === event.taskId);
      decision = `${calculation?.prompt ?? event.taskId}: ${event.answer}${"unit" in event ? ` ${event.unit}` : ""}`;
      if (calculation && (isCorrectCalculationSubmission(calculation, event) || attempt.caseMode === "interview")) {
        revealIds = [calculation.evidenceFactId];
      }
    } else if (event.type === "clarification_selected") {
      decision = definition.clarificationOptions.find(({ id }) => id === event.clarificationId)?.label ?? event.clarificationId;
    } else if (event.type === "framework_submitted" && "rationale" in event) {
      decision += `: ${event.rationale}`;
    } else if (event.type === "case_opening_submitted") {
      decision += `: ${event.questions.map(({ questionId }) => definition.clarificationOptions.find(({ id }) => id === questionId)?.label ?? questionId).join(", ")}`;
    } else if (event.type === "synthesis_submitted") {
      decision += `; next: ${definition.investigationNodes.find(({ id }) => id === event.nextStepNodeId)?.label ?? event.nextStepNodeId}`;
    } else if (event.type === "recommendation_submitted") {
      decision += `: ${event.decisionId}; risk: ${event.riskId}; next: ${event.nextStepId}`;
    } else if (event.type === "exhibit_interpretation_submitted" || event.type === "exhibit_insight_submitted") {
      decision += `: ${definition.exhibits.find(({ id }) => id === event.exhibitId)?.title ?? event.exhibitId}`;
    }
    if (event.type === "hypothesis_formed" || event.type === "hypothesis_updated" || event.type === "hypothesis_selected") {
      hypothesisId = event.hypothesisId;
      lastHypothesisEvent = eventNumber;
      decision += `: ${"status" in event ? `${event.status} · ` : ""}${hypothesisId ?? "no current hypothesis"}`;
    }
    const contraryIds = definition.hypothesisPractice?.contradictions
      .filter((rule) => rule.hypothesisId === hypothesisId).flatMap((rule) => rule.evidenceFactIds) ?? [];
    const contraryEvidenceWithoutUpdate = availableEvidence.filter((fact) =>
      fact.eventNumber > lastHypothesisEvent && contraryIds.includes(fact.id),
    );
    const revealedEvidence = revealIds.flatMap((id) => {
      const fact = definition.facts.find((candidate) => candidate.id === id);
      if (!fact || evidence.has(id)) return [];
      const text = attempt.caseMode === "interview" && event.type === "calculation_submitted"
        ? `Your submitted calculation: ${event.answer}${"unit" in event ? ` ${event.unit}` : ""}. Authored result was deferred until debrief.`
        : fact.text;
      const revealed = { id, text, eventNumber };
      evidence.set(id, revealed);
      return [revealed];
    });
    const answeredQuestionIds = event.type === "clarification_selected" ? [event.clarificationId]
      : event.type === "case_opening_submitted" ? event.questions.map(({ questionId }) => questionId) : [];
    for (const questionId of answeredQuestionIds) {
      const question = definition.clarificationOptions.find(({ id }) => id === questionId);
      const id = `clarification:${questionId}`;
      if (question && !evidence.has(id)) {
        const answer = { id, text: question.response, eventNumber };
        evidence.set(id, answer);
        revealedEvidence.push(answer);
      }
    }
    return {
      eventNumber, atMs: event.atMs, decision, availableEvidence, revealedEvidence, citedEvidenceIds,
      unavailableEvidenceIds: citedEvidenceIds.filter((id) => !availableEvidence.some((fact) => fact.id === id)),
      contraryEvidenceWithoutUpdate,
      responses: "responses" in event ? event.responses : [],
      diagnostics: "diagnostics" in event ? event.diagnostics : [],
      nextDecision: null,
    };
  });
  return entries.map((entry, index) => ({ ...entry, nextDecision: entries[index + 1]?.decision ?? null }));
}
