import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeGeneratedResponse } from "./alpinefit-v2-helpers";

test("GoldenLoaf transfers the V2 loop with lower scaffolding", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/cases");
  const card = page.getByRole("article").filter({ hasText: "GoldenLoaf's delayed orders" });
  await expect(card).toContainText("lower-scaffolding transfer");

  const initialSessionBodies: string[] = [];
  page.on("response", async (response) => {
    if (
      initialSessionBodies.length === 0 &&
      response.url().includes("/api/cases/goldenloaf-operations/session")
    ) {
      initialSessionBodies.push(await response.text());
    }
  });
  await page.goto("/cases/goldenloaf-operations");
  await expect(page.getByText("lower-scaffolding transfer", { exact: false })).toBeVisible();
  await expect(page.getByText("interview practice", { exact: false })).toBeVisible();
  await completeGeneratedResponse(
    page,
    "Identify the operating bottleneck and restore fulfillment without a major facility expansion.",
  );
  expect(initialSessionBodies[0]).not.toContain("baking is the binding constraint");
  expect(initialSessionBodies[0]).not.toContain("sequence-and-flex");

  await page.getByLabel("Which service outcome should we improve?").check();
  await page.getByLabel("Which facilities and customers are in scope?").check();
  await page.getByLabel("What investment constraints should we respect?").check();
  await page.getByRole("button", { name: "Save opening" }).click();
  await page.getByLabel("Major area to add").selectOption("capacity");
  await page.getByRole("button", { name: "Add major area" }).click();
  await page.getByLabel("Major area to add").selectOption("volume");
  await page.getByRole("button", { name: "Add major area" }).click();
  await page.getByRole("button", { name: "Investigate Capacity first" }).click();
  await page.getByLabel("Why investigate this area first?").fill(
    "Compare demand with each process stage and isolate the binding constraint.",
  );
  await page.getByRole("button", { name: "Submit framework" }).click();

  await completeGeneratedResponse(
    page,
    "Demand peaks and product mix may have outgrown effective production capacity.",
  );
  await page.getByRole("region", { name: "initial hypothesis" })
    .getByRole("combobox")
    .selectOption("demand-mix-pressure");
  await page.getByRole("button", { name: "Start investigation" }).click();
  await page.getByRole("button", { name: "Review daily demand" }).click();
  await page.getByRole("button", { name: "Review the recent product-mix shift" }).click();
  await page.getByRole("button", { name: "Compare capacity by production stage" }).click();

  const update = page.getByRole("region", { name: "update hypothesis" });
  await completeGeneratedResponse(
    update,
    "Baking has the lowest capacity, so revise toward an oven constraint and test lost time.",
  );
  await page.getByLabel(
    "Daily effective capacity is 1,200 trays in mixing, 1,100 in proofing, 760 in baking, and 1,050 in packaging.",
  ).check();
  await page.getByLabel("Update decision").selectOption("revise");
  await page.getByLabel("Revised hypothesis").selectOption("baking-changeover-constraint");
  await page.getByRole("button", { name: "Save hypothesis update" }).click();
  await page.reload();

  const evidence = page.getByRole("region", { name: "What you know now" });
  await completeGeneratedResponse(
    evidence,
    "Baking is the capacity and utilization outlier; inspect oven queues and lost operating time.",
  );
  await evidence.getByLabel("Which authored insight best matches your interpretation?")
    .selectOption("baking-bottleneck");
  await evidence.getByRole("button", { name: "Commit interpretation" }).click();
  await page.getByRole("button", { name: "Inspect oven utilization and queues" }).click();
  await page.getByRole("button", { name: "Analyze oven changeovers" }).click();
  await completeGeneratedResponse(
    evidence,
    "More changeovers reduced effective oven capacity; the sequencing pilot tests a recoverable scheduling cause.",
  );
  await evidence.getByLabel("Which authored insight best matches your interpretation?")
    .selectOption("changeover-loss");
  await evidence.getByRole("button", { name: "Commit interpretation" }).click();
  await page.getByRole("button", { name: "Review the production-sequencing pilot" }).click();
  await page.getByRole("button", { name: "Evaluate peak-day coverage" }).click();

  await completeGeneratedResponse(
    page.getByRole("region", { name: "synthesis practice" }),
    "Changeovers made baking the bottleneck; sequencing restores average capacity and flex hours cover peaks.",
  );
  await page.getByLabel(
    "Daily effective capacity is 1,200 trays in mixing, 1,100 in proofing, 760 in baking, and 1,050 in packaging.",
  ).check();
  await page.getByLabel(
    "Cleaning and temperature resets now consume about eight oven hours per week, reducing effective baking capacity to 760 trays per day.",
  ).check();
  await page.getByLabel(
    "A two-week pilot grouping products by bake temperature reduced changeovers by 38% and raised effective oven capacity to 880 trays per day without affecting quality.",
  ).check();
  await page.getByLabel("Next investigation").selectOption("staffing");
  await page.getByRole("button", { name: "Save synthesis" }).click();

  await completeGeneratedResponse(
    page.getByRole("region", { name: "recommendation practice" }),
    "Roll out sequencing and flexible peak hours while monitoring quality and team fatigue.",
  );
  await page.getByLabel("Decision").selectOption("sequence-and-flex");
  await page.getByLabel(
    "Cleaning and temperature resets now consume about eight oven hours per week, reducing effective baking capacity to 760 trays per day.",
  ).check();
  await page.getByLabel(
    "A two-week pilot grouping products by bake temperature reduced changeovers by 38% and raised effective oven capacity to 880 trays per day without affecting quality.",
  ).check();
  await page.getByLabel("Risk").selectOption("freshness-window");
  await page.getByLabel("Next step").selectOption("four-week-rollout");
  await page.getByRole("button", { name: "Save recommendation" }).click();

  await expect(page.getByRole("heading", { name: "Your case review" })).toBeVisible();
  await expect(page.getByText("Revision 1").first()).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
