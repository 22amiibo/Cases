import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { completeAlpineFitV2 } from "./alpinefit-v2-helpers";
async function finishActivity(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Finish activity" }).click();
  await page.getByRole("link", { name: "Continue course", exact: true }).click();
  await expect(page).toHaveURL(/\/learn\/courses\/profitability-v3/);
  await page.getByRole("link", { name: "Continue course", exact: true }).click();
}
test("guest completes all nine exact Profitability steps, AlpineFit, and the debrief", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/learn");
  await page.getByRole("link", { name: "Open Profitability course" }).click();
  await page.getByRole("button", { name: "Enroll in course" }).click();
  await page.getByRole("link", { name: "Continue course", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How profitability cases work" })).toBeVisible();
  await page.getByRole("link", { name: "Continue course", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Revenue and cost drivers" })).toBeVisible();
  await page.getByRole("link", { name: "Continue course", exact: true }).click();
  await page.getByRole("button", { name: "Start activity" }).click();
  await page.getByRole("radio", { name: /How is operating margin defined/ }).check();
  await page.getByRole("button", { name: "Commit answer" }).click();
  await page.reload();
  await expect(page.getByText(/Operating margin is operating profit divided by revenue/)).toBeVisible();
  await finishActivity(page);
  await page.getByRole("button", { name: "Start activity" }).click();
  for (const [idea, category] of [["Membership price or discount mix", "Revenue"], ["Overtime hours and premium", "Labor and staffing"], ["Occupancy expense", "Other operating costs"]]) {
    await page.getByRole("checkbox", { name: idea, exact: true }).check();
    await page.getByLabel(`Category for ${idea}`).selectOption({ label: category });
  }
  await page.getByRole("checkbox", { name: "Prioritize Overtime hours and premium" }).check();
  await page.getByRole("button", { name: "Commit brainstorm" }).click();
  await finishActivity(page);
  await expect(page).toHaveURL(/lessons\/structuring\?version=2/);
  await page.getByRole("link", { name: "Continue course", exact: true }).click();
  await expect(page).toHaveURL(/lessons\/quantitative-implication\?version=2/);
  await page.getByRole("link", { name: "Continue course", exact: true }).click();
  await page.getByRole("button", { name: "Start activity" }).click();
  for (const [name, stage] of [[/Club labor rose by/, "observe"], ["Prioritize the labor outlier", "prioritize"], ["Labor is the leading margin-pressure candidate", "interpret"], ["Break labor down by club and driver", "act"]] as const) {
    await page.getByRole("radio", { name }).check();
    await page.getByRole("button", { name: `Commit ${stage}` }).click();
  }
  await finishActivity(page);
  await page.getByRole("button", { name: "Start activity" }).click();
  await page.getByRole("radio", { name: /Revenue economics/ }).check();
  await page.getByRole("button", { name: "Commit hypothesis" }).click();
  await page.getByLabel("Status").selectOption("revise");
  await page.getByRole("radio", { name: /Operating-cost and labor pressure/ }).check();
  await page.getByRole("checkbox", { name: "Use this evidence in the update" }).check();
  await page.getByLabel("Reasoning").selectOption("contradicts");
  await page.getByRole("button", { name: "Commit update" }).click();
  await page.getByRole("checkbox", { name: "Use this evidence in the update" }).check();
  await page.getByLabel("Reasoning").selectOption("supports");
  await page.getByRole("button", { name: "Commit update" }).click();
  await finishActivity(page);
  await expect(page).toHaveURL(/cases\/alpinefit-profitability\?version=2&mode=practice&course=profitability-v3/);
  await completeAlpineFitV2(page, { startUrl: page.url(), refresh: true });
  await page.getByRole("link", { name: "Continue course", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Course complete" })).toBeVisible();
  await expect(page.getByText("9 of 9 steps complete")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("casework:practice-history")!));
  expect(saved.courseStepEvents).toHaveLength(4);
  expect(saved.activityAttempts).toHaveLength(4);
  expect(saved.v3CaseAttempts[0].courseContext).toEqual({ courseId: "profitability-v3", courseVersion: 1, courseStepId: "case" });
  await page.getByRole("link", { name: "Review capstone debrief" }).click();
  await expect(page.getByRole("heading", { name: "Your case review" })).toBeVisible();
  await page.getByRole("link", { name: "Continue course", exact: true }).click();
  await page.getByRole("link", { name: "Next practice", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Clarify PayPilot's growth choice" })).toBeVisible();
});

test("course launches keep standalone activity and case drafts isolated", async ({ page }) => {
  const { completeGeneratedResponse } = await import("./alpinefit-v2-helpers");
  await page.goto("/practice/activities/alpinefit-clarifying-v3?version=1");
  await page.getByRole("button", { name: "Start activity" }).click();
  await page.getByRole("radio", { name: /How is operating margin defined/ }).check();
  await page.getByRole("button", { name: "Commit answer" }).click();
  await page.goto("/cases/alpinefit-profitability?version=2&mode=practice");
  await completeGeneratedResponse(page, "Clarify the profit metric, time horizon, and decision.");
  await expect(page.getByLabel("Which performance metric should we explain?")).toBeVisible();
  await page.goto("/learn/courses/profitability-v3?version=1");
  await page.getByRole("button", { name: "Enroll in course" }).click();
  await page.getByRole("link", { name: "Clarify the profit question", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start activity" })).toBeVisible();
  await page.getByRole("link", { name: "Exit Activity", exact: true }).click();
  await expect(page.getByText("0 of 9 steps complete")).toBeVisible();
  await page.getByRole("link", { name: "Apply it in AlpineFit", exact: true }).click();
  await expect(page.getByLabel("Your response")).toHaveValue("");
  await expect(page.getByLabel("Which performance metric should we explain?")).toHaveCount(0);
  await page.goto("/cases/alpinefit-profitability?version=2&mode=practice");
  await expect(page.getByLabel("Which performance metric should we explain?")).toBeVisible();
});

test("signed-in learners continue from repository evidence on a second device", async ({ browser }) => {
  const rows: Record<string, Record<string, unknown>[]> = { course_enrollments: [], course_step_events: [] };
  const devices = await Promise.all([browser.newContext(), browser.newContext()]);
  for (const device of devices) {
    await device.addInitScript(() => {
      const session = { access_token: `e2e.${btoa(JSON.stringify({ sub: "user-1", exp: 4102444800, role: "authenticated" }))}.signature`, refresh_token: "refresh", token_type: "bearer", expires_in: 2147483647, expires_at: 4102444800, user: { id: "user-1", aud: "authenticated", role: "authenticated", email: "learner@example.com", app_metadata: {}, user_metadata: {}, identities: [], created_at: "2026-01-01T00:00:00.000Z" } };
      localStorage.setItem("sb-127-auth-token", JSON.stringify(session));
    });
    await device.route("http://127.0.0.1:54321/rest/v1/**", async route => {
      const request = route.request();
      const url = new URL(request.url());
      const table = url.pathname.split("/").at(-1)!;
      if (request.method() === "POST" && rows[table]) rows[table].push(request.postDataJSON());
      await route.fulfill({ contentType: "application/json", body: request.method() === "GET" ? JSON.stringify((rows[table] ?? []).filter(row => url.searchParams.get("user_id") === `eq.${row.user_id}`)) : "null" });
    });
  }
  const first = await devices[0].newPage();
  await first.goto("http://127.0.0.1:3000/learn/courses/profitability-v3?version=1");
  await first.getByRole("button", { name: "Enroll in course" }).click();
  await first.getByRole("link", { name: "Continue course", exact: true }).click();
  await expect(first.getByRole("link", { name: "Continue course", exact: true })).toHaveAttribute("href", /step=drivers$/);
  await devices[0].close();
  const second = await devices[1].newPage();
  await second.goto("http://127.0.0.1:3000/learn/courses/profitability-v3?version=1");
  await expect(second.getByText("1 of 9 steps complete")).toBeVisible();
  await expect(second.getByRole("link", { name: "Continue course", exact: true })).toHaveAttribute("href", /step=drivers$/);
  expect(await second.evaluate(() => sessionStorage.getItem("casework:practice-history"))).toBeNull();
  await second.goto("http://127.0.0.1:3000/progress");
  await expect(second.getByRole("region", { name: "Recommended next", exact: true }).getByRole("link")).toHaveAttribute("href", /step=drivers$/);
  await devices[1].close();
});
