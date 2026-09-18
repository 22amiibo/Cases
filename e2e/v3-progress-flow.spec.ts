import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("guest resumes, completes, gets transfer coaching, and reviews unified history on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/practice/activities/alpinefit-clarifying-v3?version=1");
  await page.getByRole("button", { name: "Start activity" }).click();
  await expect(page.getByRole("radio", { name: /How is operating margin defined/ })).toBeVisible();
  await page.goto("/progress");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Continue", "Recommended next", "Quick practice", "Skills snapshot", "Recent activity", "Case history", "Achievements"]);
  await page.getByRole("region", { name: "Continue", exact: true }).getByRole("link", { name: "Resume practice" }).click();
  await page.getByRole("radio", { name: /How is operating margin defined/ }).check();
  await page.getByRole("button", { name: "Commit answer" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Finish activity" }).click();
  await expect(page.getByRole("heading", { name: "Your result" })).toBeVisible();
  await page.goto("/progress");
  const next = page.getByRole("region", { name: "Recommended next", exact: true });
  await expect(next).toContainText("no retry or case application yet");
  await expect(next.getByRole("link")).not.toHaveAttribute("href", /alpinefit-clarifying/);
  await expect(page.getByRole("region", { name: "Skills snapshot" }).getByRole("article").filter({ has: page.getByRole("heading", { name: "Clarifying", exact: true }) })).toContainText("Developing");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "View all activity" }).click();
  await page.getByRole("link", { name: "Review Choose the first AlpineFit question" }).click();
  await expect(page.getByText("1 of 1 check")).toBeVisible();
});

