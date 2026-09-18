import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { completeAlpineFitV2 } from "./alpinefit-v2-helpers";

async function completeQuantitativeDrill(
  page: Page,
  answer: string,
  unit: string,
) {
  await page.getByLabel("Your answer").fill(answer);
  await page.getByRole("combobox", { name: "Unit" }).click();
  await page.getByRole("option", { name: unit, exact: true }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("100 / 100")).toBeVisible();
}

test("guest sees progress and a deterministic next session after practice", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/drills/quantitative");
  await page.getByText("Open the 10-drill Legacy V1 library").click();
  await completeQuantitativeDrill(page, "25", "$/unit");
  await page.getByRole("button", { name: "Next question" }).click();
  await completeQuantitativeDrill(page, "40000", "orders");
  await completeAlpineFitV2(page);

  await page.goto("/");
  await page.getByRole("link", { name: "View progress" }).click();

  await expect(
    page.getByRole("heading", { name: "Your practice progress" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your learning evidence" }),
  ).toBeVisible();
  await expect(page.getByText("1 V2 sessions · 2 Legacy V1 sessions")).toBeVisible();
  await expect(
    page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Legacy V1" }) })
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: "Quantitative reasoning" }) })
      .getByText("Strong", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recommended next: Comparison missed" }),
  ).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Recommended next: Comparison missed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /practice beacon exhibit transfer · v2/i }),
  ).toHaveAttribute(
    "href",
    "/drills/exhibit?rep=beacon-exhibit-v2&version=2",
  );
});

test("dense guest history targets a recurring objective diagnosis and rotates after retry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await page.evaluate(() => {
    const diagnostic = {
      code: "missing_major_branch",
      source: "system",
      severity: "blocking",
    };
    const drillAttempts = [1, 2, 3].map((day) => ({
      attemptId: `structure-${day}`,
      userId: "guest",
      drillId: "quickcart-structure-v2",
      skillId: "structure",
      score: 0,
      feedbackCodes: [],
      conceptIdsPracticed: ["structure"],
      completedAt: `2026-09-0${day}T00:00:00.000Z`,
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      diagnostics: day < 3 ? [diagnostic] : [],
      learningEvidence: {
        interactionId: `structure-${day}`,
        skillId: "structure",
        scoringVersion: "v2",
        contentVersion: 2,
        eventSchemaVersion: 2,
        scaffoldingLevel: "beginner",
        responses: [{
          responseId: `structure-${day}-r1`,
          interactionId: `structure-${day}`,
          revision: 1,
          revisionOf: null,
          responseKind: "structure",
          text: "Committed structure",
          committedAtMs: day,
        }],
        rubricOutcomes: [{ criterionId: "branches", met: day === 3 }],
        diagnostics: day < 3 ? [diagnostic] : [],
      },
    }));
    const setup = {
      code: "setup_error",
      source: "system",
      severity: "blocking",
    };
    for (const day of [4, 5]) {
      drillAttempts.push({
        ...drillAttempts[0],
        attemptId: `math-${day}`,
        drillId: "harborcart-quantitative-v2",
        skillId: "quantitative",
        conceptIdsPracticed: ["quantitative"],
        completedAt: `2026-09-0${day}T00:00:00.000Z`,
        diagnostics: [setup],
        learningEvidence: {
          ...drillAttempts[0].learningEvidence,
          interactionId: `math-${day}`,
          skillId: "quantitative",
          responses: [{
            responseId: `math-${day}-r1`,
            interactionId: `math-${day}`,
            revision: 1,
            revisionOf: null,
            responseKind: "quantitative",
            text: "Committed setup",
            committedAtMs: day,
          }],
          diagnostics: [setup],
        },
      });
    }
    sessionStorage.setItem("casework:practice-history", JSON.stringify({
      drillAttempts,
      caseAttempts: [],
    }));
  });

  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Recommended next: Setup error" }))
    .toBeVisible();
  await expect(page.getByText("Objective system finding")).toBeVisible();
  await expect(page.getByRole("link", { name: /harborcart quantitative transfer · v2/i }))
    .toHaveAttribute(
      "href",
      "/drills/quantitative?rep=harborcart-quantitative-v2&version=2",
    );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});

