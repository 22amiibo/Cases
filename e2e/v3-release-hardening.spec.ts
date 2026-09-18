import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const primaryDestinations = [
  ["Learn", "/learn"],
  ["Practice", "/practice"],
  ["Cases", "/cases"],
  ["Progress", "/progress"],
] as const;

for (const viewport of [
  { name: "phone", width: 320, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test(`primary navigation is keyboard-ready and reflows at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const navigation = page.getByRole("navigation", { name: "Primary" });
    const links = navigation.getByRole("link");
    await expect(links).toHaveCount(4);
    await expect(links).toHaveText(primaryDestinations.map(([label]) => label));

    await page.keyboard.press("Tab");
    await expect(navigation.getByRole("link", { name: "Learn" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/learn$/);
    await expect(navigation.getByRole("link", { name: "Learn" })).toHaveAttribute("aria-current", "page");

    for (const [label, href] of primaryDestinations) {
      await page.goto(href);
      await expect(navigation.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test("pre-commit V3 responses keep authored evaluation material server-side", async ({ page }) => {
  const activityResponse = await page.goto("/practice/activities/alpinefit-exhibit-v3?version=1");
  await expect(page.getByRole("heading", { name: "Turn AlpineFit cost data into an action" })).toBeVisible();
  const activityBody = await activityResponse!.text();

  const caseResponse = page.waitForResponse((response) =>
    response.url().includes("/api/cases/alpinefit-profitability/session"),
  );
  await page.goto("/cases/alpinefit-profitability?mode=practice");
  await expect(page.getByRole("heading", { name: "AlpineFit's shrinking margin" })).toBeVisible();

  const preCommitTraffic = [
    activityBody,
    await (await caseResponse).text(),
  ].join("\n");
  expect(preCommitTraffic).not.toContain("strong_exhibit_chain");
  expect(preCommitTraffic).not.toContain("You connected the labor outlier to margin pressure");
  expect(preCommitTraffic).not.toContain("six-point decline");
  expect(preCommitTraffic).not.toContain('"outcomeId"');
});
