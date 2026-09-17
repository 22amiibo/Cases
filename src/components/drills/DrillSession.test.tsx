import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { drillBanks } from "@/content/drills";
import type { PracticeRepository } from "@/data/repository";
import { DrillSession } from "./DrillSession";

describe("DrillSession persistence", () => {
  it("saves the completed drill through the active practice repository", async () => {
    const definition = drillBanks.prioritization[0];
    const repository: PracticeRepository = {
      saveDrillAttempt: vi.fn().mockResolvedValue(undefined),
      saveCaseAttempt: vi.fn().mockResolvedValue(undefined),
      getSkillHistory: vi.fn().mockResolvedValue([]),
    };
    const user = userEvent.setup();
    render(
      <DrillSession
        definitions={[definition]}
        repository={repository}
        userId="user-1"
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
});
