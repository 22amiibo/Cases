import type { CaseMode } from "./v3-taxonomy";

export type CaseRunContext = {
  mode: CaseMode;
  contentVersion: number;
};

export type CaseModePolicy = {
  showHints: boolean;
  allowCheckpointRetry: boolean;
  showImmediateFeedback: boolean;
  allowEvidenceReview: boolean;
  allowBacktracking: boolean;
  timer: "none" | "count_up" | "count_down";
  finalRecommendationSeconds: number | null;
};

const policies = {
  practice: {
    showHints: true,
    allowCheckpointRetry: true,
    showImmediateFeedback: true,
    allowEvidenceReview: true,
    allowBacktracking: true,
    timer: "none",
    finalRecommendationSeconds: null,
  },
  interview: {
    showHints: false,
    allowCheckpointRetry: false,
    showImmediateFeedback: false,
    allowEvidenceReview: false,
    allowBacktracking: false,
    timer: "count_up",
    finalRecommendationSeconds: 300,
  },
} as const satisfies Record<CaseMode, CaseModePolicy>;

export function getCaseModePolicy(mode: CaseMode): CaseModePolicy {
  return policies[mode];
}
