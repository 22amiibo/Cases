import { beforeEach, expect, it, vi } from "vitest";
import { changeLearnerIdentity } from "./learner-identity";
import { getBrowserPracticeSession } from "./browser-practice";
import { retryOwnedSaves, saveOwnedAttempt } from "./owned-saves";
import { MemoryPracticeRepository } from "./memory-repository";

const auth = vi.hoisted(() => ({ id: "A", wait: Promise.resolve() }));
vi.mock("./supabase-repository", async importOriginal => ({
  ...await importOriginal<typeof import("./supabase-repository")>(),
  createBrowserSupabaseClient: () => ({ auth: { getSession: async () => {
    await auth.wait;
    return { data: { session: auth.id === "guest" ? null : { user: { id: auth.id } } }, error: null };
  } } }),
  createSupabasePracticeRepository: () => repository,
}));
let repository: MemoryPracticeRepository;
beforeEach(() => {
  sessionStorage.clear();
  repository = new MemoryPracticeRepository();
  auth.id = "A";
  auth.wait = Promise.resolve();
  changeLearnerIdentity("A");
});

it("retains an in-flight save through logout and retries only for its original owner", async () => {
  let release!: () => void;
  auth.wait = new Promise<void>(resolve => { release = resolve; });
  const pending = saveOwnedAttempt({ method: "saveDrillAttempt", attempt: {
    userId: "A", attemptId: "A-attempt", drillId: "drill", skillId: "quantitative",
    score: 100, feedbackCodes: [], conceptIdsPracticed: [], completedAt: "2026-09-18T00:00:00.000Z",
  } });
  changeLearnerIdentity("guest");
  auth.id = "B"; changeLearnerIdentity("B");
  release();
  await expect(pending).rejects.toThrow(/Account changed/);
  await retryOwnedSaves("B");
  expect(await repository.getSkillHistory("B")).toEqual([]);
  expect(await repository.getSkillHistory("A")).toEqual([]);
  expect(sessionStorage.getItem("casework:pending:save:A:A-attempt")).not.toBeNull();
  auth.id = "A"; changeLearnerIdentity("A");
  await retryOwnedSaves("A");
  await retryOwnedSaves("A");
  expect((await repository.getSkillHistory("A")).map(a => a.attemptId)).toEqual(["A-attempt"]);
  expect(sessionStorage.getItem("casework:pending:save:A:A-attempt")).toBeNull();
});

it("does not silently transfer a guest save into an authenticated account", async () => {
  changeLearnerIdentity("guest");
  await expect(getBrowserPracticeSession("guest")).rejects.toThrow(/Account changed/);
  expect(await repository.getSkillHistory("A")).toEqual([]);
});
