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

async function installSignedInSession(page: Page) {
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

  await expect(page.getByRole("heading", { name: "Progress you can act on" })).toBeVisible();
  await expect(page.getByText("1 focused practice · 1 completed case")).toBeVisible();
  await expect(
    page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Earlier practice" }) })
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: "Quantitative reasoning" }) })
      .getByText("Strong", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Use the comparison that best distinguishes the result." }),
  ).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Recommended next: Use the comparison that best distinguishes the result." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /practice beacon exhibit transfer/i }),
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
  await expect(page.getByRole("heading", { name: "Rebuild the equation from the business relationships." }))
    .toBeVisible();
  await expect(page.getByText("Coach feedback").last()).toBeVisible();
  await expect(page.getByRole("link", { name: /harborcart quantitative transfer/i }))
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
  await installSignedInSession(page);

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
  await expect(page.getByRole("heading", { name: "Add the major branch missing from the structure." }))
    .toBeVisible();
  const exactRep = page.getByRole("link", { name: /quickcart structure transfer/i });
  await expect(exactRep).toHaveAttribute(
      "href",
      "/drills/structure?rep=quickcart-structure-v2&version=2",
    );
  await exactRep.click();
  await expect(
    page.getByRole("heading", { name: "Structure a delivery-reliability problem" }),
  ).toBeVisible();
});

test("signed-in case history replays its ordered exact V2 attempt from Progress", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await completeAlpineFitV2(page);
  const savedAttempt = await page.evaluate(() => {
    const history = JSON.parse(
      sessionStorage.getItem("casework:practice-history") ?? "{}",
    ) as {
      v3CaseAttempts?: Array<{
        attemptId: string;
        caseId: string;
        skillScores: Record<string, number>;
        feedbackCodes: string[];
        events: unknown[];
        completedAt: string;
        scoringVersion: string;
        contentVersion: number;
        eventSchemaVersion: number;
        scaffoldingLevel: string;
        learningEvidence: unknown;
        diagnostics: unknown[];
      }>;
    };
    if (!history.v3CaseAttempts?.[0]) throw new Error("Completed case was not saved");
    return history.v3CaseAttempts[0];
  });
  await installSignedInSession(page);

  await page.route("http://127.0.0.1:54321/rest/v1/drill_attempts**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  const attemptRow = {
    id: savedAttempt.attemptId,
    user_id: "user-1",
    case_id: savedAttempt.caseId,
    skill_scores: savedAttempt.skillScores,
    feedback_codes: savedAttempt.feedbackCodes,
    completed_at: savedAttempt.completedAt,
    scoring_version: "v2",
    content_version: savedAttempt.contentVersion,
    event_schema_version: savedAttempt.eventSchemaVersion,
    scaffolding_level: savedAttempt.scaffoldingLevel,
    learning_evidence: null,
    diagnostics: [],
  };
  let ownedAttemptRequestUrl = "";
  await page.route("http://127.0.0.1:54321/rest/v1/case_attempts**", async (route) => {
    const isSingle = new URL(route.request().url()).searchParams.has("id");
    if (isSingle) ownedAttemptRequestUrl = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(isSingle ? attemptRow : [attemptRow]),
    });
  });
  let ownedEventsRequestUrl = "";
  await page.route("http://127.0.0.1:54321/rest/v1/case_events**", async (route) => {
    ownedEventsRequestUrl = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(savedAttempt.events
        .map((event, sequence) => ({ sequence, event }))
        .reverse()),
    });
  });

  await page.goto("/progress");
  const replayRequest = page.waitForRequest((request) =>
    request.method() === "POST" &&
    request.url().includes("/api/cases/alpinefit-profitability/session"),
  );
  await page.getByRole("link", { name: "Review AlpineFit profitability" }).click();
  const replayPayload = await (await replayRequest).postDataJSON() as {
    contentVersion: number;
    events: unknown[];
  };

  await expect(page).toHaveURL(new RegExp(`/cases/alpinefit-profitability/attempts/${savedAttempt.attemptId}$`));
  await expect(page.getByRole("heading", { name: "Chronological replay" })).toBeVisible();
  expect(replayPayload.contentVersion).toBe(2);
  expect(replayPayload.events).toEqual(savedAttempt.events);
  expect(new URL(ownedAttemptRequestUrl).searchParams.get("user_id"))
    .toBe("eq.user-1");
  expect(new URL(ownedAttemptRequestUrl).searchParams.get("id"))
    .toBe(`eq.${savedAttempt.attemptId}`);
  expect(new URL(ownedEventsRequestUrl).searchParams.get("user_id"))
    .toBe("eq.user-1");
  expect(new URL(ownedEventsRequestUrl).searchParams.get("case_attempt_id"))
    .toBe(`eq.${savedAttempt.attemptId}`);
  await expect(page.getByRole("heading", { name: "Preserved issue tree" }))
    .toBeVisible();
  await expect(page.getByText("Revision 1").first()).toBeVisible();
});

