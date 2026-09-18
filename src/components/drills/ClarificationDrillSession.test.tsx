import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clarificationV2Definition } from "@/content/drills";
import { projectClarificationDrill } from "@/core/clarification-drill";
import type { PracticeRepository } from "@/data/repository";
import { ClarificationDrillSession } from "./ClarificationDrillSession";

const learnerDefinition = projectClarificationDrill(clarificationV2Definition);

describe("ClarificationDrillSession", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("commits a restatement before questions and saves sourced V2 evidence", async () => {
    const user = userEvent.setup();
    const repository: PracticeRepository = {
      saveDrillAttempt: vi.fn().mockResolvedValue(undefined),
      saveCaseAttempt: vi.fn().mockResolvedValue(undefined),
      getSkillHistory: vi.fn().mockResolvedValue([]),
      getCaseAttempt: vi.fn().mockResolvedValue(null),
      getCaseEvents: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        reveal: {
          criteria: clarificationV2Definition.responseCycle.criteria,
          comparison: clarificationV2Definition.responseCycle.comparison,
          diagnosticRules: clarificationV2Definition.responseCycle.diagnosticRules,
        },
        questionOptions: clarificationV2Definition.questionOptions.map(({ id, label }) => ({ id, label })),
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        responses: [{
          questionId: "logo-color",
          response: clarificationV2Definition.questionOptions.find(({ id }) => id === "logo-color")?.response,
        }],
        diagnostics: [{
          code: "low_value_question",
          source: "system",
          severity: "coaching",
          responseId: "response-1",
        }],
      }), { status: 200 }));

    render(
      <ClarificationDrillSession
        definition={learnerDefinition}
        repository={repository}
        userId="user-1"
        createAttemptId={() => "attempt-1"}
        now={() => new Date("2026-09-17T12:00:00.000Z")}
      />,
    );

    expect(screen.getByText("V2 practice")).toBeVisible();
    expect(screen.queryByText(clarificationV2Definition.questionOptions[0].label)).toBeNull();
    await user.type(screen.getByLabelText("Your response"), "Explain the margin decline and what to do.");
    await user.click(screen.getByRole("button", { name: "Commit response" }));
    await screen.findByRole("heading", { name: "Check your response" });
    await user.click(screen.getByLabelText(clarificationV2Definition.responseCycle.criteria[0].label));
    await user.click(screen.getByRole("button", { name: "Save self-check" }));
    await user.click(screen.getByRole("button", { name: "View comparison" }));
    await user.click(screen.getByRole("button", { name: "Finish practice" }));
    await user.click(screen.getByLabelText("Has AlpineFit changed its logo or brand colors recently?"));
    await user.click(screen.getByRole("button", { name: "Ask selected questions" }));

    expect(await screen.findByText(/Branding has not changed/)).toBeVisible();
    await waitFor(() => expect(repository.saveDrillAttempt).toHaveBeenCalledOnce());
    expect(vi.mocked(repository.saveDrillAttempt).mock.calls[0][0]).toMatchObject({
      scoringVersion: "v2",
      contentVersion: 2,
      skillId: "clarification",
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: "low_value_question", source: "system" }),
      ]),
      learningEvidence: expect.objectContaining({
        scoringVersion: "v2",
        responses: [expect.objectContaining({ responseId: expect.any(String) })],
      }),
    });
  });
});
