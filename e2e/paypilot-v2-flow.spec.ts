import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeGeneratedResponse } from "./alpinefit-v2-helpers";

test("PayPilot V2 compares both strategy routes without leaking criteria", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 900 });
  const initialSessionBodies: string[] = [];
  page.on("response", async (response) => {
    if (
      initialSessionBodies.length === 0 &&
      response.url().includes("/api/cases/paypilot-growth/session")
    ) {
      initialSessionBodies.push(await response.text());
    }
  });

  await page.goto("/cases/paypilot-growth");
  await completeGeneratedResponse(
    page,
    "Choose between cross-sell and expansion using profit, durable growth, and execution risk.",
  );
  expect(initialSessionBodies[0]).not.toContain("decision-criteria");
  expect(initialSessionBodies[0]).not.toContain("cross-sell produces $1.2 million");

  await page.getByLabel("What metric should drive the decision?").check();
  await page.getByLabel("Can PayPilot pursue both options?").check();
  await page.getByLabel("Which customers are in scope for cross-sell?").check();
  await page.getByRole("button", { name: "Save opening" }).click();

  await page.getByLabel("Major area to add").selectOption("customers");
  await page.getByRole("button", { name: "Add major area" }).click();
  await page.getByLabel("Major area to add").selectOption("market_size");
  await page.getByRole("button", { name: "Add major area" }).click();
  await page.getByRole("button", { name: "Investigate Customers first" }).click();
  await page.getByLabel("Why investigate this area first?").fill(
    "Test installed-base demand first, then compare expansion economics and risk.",
  );
  await page.getByRole("button", { name: "Submit framework" }).click();

  await completeGeneratedResponse(
    page,
    "Cross-sell may win through the installed base; compare adoption and economics with expansion.",
  );
  await page.getByRole("region", { name: "initial hypothesis" })
    .getByRole("combobox")
    .selectOption("installed-base-cross-sell");
  await page.getByRole("button", { name: "Start investigation" }).click();
  await page.reload();

  await page.getByRole("button", { name: "Assess the current customer base" }).click();
  const update = page.getByRole("region", { name: "update hypothesis" });
  await completeGeneratedResponse(
    update,
    "The qualified installed base supports retaining cross-sell while I test adoption and contribution.",
  );
  await page.getByLabel(
    "8,000 of PayPilot's 12,000 current merchants have enough transaction history to use the forecasting module.",
  ).check();
  await page.getByLabel("Update decision").selectOption("retain");
  await page.getByRole("button", { name: "Save hypothesis update" }).click();

  const evidence = page.getByRole("region", { name: "What you know now" });
  await completeGeneratedResponse(
    evidence,
    "The funnel narrows to 8,000 eligible merchants and 2,000 expected buyers; test economics next.",
  );
  await evidence.getByLabel("Which authored insight best matches your interpretation?")
    .selectOption("qualified-installed-base");
  await evidence.getByRole("button", { name: "Commit interpretation" }).click();

  await page.getByRole("button", { name: "Estimate module adoption" }).click();
  await page.getByRole("button", { name: "Evaluate cross-sell economics" }).click();
  await completeGeneratedResponse(
    page.getByRole("region", { name: "calculation practice" }),
    "8,000 times 25% times $900 equals $1.8 million annual contribution before launch cost.",
  );
  await page.getByLabel("Calculated answer", { exact: true }).fill("1800000");
  await page.getByRole("combobox", { name: "Unit" }).click();
  await page.getByRole("option", { name: "$", exact: true }).click();
  await page.getByRole("button", { name: "Save calculation" }).click();
  await completeGeneratedResponse(
    evidence,
    "Cross-sell leads first-year profit by $1.55 million; pressure-test adoption and delivery timing.",
  );
  await evidence.getByLabel("Which authored insight best matches your interpretation?")
    .selectOption("cross-sell-profit-lead");
  await evidence.getByRole("button", { name: "Commit interpretation" }).click();

  await page.getByRole("button", { name: "Size the reachable new market" }).click();
  await completeGeneratedResponse(
    evidence,
    "Only 6,000 merchants are reachable and 1,500 expected wins, so headline market size overstates year-one scale.",
  );
  await evidence.getByLabel("Which authored insight best matches your interpretation?")
    .selectOption("reachable-not-total");
  await evidence.getByRole("button", { name: "Commit interpretation" }).click();
  await page.getByRole("button", { name: "Estimate first-year merchant wins" }).click();
  await page.getByRole("button", { name: "Evaluate expansion economics" }).click();
  await page.getByRole("button", { name: "Compare first-year profit and risk" }).click();

  await completeGeneratedResponse(
    page.getByRole("region", { name: "synthesis practice" }),
    "Cross-sell is stronger on first-year profit and risk; validate adoption before scaling.",
  );
  await page.getByLabel(
    "The cross-sell initiative would produce approximately $1.2 million of first-year incremental profit after launch investment.",
  ).check();
  await page.getByLabel(
    "Geographic expansion would lose approximately $350,000 in year one before any later scale benefits.",
  ).check();
  await page.getByLabel("Next investigation").selectOption("retention-effect");
  await page.getByRole("button", { name: "Save synthesis" }).click();

  await completeGeneratedResponse(
    page.getByRole("region", { name: "recommendation practice" }),
    "Stage the module cross-sell, manage adoption risk, and scale only after measured results.",
  );
  await page.getByLabel("Decision").selectOption("choose-cross-sell");
  await page.getByLabel(
    "The cross-sell initiative would produce approximately $1.2 million of first-year incremental profit after launch investment.",
  ).check();
  await page.getByLabel(
    "Geographic expansion would lose approximately $350,000 in year one before any later scale benefits.",
  ).check();
  await page.getByLabel("Risk").selectOption("adoption-shortfall");
  await page.getByLabel("Next step").selectOption("staged-cross-sell");
  await page.getByRole("button", { name: "Save recommendation" }).click();

  await expect(page.getByRole("heading", { name: "Your case review" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
