import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ActivityPage from "./page";

vi.mock("@/components/activity/ActivityShell", () => ({
  ActivityShell: ({ courseContext }: { courseContext: unknown }) => (
    <output data-testid="course-context">{JSON.stringify(courseContext)}</output>
  ),
}));

describe("Activity page", () => {
  it("passes complete course context to the exact activity version", async () => {
    render(await ActivityPage({
      params: Promise.resolve({ activityId: "alpinefit-clarifying-v3" }),
      searchParams: Promise.resolve({
        version: "1",
        course: "profitability-v3",
        courseVersion: "1",
        step: "clarifying",
      }),
    }));
    expect(screen.getByTestId("course-context")).toHaveTextContent(JSON.stringify({
      courseId: "profitability-v3",
      courseVersion: 1,
      courseStepId: "clarifying",
    }));
  });

  it("rejects partial or ambiguous course context", async () => {
    const params = Promise.resolve({ activityId: "alpinefit-clarifying-v3" });
    await expect(ActivityPage({
      params,
      searchParams: Promise.resolve({ version: "1", course: "profitability-v3" }),
    })).rejects.toThrow();
    await expect(ActivityPage({
      params,
      searchParams: Promise.resolve({ version: ["1", "2"] }),
    })).rejects.toThrow();
  });
});
