import type { CaseStage, RevealedFact } from "./case-engine";
import type {
  CaseDefinition,
  CaseEvent,
  CommittedResponse,
  DiagnosticOutcome,
  ExhibitDefinition,
  FrameworkBranch,
  RubricOutcome,
} from "./schema";
import {
  getDiscoveredFactIdsBefore,
  isValidSynthesisSubmission,
  scoreCase,
} from "./case-scoring";
import type { RecommendationSubmission } from "./schema";
import {
  frameworkSubmissionFromEvent,
  isV2FrameworkEvent,
} from "./framework-events";
import type { LearnerLearningCyclePrompt } from "./learning-cycle";
import { projectLearningCyclePrompt } from "./learning-cycle";
import { getCurrentHypothesisId, getHypothesisEvents } from "./hypothesis";

export type LearnerExhibitDefinition = Omit<
  ExhibitDefinition,
  "sourceFactIds" | "insights" | "interpretation"
> & { interpretationPrompt?: LearnerLearningCyclePrompt };

export type LearnerCalculationDefinition =
  | (Pick<CaseDefinition["calculations"][number], "id" | "prompt" | "unit"> & {
      responsePrompt?: undefined;
      unitOptions?: undefined;
    })
  | (Pick<CaseDefinition["calculations"][number], "id" | "prompt"> & {
      responsePrompt: LearnerLearningCyclePrompt;
      unitOptions: string[];
      unit?: undefined;
    });

export type LearnerRecommendation = {
  decisions: Array<{ id: string; label: string }>;
  risks: Array<{ id: string; label: string }>;
  nextSteps: Array<{ id: string; label: string }>;
};

export type { RecommendationSubmission };

export type LearnerReplayNode = {
  id: string;
  label: string;
  prerequisiteNodeIds: string[];
  displayCategory?: string;
  displayDepth: number;
  state: "visited" | "unvisited" | "critical-found" | "critical-missed";
};

export type LearnerScoreDimension = {
  id: string;
  label: string;
  value: number;
};

export type LearnerFeedback = {
  code:
    | "continued_low_value_branch"
    | "missed_segmentation"
    | "strong_cross_exhibit_synthesis"
    | "unsupported_recommendation";
  message: string;
};

export type LearnerCaseReview = {
  framework: {
    branches: FrameworkBranch[];
    priorityConceptId: string;
    rationale: string | null;
    source: "legacy_flattened" | "v2_hierarchy";
  } | null;
  exhibitInterpretations: Array<{
    exhibitId: string;
    exhibitTitle: string;
    responses: CommittedResponse[];
    rubricOutcomes: RubricOutcome[];
    diagnostics: DiagnosticOutcome[];
    insightIds: string[];
    authoredComparisonViewed: true;
  }>;
  hypotheses: Array<{
    type: "hypothesis_formed" | "hypothesis_updated";
    status: "initial" | "retain" | "revise" | "reject";
    previousHypothesisId: string | null;
    hypothesisId: string | null;
    evidenceIds: string[];
    rationale: string;
    responses: CommittedResponse[];
    diagnostics: DiagnosticOutcome[];
    revisionOfResponseId: string | null;
  }>;
  generatedResponses: Array<{
    kind: "opening" | "calculation" | "synthesis" | "recommendation";
    label: string;
    responses: CommittedResponse[];
    rubricOutcomes: RubricOutcome[];
    diagnostics: DiagnosticOutcome[];
    details: string[];
  }>;
  nodes: LearnerReplayNode[];
  events: Array<{ type: "node_investigated"; nodeId: string; atMs: number }>;
  efficientPath: { label: string; nodeIds: string[] };
  scores: LearnerScoreDimension[];
  feedback: LearnerFeedback[];
};

export type LearnerCaseDefinition = Pick<
  CaseDefinition,
  "id" | "version" | "title" | "category" | "difficulty" | "prompt" | "objective"
