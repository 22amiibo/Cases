import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("clarification V2 keeps answers hidden, returns authored responses, and records diagnostics", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  let commitBody = "";
  page.on("request", (request) => {
    if (request.url().includes("/api/drills/alpinefit-opening-clarification/commit")) {
      commitBody = request.postData() ?? "";
    }
  });
  await page.goto("/drills/clarification");

  await expect(page.getByText("One strong opening")).toHaveCount(0);
  await expect(page.getByText(/Operating margin is operating profit/)).toHaveCount(0);
  await page.getByLabel("Your response").fill(
    "Identify the drivers of the margin decline and the actions that can restore profitability.",
  );
  await page.getByRole("button", { name: "Commit response" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Check your response" })).toBeFocused();
  expect(commitBody).not.toContain("One strong opening");
  expect(commitBody).not.toContain("highValue");

  await page.getByLabel("Restates the CEO's decision objective").check();
  await page.getByLabel("Names operating margin and its decline").check();
  await page.getByLabel("Connects the diagnosis to what AlpineFit should do").check();
  await page.getByRole("button", { name: "Save self-check" }).press("Enter");
  await page.getByRole("button", { name: "View comparison" }).press("Enter");
  await expect(page.getByText(/six-point margin decline/)).toBeVisible();
  await page.getByRole("button", { name: "Finish practice" }).press("Enter");

  await page.getByLabel("How is operating margin defined, and is the decline chain-wide?").check();
  await page.getByLabel("Did the decline occur gradually or at a particular point last year?").check();
  await page.getByLabel("Are there constraints on pricing, investment, or member experience?").check();
  await page.getByRole("button", { name: "Ask selected questions" }).press("Enter");
  await expect(page.getByText(/Operating margin is operating profit/)).toBeVisible();
  await expect(page.getByText(/last nine months/)).toBeVisible();
  await expect(page.getByText(/does not want a broad price increase/)).toBeVisible();
  await expect(page.getByText("You framed the decision and resolved useful ambiguity.")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
