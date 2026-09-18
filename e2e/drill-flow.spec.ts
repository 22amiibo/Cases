import { expect, test } from "@playwright/test";

test("a wrong quantitative drill answer gets educational feedback", async ({ page }) => {
  await page.goto("/drills");
  await expect(page.getByRole("heading", { name: "Choose one thinking move" })).toBeVisible();

  await page.getByRole("link", { name: /Quantitative reasoning/ }).click();
  await page.getByText("Open the 10-drill Legacy V1 library").click();
  await page.getByLabel("Your answer").fill("20");
  await page.getByRole("combobox", { name: "Unit" }).click();
  await page.getByRole("option", { name: "%", exact: true }).click();
  await page.getByRole("button", { name: "Check answer" }).click();

  await expect(page.getByText("Your answer: 20 %")).toBeVisible();
  await expect(page.getByText("Correct answer:")).toContainText("25 $/unit");
  await expect(page.getByText("Subtract variable cost from price:")).toContainText("$80 - $55 = $25 per unit.");
  await expect(page.getByRole("button", { name: "Next question" })).toBeVisible();
});

test("keeps exhibit charts readable within a phone-width card", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/drills/exhibit");
  await page.getByText("Open the 10-drill Legacy V1 library").click();

  const chart = page.getByRole("img", { name: /Cost growth by category chart/ });
  const svg = chart.getByRole("application");

  await expect(chart).toBeVisible();
  await expect(svg).toBeVisible();

  const [chartBox, svgBox] = await Promise.all([chart.boundingBox(), svg.boundingBox()]);
  expect(chartBox).not.toBeNull();
  expect(svgBox).not.toBeNull();
  expect(svgBox!.width).toBeLessThanOrEqual(chartBox!.width);
});
