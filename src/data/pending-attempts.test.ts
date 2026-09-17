import { describe, expect, it } from "vitest";
import type { CaseAttempt } from "./repository";
import {
  clearPendingAttempt,
  loadPendingAttempt,
  savePendingAttempt,
} from "./pending-attempts";

const caseAttempt: CaseAttempt = {
  attemptId: "case-attempt-1",
  userId: "guest",
  caseId: "alpinefit-profitability",
  skillScores: { structure: 75 },
  feedbackCodes: [],
  events: [
    {
      type: "clarification_selected",
      clarificationId: "clarify-goal",
      atMs: 10,
    },
  ],
  completedAt: "2026-01-03T00:00:00.000Z",
};

describe("pending attempt storage", () => {
  it("restores a pending payload with its stable attempt ID until cleared", () => {
    window.sessionStorage.clear();

    savePendingAttempt(window.sessionStorage, "case:alpinefit", caseAttempt);

    expect(
      loadPendingAttempt<CaseAttempt>(window.sessionStorage, "case:alpinefit"),
    ).toEqual(caseAttempt);
    clearPendingAttempt(window.sessionStorage, "case:alpinefit");
    expect(
      loadPendingAttempt<CaseAttempt>(window.sessionStorage, "case:alpinefit"),
    ).toBeNull();
  });

  it("ignores malformed pending data", () => {
    window.sessionStorage.setItem("casework:pending:bad", "not-json");

    expect(
      loadPendingAttempt(window.sessionStorage, "bad"),
    ).toBeNull();
  });
});
