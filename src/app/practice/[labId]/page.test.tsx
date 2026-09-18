import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LabPage from "./page";

vi.mock("@/components/activity/RecentActivity", () => ({
  RecentActivity: () => <p>Recent attempts</p>,
}));

describe("Practice lab page", () => {
  it("shows the exact active activity for a valid flagship lab", async () => {
    render(await LabPage({ params: Promise.resolve({ labId: "exhibit" }) }));
    expect(screen.getByRole("heading", { name: "Exhibit analysis" })).toBeVisible();
    expect(screen.getByText("3 active repetitions")).toBeVisible();
    expect(screen.getAllByRole("link", { name: /^Start / })).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Start Turn AlpineFit cost data/ })).toHaveAttribute(
      "href",
      "/practice/activities/alpinefit-exhibit-v3?version=1",
    );
  });

  it("rejects unpublished and invalid lab IDs", async () => {
    await expect(LabPage({ params: Promise.resolve({ labId: "case_math" }) })).rejects.toThrow();
    await expect(LabPage({ params: Promise.resolve({ labId: "invented" }) })).rejects.toThrow();
  });
});
