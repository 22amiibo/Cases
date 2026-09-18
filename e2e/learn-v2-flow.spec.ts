import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeGeneratedResponse } from "./alpinefit-v2-helpers";

test("a core lesson embeds its exact V2 rep and retries a failed save", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/learn");
  const lesson = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Ask the question that can change the answer" }),
  });
  await lesson.getByText("Open exact V2 practice").click();
  await expect(lesson.getByRole("heading", { name: "Choose the next branch" })).toBeVisible();
  await expect(lesson.getByText("Break down operating costs because", { exact: false })).toHaveCount(0);

  await completeGeneratedResponse(
    lesson,
    "Break down operating costs because the answer will separate fixed from variable pressure.",
  );
  await lesson.getByLabel("Break down operating costs").check();
  await page.evaluate(() => {
    const target = window as typeof window & { restoreSetItem?: typeof Storage.prototype.setItem };
    target.restoreSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "casework:practice-history") throw new DOMException("Storage unavailable");
      return target.restoreSetItem!.call(this, key, value);
    };
  });
  await lesson.getByRole("button", { name: "Check decision" }).click();
  await expect(lesson.getByRole("alert")).toHaveText("Your result was not saved. Try again.");
  await page.evaluate(() => {
    const target = window as typeof window & { restoreSetItem?: typeof Storage.prototype.setItem };
    if (target.restoreSetItem) Storage.prototype.setItem = target.restoreSetItem;
  });
  await lesson.getByRole("button", { name: "Check decision" }).click();
  await expect(lesson.getByRole("heading", { name: "Practice complete" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("pattern lessons link to their exact versioned V2 rep", async ({ page }) => {
  await page.goto("/learn");
  const pattern = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Find the hidden denominator" }),
  });
  await expect(pattern.getByRole("link", { name: "Practice this pattern" }))
    .toHaveAttribute("href", "/drills/exhibit?rep=cedarcare-exhibit-v2");
});