test("signed-in history produces the same exact diagnostic recommendation", async ({
  page,
}) => {
  const payload = Buffer.from(JSON.stringify({
    sub: "user-1",
    exp: 4_102_444_800,
    role: "authenticated",
  })).toString("base64url");
  await page.addInitScript(({ token }) => {
    localStorage.setItem("sb-127-auth-token", JSON.stringify({
      access_token: token,
      refresh_token: "e2e-refresh-token",
      token_type: "bearer",
      expires_in: 2_147_483_647,
      expires_at: 4_102_444_800,
      user: {
        id: "user-1",
        aud: "authenticated",
        role: "authenticated",
        email: "learner@example.com",
        app_metadata: {},
        user_metadata: {},
        identities: [],
        created_at: "2026-01-01T00:00:00.000Z",
      },
    }));
  }, { token: `e2e.${payload}.signature` });

  await page.route("http://127.0.0.1:54321/rest/v1/drill_attempts**", async (route) => {
    const diagnostic = {
      code: "missing_major_branch",
      source: "system",
      severity: "blocking",
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([1, 2].map((day) => ({
        id: `signed-structure-${day}`,
        user_id: "user-1",
        skill_id: "structure",
        score: 0,
        feedback_codes: [],
        completed_at: `2026-09-0${day}T00:00:00.000Z`,
        scoring_version: "v2",
        content_version: 2,
        event_schema_version: 2,
        scaffolding_level: "beginner",
        diagnostics: [diagnostic],
        learning_evidence: {
          interactionId: `signed-structure-${day}`,
          skillId: "structure",
          scoringVersion: "v2",
          contentVersion: 2,
          eventSchemaVersion: 2,
          scaffoldingLevel: "beginner",
          responses: [{
            responseId: `signed-structure-${day}-r1`,
            interactionId: `signed-structure-${day}`,
            revision: 1,
            revisionOf: null,
            responseKind: "structure",
            text: "Committed structure",
            committedAtMs: day,
          }],
          rubricOutcomes: [{ criterionId: "branches", met: false }],
          diagnostics: [diagnostic],
        },
      }))),
    });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/case_attempts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Recommended next: Missing major branch" }))
    .toBeVisible();
  const exactRep = page.getByRole("link", { name: /quickcart structure transfer · v2/i });
  await expect(exactRep).toHaveAttribute(
      "href",
      "/drills/structure?rep=quickcart-structure-v2&version=2",
    );
  await exactRep.click();
  await expect(
    page.getByRole("heading", { name: "Structure a delivery-reliability problem" }),
  ).toBeVisible();
});

test("signed-in case history stops safely when its exact version is unavailable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const payload = Buffer.from(JSON.stringify({
    sub: "user-1",
    exp: 4_102_444_800,
    role: "authenticated",
  })).toString("base64url");
  await page.addInitScript(({ token }) => {
    localStorage.setItem("sb-127-auth-token", JSON.stringify({
      access_token: token,
      refresh_token: "e2e-refresh-token",
      token_type: "bearer",
      expires_in: 2_147_483_647,
      expires_at: 4_102_444_800,
      user: {
        id: "user-1",
        aud: "authenticated",
        role: "authenticated",
        email: "learner@example.com",
        app_metadata: {},
        user_metadata: {},
        identities: [],
        created_at: "2026-01-01T00:00:00.000Z",
      },
    }));
  }, { token: `e2e.${payload}.signature` });

  await page.route("http://127.0.0.1:54321/rest/v1/drill_attempts**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("http://127.0.0.1:54321/rest/v1/case_attempts**", async (route) => {
    const attempt = {
      id: "00000000-0000-4000-8000-000000000099",
      user_id: "user-1",
      case_id: "alpinefit-profitability",
      skill_scores: { structure: 90 },
      feedback_codes: ["missing_major_branch"],
      completed_at: "2026-09-17T12:00:00.000Z",
      scoring_version: "v2",
      content_version: 99,
      event_schema_version: 2,
      scaffolding_level: "beginner",
      learning_evidence: null,
      diagnostics: [],
    };
    const isSingle = new URL(route.request().url()).searchParams.has("id");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(isSingle ? attempt : [attempt]),
    });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/case_events**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );

  await page.goto("/progress");
  await page.getByRole("link", { name: "Review AlpineFit profitability · V99" }).click();
  await expect(
    page.getByRole("heading", { name: "Historical replay unavailable" }),
  ).toBeVisible();
  await expect(page.getByText("Content version 99")).toBeVisible();
  await expect(page.getByText("Casework did not substitute current content.", { exact: false }))
    .toBeVisible();
  await expect(page.getByText("AlpineFit's shrinking margin")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});

test("mixed history keeps V2 evidence separate and reflows at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await page.evaluate(() => {
    sessionStorage.setItem("casework:practice-history", JSON.stringify({
      drillAttempts: [
        {
          attemptId: "legacy-extreme",
          userId: "guest",
          drillId: "legacy-structure",
          skillId: "structure",
          score: 100,
          feedbackCodes: ["legacy-perfect"],
          conceptIdsPracticed: ["revenue"],
          completedAt: "2026-09-16T00:00:00.000Z",
          scoringVersion: "v1",
          contentVersion: null,
          eventSchemaVersion: null,
          scaffoldingLevel: null,
          learningEvidence: null,
          diagnostics: [],
        },
        {
          attemptId: "v2-opening",
          userId: "guest",
          drillId: "clarification-v2-1",
          skillId: "clarification",
          score: 0,
          feedbackCodes: [],
          conceptIdsPracticed: ["objective"],
          completedAt: "2026-09-17T00:00:00.000Z",
          scoringVersion: "v2",
          contentVersion: 2,
          eventSchemaVersion: 2,
          scaffoldingLevel: "beginner",
          learningEvidence: {
            interactionId: "v2-opening",
            skillId: "clarification",
            scoringVersion: "v2",
            contentVersion: 2,
            eventSchemaVersion: 2,
            scaffoldingLevel: "beginner",
            responses: [{
              responseId: "v2-opening-r1",
              interactionId: "v2-opening",
              revision: 1,
              revisionOf: null,
              responseKind: "clarification",
              text: "Clarify the target metric.",
              committedAtMs: 1,
            }],
            rubricOutcomes: [{ criterionId: "objective", met: false }],
            diagnostics: [{
              code: "objective_not_reframed",
              source: "self_assessment",
              severity: "coaching",
              responseId: "v2-opening-r1",
            }],
          },
          diagnostics: [{
            code: "objective_not_reframed",
            source: "self_assessment",
            severity: "coaching",
            responseId: "v2-opening-r1",
          }],
        },
      ],
      caseAttempts: [],
    }));
  });

  await page.goto("/progress");
  const openingCard = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Case opening & clarification" }) });
  await expect(openingCard.getByText("Building", { exact: true })).toBeVisible();
  await expect(openingCard.getByText(/Self-assessed/)).toBeVisible();
  await expect(page.getByText("Legacy score 100")).toBeVisible();
  await expect(page.getByText(/Interview ready/i)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