test("signed-in recommendations use owned evidence and clear after identity changes", async ({ page }) => {
  await page.addInitScript(() => {
    const session = { access_token: `e2e.${btoa(JSON.stringify({ sub: "user-1", exp: 4102444800, role: "authenticated" }))}.signature`, refresh_token: "refresh", token_type: "bearer", expires_in: 2147483647, expires_at: 4102444800, user: { id: "user-1", aud: "authenticated", role: "authenticated", email: "learner@example.com", app_metadata: {}, user_metadata: {}, identities: [], created_at: "2026-01-01T00:00:00.000Z" } };
    localStorage.setItem("sb-127-auth-token", JSON.stringify(session));
  });
  await page.route("http://127.0.0.1:54321/rest/v1/**", route => route.fulfill({ contentType: "application/json", body: "[]" }));
  const reads: string[] = [];
  await page.route("http://127.0.0.1:54321/rest/v1/activity_attempts**", route => {
    const params = new URL(route.request().url()).searchParams;
    reads.push(params.get("user_id") ?? "");
    const rows = [1, 2].map(day => ({ id: `saved-${day}`, user_id: "user-1", activity_id: "alpinefit-clarifying-v3", content_version: 1, scoring_version: "v3", event_schema_version: 3, primary_skill_id: "clarification", started_at: `2026-09-0${day}T00:00:00.000Z`, completed_at: `2026-09-0${day}T00:01:00.000Z`, skill_evidence: [{ skillId: "clarification", source: "activity", contextId: "fitness", difficulty: "beginner", reviewed: true, retryOrTransfer: false, objectiveChecks: [], diagnosticCodes: ["low_value_question"] }], diagnostics: [{ code: "low_value_question", skillId: "clarification", source: "system", severity: "blocking" }], course_id: null, course_version: null, course_step_id: null }));
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(params.get("user_id") === "eq.user-1" ? (params.has("id") ? rows[1] : rows) : []) });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/activity_events**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify([
    { type: "activity_started", eventId: "start", atMs: 0 },
    { type: "selection_committed", eventId: "select", atMs: 1, interactionId: "alpinefit-clarifying", selectedIds: ["logo-color"] },
    { type: "retry_decided", eventId: "decision", atMs: 2, interactionId: "alpinefit-clarifying", decision: "continue" },
    { type: "takeaway_viewed", eventId: "takeaway", atMs: 3 },
    { type: "activity_completed", eventId: "complete", atMs: 4 },
  ].map((event, sequence) => ({ event, sequence }))) }));
  await page.goto("/progress");
  await expect(page.getByRole("region", { name: "Recommended next", exact: true })).toContainText("2 of your last 3");
  await expect(page.getByRole("region", { name: "Skills snapshot" }).getByRole("article").filter({ has: page.getByRole("heading", { name: "Clarifying", exact: true }) })).toContainText("Needs practice");
  await page.getByRole("link", { name: "View all activity" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.getByRole("link", { name: "Review Choose the first AlpineFit question" }).first().click();
  await expect(page.getByText("0 of 1 check")).toBeVisible();
  await page.goto("/progress");
  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("sb-127-auth-token")!);
    session.user.id = "user-2";
    session.access_token = `e2e.${btoa(JSON.stringify({ sub: "user-2", exp: 4102444800, role: "authenticated" }))}.signature`;
    localStorage.setItem("sb-127-auth-token", JSON.stringify(session));
    const channel = new BroadcastChannel("sb-127-auth-token");
    channel.postMessage({ event: "SIGNED_IN", session });
    channel.close();
  });
  await expect(page.getByRole("region", { name: "Recommended next", exact: true })).toContainText("You have not tried this activity yet");
  await expect(page.getByText("Needs practice", { exact: true })).toHaveCount(0);
  expect(reads).toContain("eq.user-1");
  expect(reads).toContain("eq.user-2");
  await page.getByRole("link", { name: "View all activity" }).click();
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("completed full-case diagnostics contribute reviewed current skill evidence", async ({ page }) => {
  test.setTimeout(90_000);
  const { completeAlpineFitV2 } = await import("./alpinefit-v2-helpers");
  await completeAlpineFitV2(page);
  await page.goto("/progress");
  const opening = page.getByRole("region", { name: "Skills snapshot" }).getByRole("article").filter({ has: page.getByRole("heading", { name: "Clarifying", exact: true }) });
  await expect(opening).toContainText("1 reviewed");
  await expect(opening).toContainText("Developing");
  await expect(page.getByRole("region", { name: "Recommended next", exact: true })).toContainText(/Coach feedback|Your reflection/);
  await page.getByRole("link", { name: "View all activity" }).click();
  await expect(page.getByRole("link", { name: "Review AlpineFit profitability" })).toBeVisible();
});

test("damaged local histories and unsupported case modes cannot become the primary recommendation", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("casework:v3-activity:alpinefit-clarifying-v3:1", JSON.stringify({ attemptId: "bad", startedAt: "2026-09-01T00:00:00.000Z", events: [{ type: "activity_started", eventId: "start", atMs: 0 }, { type: "selection_committed", eventId: "wrong", atMs: 1, interactionId: "nonexistent", selectedIds: ["nonexistent"] }] }));
    sessionStorage.setItem("casework:guest-session:paypilot-growth:interview", JSON.stringify({ contentVersion: 2, runStartedAtMs: 1, events: [], clarificationDraftIds: ["objective"] }));
    sessionStorage.setItem("casework:guest-session:alpinefit-profitability", JSON.stringify({ contentVersion: 2, runStartedAtMs: 1, events: [{ type: "node_investigated", atMs: 1, nodeId: "nonexistent" }] }));
  });
  const rejected = page.waitForResponse(response => response.url().includes("/api/activities/alpinefit-clarifying-v3/session") && response.status() === 400);
  await page.goto("/progress");
  await rejected;
  await expect(page.getByRole("region", { name: "Continue", exact: true })).toContainText("No unfinished practice saved");
  await expect(page.getByRole("region", { name: "Recommended next", exact: true })).toContainText("You have not tried this activity yet");
  await expect(page.getByRole("link", { name: "Resume practice" })).toHaveCount(0);
});
