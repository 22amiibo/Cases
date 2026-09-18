import { beforeEach, expect, it } from "vitest";
import { bindLearnerStorage, changeLearnerIdentity } from "./learner-identity";
import { clearPendingAttempt, loadPendingAttempt, savePendingAttempt } from "./pending-attempts";

beforeEach(() => sessionStorage.clear());

it("discards A and B drafts in both directions but preserves owned pending saves and committed history", () => {
  changeLearnerIdentity("A");
  const a = bindLearnerStorage();
  a.setItem("casework:v3-activity:lab:1", "A decision");
  a.setItem("casework:guest-session:case:scratchpad", "A notes");
  sessionStorage.setItem("casework:practice-history", "committed guest history");
  savePendingAttempt(sessionStorage, "case:one", { attemptId: "attempt-A", userId: "A" });
  changeLearnerIdentity("guest");
  changeLearnerIdentity("B");
  expect(a.isCurrent()).toBe(false);
  expect(sessionStorage.getItem("casework:v3-activity:lab:1")).toBeNull();
  expect(sessionStorage.getItem("casework:guest-session:case:scratchpad")).toBeNull();
  expect(loadPendingAttempt(sessionStorage, "case:one")).toBeNull();
  // A delayed completion cannot repopulate B's browser drafts or clear B's work.
  const b = bindLearnerStorage();
  b.setItem("casework:v3-activity:lab:1", "B decision");
  a.setItem("casework:v3-activity:lab:1", "late A response");
  a.removeItem("casework:v3-activity:lab:1");
  expect(b.getItem("casework:v3-activity:lab:1")).toBe("B decision");
  clearPendingAttempt(sessionStorage, "case:one");
  changeLearnerIdentity("guest");
  changeLearnerIdentity("A");
  expect(sessionStorage.getItem("casework:v3-activity:lab:1")).toBeNull();
  expect(loadPendingAttempt(sessionStorage, "case:one")).toEqual({ attemptId: "attempt-A", userId: "A" });
  expect(sessionStorage.getItem("casework:practice-history")).toBe("committed guest history");
});

it("keeps same-user refresh drafts, clears guest/unattributed drafts on login, and quarantines legacy foreign pending payloads", () => {
  sessionStorage.setItem("casework:v2-drill:one:cycle", "guest prose");
  sessionStorage.setItem("casework:pending:case:one", JSON.stringify({ attemptId: "old-A", userId: "A" }));
  changeLearnerIdentity("B");
  expect(sessionStorage.getItem("casework:v2-drill:one:cycle")).toBeNull();
  expect(loadPendingAttempt(sessionStorage, "case:one")).toBeNull();
  bindLearnerStorage().setItem("casework:guest-session:case", "B draft");
  changeLearnerIdentity("B");
  expect(bindLearnerStorage().getItem("casework:guest-session:case")).toBe("B draft");
  changeLearnerIdentity("A");
  expect(loadPendingAttempt(sessionStorage, "case:one")).toEqual({ attemptId: "old-A", userId: "A" });
});
