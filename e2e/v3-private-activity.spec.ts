import { expect, test } from "@playwright/test";

test("private V3 activity commits, restores, retries, and completes", async ({ page }) => {
  await page.goto("/practice/activities/v3-private-test?version=1");
  await expect(page.getByText("Clarify the decision first.")).toHaveCount(0);

  await page.getByRole("button", { name: "Start activity" }).click();
  await page.getByRole("radio", { name: "Ask for company history" }).check();
  await page.getByRole("button", { name: "Commit answer" }).click();
  await expect(page.getByText("Company history does not resolve the immediate decision.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Company history does not resolve the immediate decision.")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("radio", { name: "Clarify the decision" }).check();
  await page.getByRole("button", { name: "Commit answer" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish activity" }).click();
  await expect(page.getByRole("heading", { name: "Activity complete" })).toBeVisible();
});
