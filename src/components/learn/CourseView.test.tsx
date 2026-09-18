import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { CourseView } from "./CourseView";
import { profitabilityCourse } from "@/content/courses/profitability-v3";
import { MemoryPracticeRepository } from "@/data/memory-repository";
import { getLessonDefinition } from "@/content/lessons/index";
const state = vi.hoisted(() => ({ repo: null as unknown }));
vi.mock("@/data/browser-practice", () => ({ getBrowserPracticeSession: async () => ({ repository: state.repo, userId: "guest", isSignedIn: false }) }));
vi.mock("@/data/supabase-repository", () => ({ createBrowserSupabaseClient: () => null }));
it("enrolls and continues from repository evidence without a completion counter", async () => {
  const repo = state.repo = new MemoryPracticeRepository();
  render(<CourseView course={profitabilityCourse} nextPracticeHref="/practice" />);
  await userEvent.click(await screen.findByRole("button", { name: "Enroll in course" }));
  await waitFor(() => expect(screen.getByRole("link", { name: "Continue course" })).toHaveAttribute("href", expect.stringContaining("step=overview")));
  expect((await repo.listCourseEvidence("guest")).enrollments).toHaveLength(1);
});
it("records the exact viewed lesson once and advances the next required step", async () => {
  const repo = state.repo = new MemoryPracticeRepository();
  await repo.enroll({ userId: "guest", courseId: profitabilityCourse.id, courseVersion: 1, startedAt: "2026-09-01T00:00:00Z", lastActivityAt: "2026-09-01T00:00:00Z", lastStepId: "overview" });
  render(<CourseView course={profitabilityCourse} lesson={getLessonDefinition("profitability-overview-v3", 1)!} step={profitabilityCourse.steps[0]} nextPracticeHref="/practice" />);
  await waitFor(() => expect(screen.getByRole("link", { name: "Continue course" })).toHaveAttribute("href", expect.stringContaining("step=drivers")));
  expect((await repo.listCourseEvidence("guest")).lessonEvents).toEqual([expect.objectContaining({ courseStepId: "overview", lessonId: "profitability-overview-v3", lessonVersion: 1 })]);
});
it("does not enroll a new learner in a retired course", async () => {
  state.repo = new MemoryPracticeRepository();
  render(<CourseView course={{ ...profitabilityCourse, status: "retired" }} nextPracticeHref="/practice" />);
  expect(await screen.findByText(/retired course is available to prior learners/i)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Enroll in course" })).toBeNull();
});
it("retries the persistence boundary after an ambiguous lesson save", async () => {
  const repo = state.repo = new MemoryPracticeRepository();
  await repo.enroll({ userId: "guest", courseId: profitabilityCourse.id, courseVersion: 1, startedAt: "2026-09-01T00:00:00Z", lastActivityAt: "2026-09-01T00:00:00Z", lastStepId: "overview" });
  const save = repo.recordLessonViewed.bind(repo);
  let failed = false;
  const record = vi.spyOn(repo, "recordLessonViewed").mockImplementation(async event => {
    await save(event);
    if (!failed) { failed = true; throw new Error("Enrollment activity save interrupted"); }
  });
  render(<CourseView course={profitabilityCourse} lesson={getLessonDefinition("profitability-overview-v3", 1)!} step={profitabilityCourse.steps[0]} nextPracticeHref="/practice" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Course progress was not saved");
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(record).toHaveBeenCalledTimes(2));
  expect((await repo.listCourseEvidence("guest")).lessonEvents).toHaveLength(1);
});
