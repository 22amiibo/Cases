import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActivityDefinition } from "@/content/activities";
import { projectLearnerActivity } from "@/core/activity-projection";
import type { ActivityAttemptRepository } from "@/data/v3-repository";
import { POST as commit } from "@/app/api/activities/[activityId]/commit/route";
import { POST as complete } from "@/app/api/activities/[activityId]/complete/route";
import { POST as session } from "@/app/api/activities/[activityId]/session/route";
import { ActivityShell } from "./ActivityShell";

const definition = getActivityDefinition("v3-private-test", 1)!;
const initial = projectLearnerActivity(definition);

function routeFetch() {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const handler = url.endsWith("/session")
      ? session
      : url.endsWith("/complete")
        ? complete
        : commit;
    return handler(new Request(`http://localhost${url}`, init), {
      params: Promise.resolve({ activityId: definition.id }),
    });
  });
}

function repository(save = vi.fn().mockResolvedValue(undefined)) {
  return {
    saveActivityAttempt: save,
    getActivityAttempt: vi.fn(),
    listActivityAttempts: vi.fn(),
  } satisfies ActivityAttemptRepository;
}

describe("ActivityShell", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.stubGlobal("fetch", routeFetch());
  });

  it("commits, reveals feedback, retries, completes, and moves focus", async () => {
    const user = userEvent.setup();
    const saved = vi.fn().mockResolvedValue(undefined);
    render(<ActivityShell
      initial={initial}
      repository={repository(saved)}
      userId="guest-1"
      createId={() => "stable-attempt-id"}
      now={() => new Date("2026-09-18T12:00:00.000Z")}
    />);

    await user.click(screen.getByRole("button", { name: "Start activity" }));
    expect(await screen.findByRole("heading", { name: "Make your commitment" })).toHaveFocus();
    await user.click(screen.getByRole("radio", { name: "Ask for company history" }));
    await user.click(screen.getByRole("button", { name: "Commit answer" }));
    expect(await screen.findByText("Company history does not resolve the immediate decision.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await user.click(screen.getByRole("radio", { name: "Clarify the decision" }));
    await user.click(screen.getByRole("button", { name: "Commit answer" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Finish activity" }));

    expect(await screen.findByRole("heading", { name: "Activity complete" })).toBeVisible();
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: "stable-attempt-id",
      userId: "guest-1",
      scoringVersion: "v3",
    }));
    expect(await screen.findByRole("link", { name: "Review completed attempt" })).toHaveAttribute(
      "href",
      "/practice/attempts/stable-attempt-id",
    );
    expect(window.sessionStorage.getItem("casework:v3-activity:v3-private-test:1")).toBeNull();
  });

  it("keeps completed state until a failed save retry succeeds", async () => {
    const user = userEvent.setup();
    const saved = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    render(<ActivityShell initial={initial} repository={repository(saved)} userId="guest-1" />);

    await user.click(screen.getByRole("button", { name: "Start activity" }));
    await user.click(screen.getByRole("radio", { name: "Clarify the decision" }));
    await user.click(screen.getByRole("button", { name: "Commit answer" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Finish activity" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/not saved/i);
    expect(window.sessionStorage.getItem("casework:v3-activity:v3-private-test:1")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(2));
    expect(window.sessionStorage.getItem("casework:v3-activity:v3-private-test:1")).toBeNull();
  });

  it("restores committed events without restoring a private draft", async () => {
    window.sessionStorage.setItem("casework:v3-activity:v3-private-test:1", JSON.stringify({
      attemptId: "restored-attempt",
      startedAt: "2026-09-18T12:00:00.000Z",
      events: [{ eventId: "start", type: "activity_started", atMs: 0 }],
    }));
    render(<ActivityShell initial={initial} repository={repository()} userId="guest-1" />);
    expect(await screen.findByRole("heading", { name: "Make your commitment" })).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
