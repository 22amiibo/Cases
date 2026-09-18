import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CalculationDefinitionSchema } from "@/core/schema";
import { CalculationTask } from "./CalculationTask";

const task = CalculationDefinitionSchema.parse({
  id: "labor-impact",
  prompt: "Calculate incremental annual labor expense.",
  unit: "$",
  formula: { operation: "multiply", inputs: [6, 3600, 35] },
  expectedAnswer: 756000,
  tolerance: 1000,
  prerequisiteNodeIds: ["overtime"],
  evidenceFactId: "labor-impact-fact",
});

describe("CalculationTask", () => {
  it("accepts a correct answer within tolerance and emits the task result", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CalculationTask definition={task} onSubmit={onSubmit} />);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Answer in $"), "755500");
    await user.click(screen.getByRole("button", { name: "Check calculation" }));

    expect(screen.getByText("Correct")).toBeVisible();
    expect(onSubmit).toHaveBeenCalledWith({ taskId: "labor-impact", answer: 755500 });
  });

  it("rejects an answer outside tolerance", async () => {
    const user = userEvent.setup();
    render(<CalculationTask definition={task} onSubmit={() => undefined} />);

    await user.type(screen.getByLabelText("Answer in $"), "750000");
    await user.click(screen.getByRole("button", { name: "Check calculation" }));

    expect(screen.getByText("Check your math")).toBeVisible();
  });
});
