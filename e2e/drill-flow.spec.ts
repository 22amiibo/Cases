import { expect, test } from "@playwright/test";

test("completes a quantitative drill with immediate feedback", async ({ page }) => {
  await page.goto("/drills");
  await expect(page.getByRole("heading", { name: "Choose one thinking move" })).toBeVisible();

  await page.getByRole("link", { name: /Quantitative reasoning/ }).click();
  await page.getByLabel("Your answer").fill("25");
  await page.getByLabel("Unit").selectOption("$/unit");
  await page.getByRole("button", { name: "Check answer" }).click();

  await expect(page.getByText("100 / 100")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next question" })).toBeVisible();
});

test("keeps exhibit charts readable within a phone-width card", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/drills/exhibit");

  const chart = page.getByRole("img", { name: /Cost growth by category chart/ });
  const svg = chart.getByRole("application");

  await expect(chart).toBeVisible();
  await expect(svg).toBeVisible();

  const [chartBox, svgBox] = await Promise.all([chart.boundingBox(), svg.boundingBox()]);
  expect(chartBox).not.toBeNull();
  expect(svgBox).not.toBeNull();
  expect(svgBox!.width).toBeLessThanOrEqual(chartBox!.width);
});
