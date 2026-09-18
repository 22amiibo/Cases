import { describe, expect, it } from "vitest";
import { getCaseModePolicy } from "./case-mode";

describe("case mode policy", () => {
  it("keeps practice feedback and retry behavior", () => {
    expect(getCaseModePolicy("practice")).toEqual({
      showHints: true,
      allowCheckpointRetry: true,
      showImmediateFeedback: true,
      allowEvidenceReview: true,
      allowBacktracking: true,
      timer: "none",
      finalRecommendationSeconds: null,
    });
  });

  it("delays Interview Mode feedback and locks its checkpoints", () => {
    expect(getCaseModePolicy("interview")).toEqual({
      showHints: false,
      allowCheckpointRetry: false,
      showImmediateFeedback: false,
      allowEvidenceReview: false,
      allowBacktracking: false,
      timer: "count_up",
      finalRecommendationSeconds: 300,
    });
  });
});
