import { expect, test } from "@playwright/test";

for (const route of ["/", "/learn", "/practice", "/cases", "/progress", "/drills"]) {
  test(`${route} uses only the approved static typography`, async ({ page }) => {
    await page.goto(route);
    const typography = await page.locator("main").evaluate((main) => {
      const elements = [main, ...main.querySelectorAll("*")];
      return {
        families: [...new Set(elements.map((element) => getComputedStyle(element).fontFamily))],
        weights: [...new Set(elements.map((element) => getComputedStyle(element).fontWeight))],
        variations: [...new Set(elements.map((element) => getComputedStyle(element).fontVariationSettings))],
      };
    });
    expect(typography.families.join(" ")).not.toMatch(/geist|variable/i);
    expect(typography.variations).toEqual(["normal"]);
    expect(typography.weights.every((weight) => ["400", "500", "600", "700"].includes(weight))).toBe(true);
  });
}