> & {
  clarificationOptions: Array<{ id: string; label: string }>;
  openingPrompt: LearnerLearningCyclePrompt | null;
  scaffoldingLevel: "beginner" | "intermediate" | "interview" | null;
};

export type LearnerSessionView = {
  currentStage: CaseStage;
  availableActions: Array<{
    id: string;
    conceptId: string;
    label: string;
    displayCategory?: string;
    displayDepth?: number;
    prerequisiteLabels?: string[];
  }>;
  facts: RevealedFact[];
  exhibits: LearnerExhibitDefinition[];
  interpretedExhibitIds: string[];
  calculations: LearnerCalculationDefinition[];
  completedCalculationIds: string[];
  interviewerResponse: string | null;
  hypothesis: {
    phase: "initial" | "update";
    prompt: LearnerLearningCyclePrompt;
    options: Array<{ id: string; label: string }>;
    currentHypothesisId: string | null;
    revisionOfResponseId: string | null;
  } | null;
  synthesis: {
    prompt: LearnerLearningCyclePrompt;
  } | null;
  recommendationPrompt: LearnerLearningCyclePrompt | null;
  recommendation: LearnerRecommendation | null;
  review: LearnerCaseReview | null;
};

export type StoredCaseWorkspace = {
  contentVersion: number;
  events: CaseEvent[];
  clarificationComplete: boolean;
  clarificationDraftIds: string[];
};

export function projectInvestigationDisplay(
  definition: CaseDefinition,
  node: CaseDefinition["investigationNodes"][number],
) {
  const nodesById = new Map(
    definition.investigationNodes.map((candidate) => [candidate.id, candidate]),
  );

  function depthWithinCategory(
    current: CaseDefinition["investigationNodes"][number],
    visited: Set<string>,
  ): number {
    if (!current.displayCategory || visited.has(current.id)) return 0;
    const nextVisited = new Set(visited).add(current.id);
    const sameCategoryParents = current.prerequisiteNodeIds
      .map((id) => nodesById.get(id))
      .filter(
        (parent): parent is CaseDefinition["investigationNodes"][number] =>
          parent?.displayCategory === current.displayCategory,
      );
    if (sameCategoryParents.length === 0) return 0;
    return 1 + Math.max(
      ...sameCategoryParents.map((parent) =>
        depthWithinCategory(parent, nextVisited),
      ),
    );
  }

  return {
    ...(node.displayCategory
      ? { displayCategory: node.displayCategory }
      : {}),
    displayDepth: depthWithinCategory(node, new Set()),
    prerequisiteLabels: node.prerequisiteNodeIds.map(
      (id) => nodesById.get(id)?.label ?? id,
    ),
  };
}

function projectGeneratedCaseResponses(
  definition: CaseDefinition,
  events: CaseEvent[],
): LearnerCaseReview["generatedResponses"] {
  const projected: LearnerCaseReview["generatedResponses"] = [];
  for (const event of events) {
    if (event.type === "case_opening_submitted") {
      projected.push({
        kind: "opening",
        label: "Case opening",
        responses: event.responses,
        rubricOutcomes: event.rubricOutcomes,
        diagnostics: event.diagnostics,
        details: event.questions.map(({ questionId }) => `Question: ${questionId.replaceAll("-", " ")}`),
      });
    } else if (event.type === "calculation_submitted" && "responses" in event) {
      projected.push({
        kind: "calculation",
        label: definition.calculations.find(({ id }) => id === event.taskId)?.prompt ?? event.taskId,
        responses: event.responses,
        rubricOutcomes: event.rubricOutcomes,
        diagnostics: event.diagnostics,
        details: [`Answer: ${event.answer} ${event.unit}`],
      });
    } else if (event.type === "synthesis_submitted" && "responses" in event) {
      projected.push({
        kind: "synthesis",
        label: "Case synthesis",
        responses: event.responses,
        rubricOutcomes: event.rubricOutcomes,
        diagnostics: event.diagnostics,
        details: [`Evidence: ${event.evidenceIds.join(", ")}`, `Next: ${event.nextStepNodeId}`],
      });
    } else if (event.type === "recommendation_submitted" && "responses" in event) {
      projected.push({
        kind: "recommendation",
        label: "Final recommendation",
        responses: event.responses,
        rubricOutcomes: event.rubricOutcomes,
        diagnostics: event.diagnostics,
        details: [
          `Decision: ${event.decisionId}`,
          `Evidence: ${event.evidenceIds.join(", ")}`,
          `Risk: ${event.riskId}`,
          `Next: ${event.nextStepId}`,
        ],
      });
    }
  }
  return projected;
}

