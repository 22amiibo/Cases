import type { ActivityDefinition, ActivityEvent, ActivityState } from "./activity";

export type ActivityReviewStep = {
  label: string;
  learnerAnswer: string;
  assessment: "Strong" | "Needs another look" | "Recorded";
  strongAnswer?: string;
};

export type ActivityReview = {
  title: string;
  classification: string;
  performance: { earned: number; total: number; label: string } | null;
  strengths: string[];
  improvements: string[];
  principle: string;
  nextAction: string;
  takeaway: string;
  steps: ActivityReviewStep[];
};

const stageLabels = {
  observe: "Observation",
  prioritize: "Priority",
  interpret: "Implication",
  act: "Next action",
} as const;

function latestCommittedRun(events: ActivityEvent[]) {
  const lastRetry = events.findLastIndex(
    (event) => event.type === "retry_decided" && event.decision === "retry",
  );
  return events.slice(lastRetry + 1);
}

export function buildActivityReview(
  definition: ActivityDefinition,
  state: ActivityState,
): ActivityReview {
  const feedback = definition.feedback.paths.find(({ id }) => id === state.outcomeId);
  if (!feedback) throw new Error("Completed activity feedback is unavailable");
  const events = latestCommittedRun(state.events);
  let steps: ActivityReviewStep[] = [];
  let performance: ActivityReview["performance"] = null;

  if (definition.interaction.type === "exhibit_chain") {
    const interaction = definition.interaction;
    steps = events.flatMap((event): ActivityReviewStep[] => {
      if (event.type !== "exhibit_committed") return [];
      const options = event.stage === "observe"
        ? interaction.observationOptions
        : event.stage === "prioritize"
          ? interaction.priorityOptions
          : event.stage === "interpret"
            ? interaction.interpretationOptions
            : interaction.actionOptions;
      const selected = options.find(({ id }) => event.selectedIds.includes(id));
      const strong = options.find(({ outcomeId }) => outcomeId === interaction.outcomeIds[0]);
      if (!selected) return [];
      return [{
        label: stageLabels[event.stage],
        learnerAnswer: selected.label,
        assessment: selected.outcomeId === interaction.outcomeIds[0]
          ? "Strong"
          : "Needs another look",
        ...(strong ? { strongAnswer: strong.label } : {}),
      }];
    });
    const earned = steps.filter(({ assessment }) => assessment === "Strong").length;
    performance = { earned, total: 4, label: `${earned} of 4 stages` };
  } else if (
    definition.interaction.type === "single_select" ||
    definition.interaction.type === "multi_select"
  ) {
    const interaction = definition.interaction;
    const commit = events.findLast((event) => event.type === "selection_committed");
    const selected = commit?.type === "selection_committed"
      ? interaction.options.filter(({ id }) => commit.selectedIds.includes(id))
      : [];
    const strong = interaction.options.filter(
      ({ outcomeId }) => outcomeId === interaction.outcomeIds[0],
    );
    const earned = selected.length > 0 && selected.every(
      ({ outcomeId }) => outcomeId === interaction.outcomeIds[0],
    ) ? 1 : 0;
    performance = { earned, total: 1, label: `${earned} of 1 check` };
    steps = [{
      label: "Decision",
      learnerAnswer: selected.map(({ label }) => label).join(", "),
      assessment: earned === 1 ? "Strong" : "Needs another look",
      strongAnswer: strong.map(({ label }) => label).join(", "),
    }];
  } else if (definition.interaction.type === "brainstorm_builder") {
    const interaction = definition.interaction;
    const commit = events.findLast((event) => event.type === "brainstorm_committed");
    if (commit?.type === "brainstorm_committed") {
      const labels = new Map(interaction.ideas.map(({ id, label }) => [id, label]));
      steps = [
        { label: "Ideas selected", learnerAnswer: commit.selectedIdeaIds.map((id) => labels.get(id) ?? id).join(", "), assessment: "Recorded" },
        { label: "Priority", learnerAnswer: commit.priorityIdeaIds.map((id) => labels.get(id) ?? id).join(", "), assessment: "Recorded" },
      ];
    }
  } else if (definition.interaction.type === "hypothesis_sequence") {
    const interaction = definition.interaction;
    const labels = new Map(interaction.hypotheses.map(({ id, label }) => [id, label]));
    steps = events.flatMap((event): ActivityReviewStep[] => event.type === "hypothesis_committed"
      ? [{
          label: event.status === "form" ? "Starting hypothesis" : `Evidence update: ${event.status}`,
          learnerAnswer: `${event.hypothesisId ? labels.get(event.hypothesisId) ?? event.hypothesisId : "Hypothesis rejected"} — ${event.rationale}`,
          assessment: "Recorded",
        }]
      : []);
  }

  const strengths = steps
    .filter(({ assessment }) => assessment === "Strong")
    .map(({ label, learnerAnswer }) => `${label}: ${learnerAnswer}`);
  const improvements = steps
    .filter(({ assessment, strongAnswer }) => assessment === "Needs another look" && strongAnswer)
    .map(({ label, strongAnswer }) => `${label}: Try “${strongAnswer}”.`);
  if (strengths.length === 0 && ["strong", "reasonable"].includes(feedback.classification)) {
    strengths.push(feedback.explanation);
  }
  if (improvements.length === 0 && !["strong", "reasonable"].includes(feedback.classification)) {
    improvements.push(feedback.explanation);
  }

  return {
    title: definition.title,
    classification: feedback.classification === "strong" ? "Strong" : feedback.classification === "reasonable" ? "On track" : "Needs practice",
    performance,
    strengths,
    improvements,
    principle: feedback.principle,
    nextAction: feedback.nextAction,
    takeaway: definition.takeaway,
    steps,
  };
}

export function activityEventLabel(event: ActivityEvent) {
  switch (event.type) {
    case "activity_started": return "Activity started";
    case "selection_committed": return "Decision committed";
    case "ranking_committed": return "Ranking committed";
    case "categorization_committed": return "Categories committed";
    case "generated_response_committed": return "Response committed";
    case "brainstorm_committed": return "Ideas organized and prioritized";
    case "hypothesis_committed": return event.status === "form"
      ? "Starting hypothesis committed"
      : `Hypothesis ${{ retain: "retained", revise: "revised", reject: "rejected" }[event.status]}`;
    case "exhibit_committed": return `${stageLabels[event.stage]} committed`;
    case "self_check_committed": return "Self-check completed";
    case "authored_comparison_viewed": return "Authored comparison reviewed";
    case "retry_decided": return event.decision === "retry" ? "Another attempt started" : "Review completed";
    case "takeaway_viewed": return "Learning principle reviewed";
    case "activity_completed": return "Activity completed";
  }
}
