import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { drillBanks } from "@/content/drills";
import type { DrillDefinition } from "@/core/schema";
import type { PracticeRepository } from "@/data/repository";
import { DrillSession } from "./DrillSession";

describe("DrillSession persistence", () => {
  it("saves the completed drill through the active practice repository", async () => {
    const definition = drillBanks.prioritization[0] as Extract<
      DrillDefinition,
      { skillId: "prioritization" }
    >;
    const repository: PracticeRepository = {
      saveDrillAttempt: vi.fn().mockResolvedValue(undefined),
      saveCaseAttempt: vi.fn().mockResolvedValue(undefined),
      getSkillHistory: vi.fn().mockResolvedValue([]),
      getCaseAttempt: vi.fn().mockResolvedValue(null),
      getCaseEvents: vi.fn().mockResolvedValue([]),
    };
    const user = userEvent.setup();
    render(
      <DrillSession
        definitions={[definition]}
        repository={repository}
        userId="user-1"
        createAttemptId={() => "drill-attempt-1"}
        now={() => new Date("2026-01-02T00:00:00.000Z")}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: /best next branch/i }),
      definition.options[0].id,
    );
    await user.click(screen.getByRole("button", { name: /check answer/i }));

    await waitFor(() =>
      expect(repository.saveDrillAttempt).toHaveBeenCalledWith({
        userId: "user-1",
        attemptId: "drill-attempt-1",
        drillId: definition.id,
        skillId: "prioritization",
        score: 100,
        feedbackCodes: ["strong_priority"],
        conceptIdsPracticed: definition.conceptIdsPracticed,
        completedAt: "2026-01-02T00:00:00.000Z",
      }),
    );
    expect(screen.getByText("100 / 100")).toBeInTheDocument();
  });

  it("keeps one attempt ID and offers retry when persistence fails", async () => {
    window.sessionStorage.clear();
    const definition = drillBanks.prioritization[0] as Extract<
      DrillDefinition,
      { skillId: "prioritization" }
    >;
    const repository: PracticeRepository = {
      saveDrillAttempt: vi
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce(undefined),
      saveCaseAttempt: vi.fn().mockResolvedValue(undefined),
      getSkillHistory: vi.fn().mockResolvedValue([]),
      getCaseAttempt: vi.fn().mockResolvedValue(null),
      getCaseEvents: vi.fn().mockResolvedValue([]),
    };
    const user = userEvent.setup();
    const firstRender = render(
      <DrillSession
        definitions={[definition]}
        repository={repository}
        userId="user-1"
        createAttemptId={() => "stable-attempt-id"}
        now={() => new Date("2026-01-02T00:00:00.000Z")}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: /best next branch/i }),
      definition.options[0].id,
    );
    await user.click(screen.getByRole("button", { name: /check answer/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /practice result was not saved/i,
    );
    expect(repository.saveDrillAttempt).toHaveBeenCalledTimes(1);

    firstRender.unmount();
    render(
      <DrillSession
        definitions={[definition]}
        repository={repository}
        userId="user-1"
        createAttemptId={() => "different-id-after-refresh"}
        now={() => new Date("2026-01-02T00:00:00.000Z")}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /practice result was not saved/i,
    );
    await user.click(screen.getByRole("button", { name: /try saving again/i }));

    await waitFor(() =>
      expect(repository.saveDrillAttempt).toHaveBeenCalledTimes(2),
    );
    const calls = vi.mocked(repository.saveDrillAttempt).mock.calls;
    expect(calls[0][0].attemptId).toBe("stable-attempt-id");
    expect(calls[1][0].attemptId).toBe("stable-attempt-id");
    expect(await screen.findByText("100 / 100")).toBeInTheDocument();
  });
});
