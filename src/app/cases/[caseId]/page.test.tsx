import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import CasePage from "./page";
vi.mock("@/components/investigation/InvestigationPanel", () => ({ InvestigationPanel: ({ courseContext }: { courseContext: unknown }) => <output>{JSON.stringify(courseContext)}</output> }));
it("passes only exact Practice capstone context and rejects incorrect course, version, step or mode", async () => {
  const query = { version: "2", mode: "practice", course: "profitability-v3", courseVersion: "1", step: "case" };
  const params = Promise.resolve({ caseId: "alpinefit-profitability" });
  render(await CasePage({ params, searchParams: Promise.resolve(query) }));
  expect(screen.getByRole("status")).toHaveTextContent(JSON.stringify({ courseId: "profitability-v3", courseVersion: 1, courseStepId: "case" }));
  for (const overrides of [{ mode: "interview" }, { courseVersion: "99" }, { step: "overview" }, { version: ["2", "1"] }, { version: "1" }]) {
    await expect(CasePage({ params, searchParams: Promise.resolve({ ...query, ...overrides }) })).rejects.toThrow();
  }
});
