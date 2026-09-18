import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { v2PracticeDefinitions } from "@/content/drills";
import { projectV2PracticeDrill, revealV2PracticeAfterCommit } from "@/core/v2-drill";
import type { PracticeRepository } from "@/data/repository";
import { V2PracticeDrillSession } from "./V2PracticeDrillSession";

const authored = v2PracticeDefinitions.find(({ skillId }) => skillId === "quantitative")!;
const definition = projectV2PracticeDrill(authored);

describe("V2PracticeDrillSession", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("keeps the checkpoint hidden until a generated response is reviewed, supports a linked retry, and saves V2 evidence", async () => {
    const user = userEvent.setup();
    const repository: PracticeRepository = {
      saveDrillAttempt: vi.fn().mockResolvedValue(undefined),
      saveCaseAttempt: vi.fn().mockResolvedValue(undefined),
      getSkillHistory: vi.fn().mockResolvedValue([]),
      getCaseEvents: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { response?: Parameters<typeof revealV2PracticeAfterCommit>[1] };
      if (body.response) {
        return new Response(JSON.stringify(revealV2PracticeAfterCommit(authored, body.response)), { status: 200 });
      }
      return new Response(JSON.stringify({
        diagnostics: [{
          code: "strong_quantitative_reasoning",
          source: "system",
          severity: "strength",
          responseId: "response-2",
        }],
      }), { status: 200 });
    });

    render(<V2PracticeDrillSession
      definition={definition}
      repository={repository}
      userId="user-1"
      createAttemptId={() => "attempt-1"}
    />);

    expect(screen.queryByRole("heading", { name: "Submit your numeric result" })).toBeNull();
    await user.type(screen.getByLabelText("Your response"), "Six clubs times hours times premium times months.");
    await user.click(screen.getByRole("button", { name: "Commit response" }));
    await user.click(await screen.findByRole("button", { name: "Save self-check" }));
    await user.click(screen.getByRole("button", { name: "View comparison" }));
    await user.click(screen.getByRole("button", { name: "Try another response" }));
    await user.type(screen.getByLabelText("Your revised response"), "6 × 700 × $15 × 12 = $756,000, a material staffing issue.");
    await user.click(screen.getByRole("button", { name: "Commit revision" }));
    await user.click(await screen.findByRole("button", { name: "Save self-check" }));
    await user.click(screen.getByRole("button", { name: "View comparison" }));
    await user.click(screen.getByRole("button", { name: "Finish practice" }));

    await user.type(screen.getByLabelText("Answer"), "756000");
    await user.click(screen.getByRole("combobox", { name: "Unit" }));
    await user.click(screen.getByRole("option", { name: "$" }));
    await user.click(screen.getByRole("button", { name: "Check calculation" }));

    expect(await screen.findByRole("heading", { name: "Practice complete" })).toBeVisible();
    await waitFor(() => expect(repository.saveDrillAttempt).toHaveBeenCalledOnce());
    expect(vi.mocked(repository.saveDrillAttempt).mock.calls[0][0]).toMatchObject({
      skillId: "quantitative",
      scoringVersion: "v2",
      learningEvidence: expect.objectContaining({
        responses: [
          expect.objectContaining({ revision: 1, revisionOf: null }),
          expect.objectContaining({ revision: 2, revisionOf: expect.any(String) }),
        ],
        diagnostics: expect.arrayContaining([
          expect.objectContaining({ code: "strong_quantitative_reasoning", source: "system" }),
        ]),
      }),
    });
  });

  it("shows the submitted answer, exact correction, and authored reasoning after a wrong result", async () => {
    const user = userEvent.setup();
    const repository: PracticeRepository = {
      saveDrillAttempt: vi.fn().mockResolvedValue(undefined),
      saveCaseAttempt: vi.fn().mockResolvedValue(undefined),
      getSkillHistory: vi.fn().mockResolvedValue([]),
      getCaseEvents: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { response?: Parameters<typeof revealV2PracticeAfterCommit>[1] };
      if (body.response) {
        return new Response(JSON.stringify(revealV2PracticeAfterCommit(authored, body.response)), { status: 200 });
      }
      return new Response(JSON.stringify({
        diagnostics: [{
          code: "unit_error",
          source: "system",
          severity: "blocking",
          responseId: "response-1",
        }],
        feedback: {
          submittedAnswer: 75600,
          submittedUnit: "%",
          answerCorrect: false,
          unitCorrect: false,
          correctAnswer: 756000,
          correctUnit: "$",
          explanation: authored.responseCycle.comparison.text,
        },
      }), { status: 200 });
    });

    render(
      <V2PracticeDrillSession
        definition={definition}
        repository={repository}
        userId="user-1"
      />,
    );

    expect(screen.queryByText(/correct answer/i)).toBeNull();
    await user.type(screen.getByLabelText("Your response"), "Multiply the clubs, hours, rate, and months.");
    await user.click(screen.getByRole("button", { name: "Commit response" }));
    await user.click(await screen.findByRole("button", { name: "Save self-check" }));
    await user.click(screen.getByRole("button", { name: "View comparison" }));
    await user.click(screen.getByRole("button", { name: "Finish practice" }));
    await user.type(screen.getByLabelText("Answer"), "75600");
    await user.click(screen.getByRole("combobox", { name: "Unit" }));
    await user.click(screen.getByRole("option", { name: "%" }));
    await user.click(screen.getByRole("button", { name: "Check calculation" }));

    expect(await screen.findByText("Your answer: 75,600 %")).toBeVisible();
    expect(screen.getByText(/Correct answer:/)).toHaveTextContent("756,000 $");
    expect(screen.getByText(authored.responseCycle.comparison.text)).toBeVisible();
  });
});
