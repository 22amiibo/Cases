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

export type LearnerExhibitDefinition = Omit<
  ExhibitDefinition,
  "sourceFactIds" | "insights" | "interpretation"
> & { interpretationPrompt?: LearnerLearningCyclePrompt };

export type LearnerCalculationDefinition = Pick<
  CaseDefinition["calculations"][number],
  "id" | "prompt" | "unit"
>;

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
};

export type LearnerSessionView = {
  currentStage: CaseStage;
  availableActions: Array<{ id: string; conceptId: string; label: string }>;
  facts: RevealedFact[];
  exhibits: LearnerExhibitDefinition[];
  interpretedExhibitIds: string[];
  calculations: LearnerCalculationDefinition[];
  completedCalculationIds: string[];
  interviewerResponse: string | null;
  recommendation: LearnerRecommendation | null;
  review: LearnerCaseReview | null;
};

export type StoredCaseWorkspace = {
  events: CaseEvent[];
  clarificationComplete: boolean;
  clarificationDraftIds: string[];
};

export function toLearnerCaseDefinition(
  definition: CaseDefinition,
): LearnerCaseDefinition {
  return {
    id: definition.id,
    version: definition.version,
    title: definition.title,
    category: definition.category,
    difficulty: definition.difficulty,
    prompt: definition.prompt,
    objective: definition.objective,
    clarificationOptions: definition.clarificationOptions.map(({ id, label }) => ({
      id,
      label,
    })),
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
    nodes: definition.investigationNodes.map((node) => ({
      id: node.id,
      label: node.label,
      prerequisiteNodeIds: node.prerequisiteNodeIds,
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