export function toLearnerCaseDefinition(
  definition: CaseDefinition,
): LearnerCaseDefinition {
  const scaffoldingLevel = definition.version >= 2
    ? definition.opening?.responseCycle.scaffoldingLevel ??
      definition.hypothesisPractice?.initial.scaffoldingLevel ??
      definition.exhibits.find(({ interpretation }) => interpretation)
        ?.interpretation?.scaffoldingLevel ??
      null
    : null;
  return {
    id: definition.id,
    version: definition.version,
    title: definition.title,
    category: definition.category,
    difficulty: definition.difficulty,
    prompt: definition.prompt,
    objective: definition.objective,
    scaffoldingLevel,
    clarificationOptions: definition.version >= 2 && definition.opening
      ? []
      : definition.clarificationOptions.map(({ id, label }) => ({ id, label })),
    openingPrompt: definition.opening
      ? projectLearningCyclePrompt(definition.opening.responseCycle)
      : null,
  };
}

export function toLearnerCaseReview(
  definition: CaseDefinition,
  events: CaseEvent[],
): LearnerCaseReview {
  const score = scoreCase(definition, events);
  const investigatedEvents = events.filter(
    (event): event is Extract<CaseEvent, { type: "node_investigated" }> =>
      event.type === "node_investigated",
  );
  const visitedNodeIds = new Set(investigatedEvents.map((event) => event.nodeId));
  const feedback: LearnerFeedback[] = [];
  const frameworkEvent = events
    .filter(
      (event): event is Extract<CaseEvent, { type: "framework_submitted" }> =>
        event.type === "framework_submitted",
    )
    .at(-1);

  if (score.diagnostic.lowValueInvestigations.length > 0) {
    feedback.push({
      code: "continued_low_value_branch",
      message: "You spent time on a lower-value branch after stronger evidence was available.",
    });
  }
  if (
    definition.investigationNodes.some(
      (node) => node.rootCause && !visitedNodeIds.has(node.id),
    )
  ) {
    feedback.push({
      code: "missed_segmentation",
      message: "A critical driver remained unexplored; compare the affected locations before broadening the response.",
    });
  }
  if (
    events.some(
      (event) => {
        if (
          event.type !== "synthesis_submitted" ||
          !isValidSynthesisSubmission(definition, events, event)
        ) {
          return false;
        }
        const discoveredFacts = getDiscoveredFactIdsBefore(
          definition,
          events,
          event.atMs,
        );
        return (
          definition.exhibits.filter((exhibit) =>
            exhibit.sourceFactIds.some(
              (factId) =>
                discoveredFacts.has(factId) &&
                event.evidenceIds.includes(factId),
            ),
          ).length >= 2
        );
      },
    )
  ) {
    feedback.push({
      code: "strong_cross_exhibit_synthesis",
      message: "You connected evidence across exhibits before committing to a next step.",
    });
  }
  if (score.recommendation === 0) {
    feedback.push({
      code: "unsupported_recommendation",
      message: `The recommendation needs at least ${definition.recommendation.minimumEvidence} discovered pieces of supporting evidence.`,
    });
  }

  return {
    framework: frameworkEvent
      ? {
          ...frameworkSubmissionFromEvent(frameworkEvent),
          rationale: isV2FrameworkEvent(frameworkEvent)
            ? frameworkEvent.rationale
            : null,
          source: isV2FrameworkEvent(frameworkEvent)
            ? "v2_hierarchy"
            : "legacy_flattened",
        }
      : null,
    exhibitInterpretations: events.flatMap((event) => {
      if (event.type !== "exhibit_interpretation_submitted") return [];
      const exhibit = definition.exhibits.find(
        (candidate) => candidate.id === event.exhibitId,
      );
      return [{
        exhibitId: event.exhibitId,
        exhibitTitle: exhibit?.title ?? event.exhibitId,
        responses: event.responses,
        rubricOutcomes: event.rubricOutcomes,
        diagnostics: event.diagnostics,
        insightIds: event.insightIds,
        authoredComparisonViewed: event.authoredComparisonViewed,
      }];
    }),
    hypotheses: getHypothesisEvents(events).map((event) => ({
      type: event.type,
      status: event.type === "hypothesis_formed" ? "initial" : event.status,
      previousHypothesisId: event.type === "hypothesis_updated"
        ? event.previousHypothesisId
        : null,
      hypothesisId: event.hypothesisId,
      evidenceIds: [...event.evidenceIds],
      rationale: event.rationale,
      responses: event.responses,
      diagnostics: event.diagnostics,
      revisionOfResponseId: event.revisionOfResponseId,
    })),
    generatedResponses: projectGeneratedCaseResponses(definition, events),
    nodes: definition.investigationNodes.map((node) => ({
      id: node.id,
      label: node.label,
      prerequisiteNodeIds: node.prerequisiteNodeIds,
      ...projectInvestigationDisplay(definition, node),
      state: visitedNodeIds.has(node.id)
        ? node.critical
          ? "critical-found"
          : "visited"
        : node.critical
          ? "critical-missed"
          : "unvisited",
    })),
    events: investigatedEvents.map(({ type, nodeId, atMs }) => ({
      type,
      nodeId,
      atMs,
    })),
    efficientPath: {
      label: definition.efficientPaths[0].label,
      nodeIds: definition.efficientPaths[0].nodeIds,
    },
    scores: [
      { id: "clarification", label: "Clarification", value: score.clarification },
      { id: "structure", label: "Structure", value: score.structure },
      { id: "prioritization", label: "Prioritization", value: score.prioritization },
      { id: "quantitative", label: "Quantitative", value: score.quantitative },
      { id: "exhibit", label: "Exhibit reading", value: score.exhibit },
      { id: "synthesis", label: "Synthesis", value: score.synthesis },
      { id: "recommendation", label: "Recommendation", value: score.recommendation },
    ],
    feedback,
  };
}

export function projectHypothesisPractice(
  definition: CaseDefinition,
  events: CaseEvent[],
): LearnerSessionView["hypothesis"] {
  const practice = definition.hypothesisPractice;
  if (!practice) return null;
  const hypothesisEvents = getHypothesisEvents(events);
  if (hypothesisEvents.length === 0) {
    return {
      phase: "initial",
      prompt: projectLearningCyclePrompt(practice.initial),
      options: practice.options.map((option) => ({ ...option })),
      currentHypothesisId: null,
      revisionOfResponseId: null,
    };
  }
  if (
    events.some(({ type }) => type === "node_investigated") &&
    !events.some(({ type }) => type === "hypothesis_updated")
  ) {
    return {
      phase: "update",
      prompt: projectLearningCyclePrompt(practice.update),
      options: practice.options.map((option) => ({ ...option })),
      currentHypothesisId: getCurrentHypothesisId(events),
      revisionOfResponseId: hypothesisEvents.at(-1)?.responses.at(-1)?.responseId ?? null,
    };
  }
  return null;
}
