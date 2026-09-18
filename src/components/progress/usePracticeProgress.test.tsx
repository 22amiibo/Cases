import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { usePracticeProgress } from "./usePracticeProgress";
const mocks = vi.hoisted(() => ({ session: vi.fn(), auth: vi.fn() }));
vi.mock("@/data/browser-practice", () => ({ getBrowserPracticeSession: mocks.session }));
vi.mock("@/data/supabase-repository", () => ({ createBrowserSupabaseClient: () => ({ auth: { onAuthStateChange: mocks.auth } }) }));
const empty = { enrollments: [], lessonEvents: [], activityAttempts: [], caseAttempts: [] };
beforeEach(() => { sessionStorage.clear(); mocks.auth.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }); });
it("loads repository evidence and local runs together without claiming readiness early", async () => {
  let resolve!: (value: typeof empty) => void;
  const evidence = new Promise<typeof empty>(done => { resolve = done; });
  sessionStorage.setItem("casework:v3-activity:a:1", "saved");
  mocks.session.mockResolvedValue({ userId: "guest", repository: { getSkillHistory: async () => [], listCourseEvidence: () => evidence } });
  const { result } = renderHook(usePracticeProgress);
  await act(async () => {});
  expect(result.current.status).toBe("loading");
  await act(async () => resolve(empty));
  expect(result.current.status).toBe("ready");
  expect(result.current.localRuns).toEqual([["casework:v3-activity:a:1", "saved"]]);
  expect(result.current.courseEvidence).toEqual(empty);
});
it("discards an earlier identity's delayed response and clears private evidence on change", async () => {
  let resolve!: (value: typeof empty) => void;
  const oldEvidence = new Promise<typeof empty>(done => { resolve = done; });
  mocks.session.mockResolvedValueOnce({ userId: "old", repository: { getSkillHistory: async () => [], listCourseEvidence: () => oldEvidence } });
  const { result } = renderHook(usePracticeProgress);
  await act(async () => {});
  mocks.session.mockResolvedValue({ userId: "new", repository: { getSkillHistory: async () => [], listCourseEvidence: async () => empty } });
  await act(async () => mocks.auth.mock.calls.at(-1)![0]("SIGNED_IN"));
  await waitFor(() => expect(result.current.userId).toBe("new"));
  await act(async () => resolve({ ...empty, activityAttempts: [{ attemptId: "private" }] } as unknown as typeof empty));
  expect(result.current.activityAttempts).toEqual([]);
  expect(result.current.userId).toBe("new");
});
it("reports a failed evidence read instead of presenting it as no practice", async () => {
  mocks.session.mockResolvedValue({ userId: "guest", repository: { getSkillHistory: async () => [], listCourseEvidence: async () => { throw Error("offline"); } } });
  const { result } = renderHook(usePracticeProgress);
  await waitFor(() => expect(result.current.status).toBe("error"));
});
