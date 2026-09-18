import {
  DiagnosticOutcomeSchema,
  type CaseDefinition,
  type CaseEvent,
  type DiagnosticOutcome,
} from "./schema";

export type HypothesisEvent = Extract<
  CaseEvent,
  { type: "hypothesis_formed" | "hypothesis_updated" }
>;

export function getHypothesisEvents(events: CaseEvent[]): HypothesisEvent[] {
  return events.filter((event): event is HypothesisEvent =>
    event.type === "hypothesis_formed" || event.type === "hypothesis_updated",
  );
}

export function getCurrentHypothesisId(events: CaseEvent[]): string | null {
  const latest = getHypothesisEvents(events).at(-1);
  return latest?.hypothesisId ?? null;
}

export function getLastHypothesisResponseId(events: CaseEvent[]): string | null {
  return getHypothesisEvents(events).at(-1)?.responses.at(-1)?.responseId ?? null;
}

export function getHypothesisSystemDiagnostic(
  definition: CaseDefinition,
  previousHypothesisId: string,
  status: "retain" | "revise" | "reject",
  evidenceIds: string[],
  responseId: string,
): DiagnosticOutcome {
  const contradicted = status === "retain" && definition.hypothesisPractice
    ?.contradictions.some((rule) =>
      rule.hypothesisId === previousHypothesisId &&
      rule.evidenceFactIds.some((factId) => evidenceIds.includes(factId)),
    );
  return DiagnosticOutcomeSchema.parse({
    code: contradicted
      ? "contradicted_hypothesis_retained"
      : "strong_hypothesis_update",
    source: "system",
    severity: contradicted ? "blocking" : "strength",
    responseId,
  });
}

export function isHypothesisLearningEvidenceValid(
  definition: CaseDefinition,
  event: HypothesisEvent,
  allowDeferredDiagnostics = false,
): boolean {
  const practice = definition.hypothesisPractice;
  if (!practice) return false;
  const cycle = event.type === "hypothesis_formed" ? practice.initial : practice.update;
  const criterionIds = new Set(
    allowDeferredDiagnostics ? ["response_recorded"] : cycle.criteria.map(({ id }) => id),
  );
  const submittedCriterionIds = new Set(
    event.rubricOutcomes.map(({ criterionId }) => criterionId),
  );
  const responseIds = new Set(event.responses.map(({ responseId }) => responseId));
  const latestResponse = event.responses.at(-1);
  if (
    !latestResponse ||
    event.rationale !== latestResponse.text ||
    event.responses.some((response) =>
      response.interactionId !== cycle.interactionId ||
      response.responseKind !== cycle.responseKind,
    ) ||
    event.rubricOutcomes.length !== criterionIds.size ||
    submittedCriterionIds.size !== criterionIds.size ||
    event.rubricOutcomes.some(({ criterionId }) => !criterionIds.has(criterionId)) ||
    event.diagnostics.some(({ responseId }) => responseId && !responseIds.has(responseId))
  ) return false;

  if (allowDeferredDiagnostics) return event.diagnostics.length === 0;

  const outcomeByCriterion = new Map(
    event.rubricOutcomes.map(({ criterionId, met }) => [criterionId, met]),
  );
  const expectedLatestSelfDiagnostics = cycle.diagnosticRules.flatMap((rule) => {
    const met = outcomeByCriterion.get(rule.criterionId);
    const applies = rule.when === "met" ? met === true : met === false;
    return applies
      ? [`${rule.code}:${rule.severity}:${latestResponse.responseId}`]
      : [];
  }).sort();
  const actualLatestSelfDiagnostics = event.diagnostics.flatMap((diagnostic) =>
    diagnostic.source === "self_assessment" &&
    diagnostic.responseId === latestResponse.responseId
      ? [`${diagnostic.code}:${diagnostic.severity}:${diagnostic.responseId}`]
      : [],
  ).sort();
  if (
    expectedLatestSelfDiagnostics.length !== actualLatestSelfDiagnostics.length ||
    expectedLatestSelfDiagnostics.some(
      (diagnostic, index) => diagnostic !== actualLatestSelfDiagnostics[index],
    )
  ) return false;

  return event.diagnostics.every(({ source, code, severity, responseId }) => {
    if (source === "self_assessment") {
      return Boolean(
        responseId &&
        cycle.diagnosticRules.some(
          (rule) => rule.code === code && rule.severity === severity,
        ),
      );
    }
    return event.type === "hypothesis_updated" &&
      (code === "strong_hypothesis_update" || code === "contradicted_hypothesis_retained");
  });
}