test("signed-in case history stops safely when its exact version is unavailable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await installSignedInSession(page);

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
  await page.getByRole("link", { name: "Review AlpineFit profitability" }).click();
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
  await expect(openingCard.getByText(/Your reflection/)).toBeVisible();
  await expect(page.getByText("Score 100")).toBeVisible();
  await expect(page.getByText(/Interview ready/i)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});

test("signed-in V3 Interview replay preserves mode, evidence timing, and accessible event navigation", async ({ page }) => {
  test.setTimeout(90_000);
  await completeAlpineFitV2(page, { interview: true });
  const saved = await page.evaluate(() => {
    const history = JSON.parse(sessionStorage.getItem("casework:practice-history") ?? "{}");
    return history.v3CaseAttempts[0];
  });
  await installSignedInSession(page);
  await page.route("http://127.0.0.1:54321/rest/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  const row = {
    id: saved.attemptId, user_id: "user-1", case_id: saved.caseId,
    completed_at: saved.completedAt, skill_scores: saved.skillScores, feedback_codes: saved.feedbackCodes,
    scoring_version: "v3", content_version: 2, event_schema_version: 2,
    scaffolding_level: saved.scaffoldingLevel, case_mode: "interview",
    skill_evidence: saved.skillEvidence, diagnostics: saved.diagnostics,
    course_id: null, course_version: null, course_step_id: null,
  };
  const ownedReads: string[] = [];
  await page.route("http://127.0.0.1:54321/rest/v1/case_attempts**", (route) => {
    const url = new URL(route.request().url());
    ownedReads.push(url.searchParams.get("user_id") ?? "");
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.searchParams.has("id") ? row : [row]) });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/case_events**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(saved.events.map((event: unknown, sequence: number) => ({ event, sequence })).reverse()) }),
  );
  await page.setViewportSize({ width: 320, height: 900 });
  const request = page.waitForRequest((candidate) => candidate.method() === "POST" && candidate.url().includes("/api/cases/alpinefit-profitability/session"));
  await page.goto(`/cases/${saved.caseId}/attempts/${saved.attemptId}`);
  expect((await request).postDataJSON()).toEqual({ events: saved.events, contentVersion: 2, mode: "interview" });
  expect(ownedReads.length).toBeGreaterThan(0);
  expect(ownedReads.every((value) => value === "eq.user-1")).toBe(true);
  await expect(page.getByRole("heading", { name: "Chronological replay" })).toBeVisible();
  await expect(page.getByRole("region", { name: "What went well" })).toBeVisible();
  const costExhibit = page.getByRole("table", { name: "Operating cost by category data ($m)" });
  await expect(costExhibit.getByRole("row", { name: "Club labor 18.1 24.3" })).toBeVisible();
  await expect(costExhibit).toHaveCount(1);
  const improve = page.getByRole("region", { name: "What to improve" });
  await expect(improve).toBeVisible();
  const citation = page.getByRole("region", { name: "What went well" }).getByRole("link", { name: /^Event / }).first();
  await citation.focus();
  const target = await citation.getAttribute("href");
  await page.keyboard.press("Enter");
  await expect(page.locator(target!)).toBeFocused();
  const firstEvidence = page.locator("#case-event-1 details");
  await firstEvidence.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(firstEvidence).toHaveAttribute("open", "");
  await expect(firstEvidence).toContainText("No investigation evidence had been revealed yet.");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const nextPractice = page.getByRole("region", { name: "Practice next" }).getByRole("link", { name: /^Practice / }).first();
  await nextPractice.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/practice\/|\/drills\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  row.content_version = 99;
  await page.goto(`/cases/${saved.caseId}/attempts/${saved.attemptId}`);
  await expect(page.getByRole("heading", { name: "Historical replay unavailable" })).toBeVisible();
  await expect(page.getByText("Content version 99")).toBeVisible();
  await expect(page.getByText("Original learner submissions")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  row.user_id = "other-user";
  await page.reload();
  await expect(page.getByRole("heading", { name: "No completed case to review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chronological replay" })).toHaveCount(0);
});
