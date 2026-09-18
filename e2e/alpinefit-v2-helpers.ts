import { expect, type Locator, type Page } from "@playwright/test";

export async function completeGeneratedResponse(
  scope: Page | Locator,
  text: string,
  revision?: string,
  interview = false,
) {
  await scope.getByLabel("Your response").fill(text);
  await scope.getByRole("button", { name: "Commit response" }).click();
  await scope.getByRole("button", { name: "Save self-check" }).click();
  if (interview) {
    await scope.getByRole("button", { name: "Continue" }).first().click();
    return;
  }
  await scope.getByRole("button", { name: "View comparison" }).click();
  if (revision) {
    await scope.getByRole("button", { name: "Try another response" }).click();
    await scope.getByLabel("Your revised response").fill(revision);
    await scope.getByRole("button", { name: "Commit revision" }).click();
    await scope.getByRole("button", { name: "Save self-check" }).click();
    await scope.getByRole("button", { name: "View comparison" }).click();
  }
  await scope.getByRole("button", { name: "Finish practice" }).click();
}

export async function completeAlpineFitV2(
  page: Page,
  {
    refresh = false,
    recommendationRetry = false,
    calculationRetry = false,
    saveRecovery = false,
    interview = false,
  }: {
    refresh?: boolean;
    recommendationRetry?: boolean;
    calculationRetry?: boolean;
    saveRecovery?: boolean;
    interview?: boolean;
  } = {},
) {
  await page.goto(`/cases/alpinefit-profitability${interview ? "?mode=interview" : ""}`);
  await expect(page.getByText("six-point decline", { exact: false })).toHaveCount(0);
  await expect(page.getByLabel("Which performance metric should we explain?")).toHaveCount(0);
  await completeGeneratedResponse(
    page,
    "Explain the EBITDA-margin decline across all clubs and clarify the metric, period, and concentration.",
    undefined,
    interview,
  );
  await page.getByLabel("Which performance metric should we explain?").check();
  await page.getByLabel("Over what period did performance change?").check();
  await page.getByLabel("Is the issue concentrated in a product or geography?").check();
  await page.getByRole("button", { name: "Save opening" }).click();
  await expect(page.getByLabel("Major area to add")).toBeVisible();
  if (refresh) await page.reload();

  await page.getByLabel("Major area to add").selectOption("revenue");
  await page.getByRole("button", { name: "Add major area" }).click();
  await page.getByLabel("Major area to add").selectOption("variable_cost");
  await page.getByRole("button", { name: "Add major area" }).click();
  await page.getByRole("button", { name: "Investigate Variable cost first" }).click();
  await page.getByLabel("Why investigate this area first?").fill("Costs grew faster than revenue, so test variable labor pressure first.");
  await page.getByRole("button", { name: "Submit framework" }).click();
  await expect(page.getByLabel("Your response")).toBeVisible();
  if (refresh) await page.reload();

  await completeGeneratedResponse(page, "Revenue economics may be compressing margin; test price and volume against cost growth.", undefined, interview);
  await page.getByRole("region", { name: "initial hypothesis" }).getByRole("combobox").selectOption("revenue-economics");
  await page.getByRole("button", { name: "Start investigation" }).click();
  const revenueGroup = page.getByRole("region", { name: "Revenue" });
  const operatingCostsGroup = page.getByRole("region", { name: "Operating Costs" });
  await expect(revenueGroup.getByRole("button", { name: "Understand revenue performance" })).toBeVisible();
  await expect(operatingCostsGroup.getByRole("button", { name: "Break down operating costs" })).toBeVisible();
  if (refresh) await page.reload();

  await page.getByRole("button", { name: "Break down operating costs" }).click();
  await completeGeneratedResponse(page.getByRole("region", { name: "update hypothesis" }), "Costs grew 17% versus 8% revenue, so revise from revenue economics toward labor pressure.", undefined, interview);
  await page.getByLabel("Operating costs grew 17%, substantially faster than revenue.").check();
  await page.getByLabel("Update decision").selectOption("revise");
  await page.getByLabel("Revised hypothesis").selectOption("labor-pressure");
  await page.getByRole("button", { name: "Save hypothesis update" }).click();

  await completeGeneratedResponse(page.getByRole("region", { name: "What you know now" }), "Labor is the cost outlier; it likely drives margin pressure, so break labor down by location.", undefined, interview);
  if (interview) await page.getByRole("region", { name: "What you know now" }).getByRole("button", { name: "Continue" }).last().click();
  else {
    await page.getByLabel("Which authored insight best matches your interpretation?").selectOption("labor-outlier");
    await page.getByRole("button", { name: "Commit interpretation" }).click();
  }
  await expect(page.getByText("Interpretation committed.")).toBeVisible();
  if (refresh) await page.reload();

  await page.getByRole("button", { name: "Inspect variable costs" }).click();
  const laborGroup = page.getByRole("region", { name: "Labor & Staffing" });
  await expect(laborGroup.getByRole("button", { name: "Inspect club labor" })).toContainText("After Inspect variable costs");
  await expect(page.getByLabel("Next investigation")).toHaveCount(0);
  await page.getByRole("button", { name: "Inspect club labor" }).click();
  await page.getByRole("button", { name: "Inspect overtime usage" }).click();
  await completeGeneratedResponse(page.getByRole("region", { name: "What you know now" }), "Six clubs have much higher overtime and turnover; quantify the premium and inspect vacancies.", undefined, interview);
  if (interview) await page.getByRole("region", { name: "What you know now" }).getByRole("button", { name: "Continue" }).last().click();
  else {
    await page.getByLabel("Which authored insight best matches your interpretation?").selectOption("overtime-turnover-link");
    await page.getByRole("button", { name: "Commit interpretation" }).click();
  }
  await expect(page.getByText("Interpretation committed.").nth(1)).toBeVisible();
  if (refresh) await page.reload();

  await completeGeneratedResponse(page.getByRole("region", { name: "calculation practice" }), "Six clubs times 3,600 hours times $35 is about $756,000 annually, a material staffing opportunity.", undefined, interview);
  await page.getByLabel("Calculated answer", { exact: true }).fill("756000");
  await page.getByRole("combobox", { name: "Unit" }).click();
  await page.getByRole("option", { name: calculationRetry ? "%" : "$", exact: true }).click();
  await page.getByRole("button", { name: "Save calculation" }).click();
  if (calculationRetry && !interview) {
    await expect(page.getByText("Review your calculation")).toBeVisible();
    await expect(page.getByText("Needs correction")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save calculation" })).toBeEnabled();
    await page.getByRole("combobox", { name: "Unit" }).click();
    await page.getByRole("option", { name: "$", exact: true }).click();
    await page.getByRole("button", { name: "Save calculation" }).click();
  }
  await expect(page.getByLabel("Calculated answer", { exact: true })).toHaveCount(0);
  if (refresh) await page.reload();

  await page.getByRole("button", { name: "Compare staff turnover" }).click();
  await completeGeneratedResponse(page.getByRole("region", { name: "synthesis practice" }), "The margin decline is a concentrated labor problem supported by labor growth, overtime, and turnover; test vacancies next.", undefined, interview);
  await page.getByLabel("Labor expense grew 34%, while staffed service hours grew only 11%.").check();
  await page.getByLabel("Overtime hours nearly tripled, with the highest usage in six clubs.").check();
  await page.getByLabel("The six high-overtime clubs have 31% annual staff turnover versus 12% elsewhere.").check();
  await page.getByLabel("Next investigation").selectOption("vacancies");
  await page.getByRole("button", { name: "Save synthesis" }).click();
  await expect(page.getByLabel("recommendation practice")).toBeVisible();
  if (refresh) await page.reload();

  await completeGeneratedResponse(
    page.getByRole("region", { name: "recommendation practice" }),
    "Stabilize staffing in six clubs, manage service risk, and run a 90-day pilot.",
    recommendationRetry
      ? "Stabilize staffing in six high-overtime clubs using faster hiring and retention, protect service, and run a 90-day pilot."
      : undefined,
    interview,
  );
  await page.getByLabel("Decision").selectOption("stabilize-staffing");
  await page.getByLabel("Labor expense grew 34%, while staffed service hours grew only 11%.").check();
  await page.getByLabel("Overtime hours nearly tripled, with the highest usage in six clubs.").check();
  await page.getByLabel(interview
    ? "Use your completed calculation as evidence in the final recommendation."
    : "Current overtime creates approximately $756,000 of incremental annual labor expense.").check();
  await page.getByLabel("Risk").selectOption("service-disruption");
  await page.getByLabel("Next step").selectOption("six-club-pilot");
  if (saveRecovery) {
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      let failed = false;
      Storage.prototype.setItem = function (key, value) {
        if (key === "casework:practice-history" && !failed) {
          failed = true;
          throw new DOMException("Storage unavailable");
        }
        return originalSetItem.call(this, key, value);
      };
    });
  }
  await page.getByRole("button", { name: "Save recommendation" }).click();
  if (saveRecovery) {
    const retry = page.getByRole("button", { name: "Retry saving completed case" });
    await expect(retry).toBeVisible();
    await retry.click();
  }
  await expect(page.getByRole("heading", { name: "Your case review" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Revenue" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Operating Costs" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Labor & Staffing" })).toBeVisible();
}
