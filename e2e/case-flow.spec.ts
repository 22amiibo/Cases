import { expect, test } from "@playwright/test";

test("home introduces deliberate case practice", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Practice case interviews by practicing the thinking.",
    }),
  ).toBeVisible();
});
