import { expect, it, vi } from "vitest";
import { POST as activitySession } from "@/app/api/activities/[activityId]/session/route";
import { POST as caseSession } from "@/app/api/cases/[caseId]/session/route";
import { progressCatalog } from "@/components/progress/catalog";
import { findRecoverableRuns } from "./v3-recommendations";

const resources = progressCatalog().resources;
const key = "casework:v3-activity:alpinefit-clarifying-v3:1";
const stored = { attemptId: "run", startedAt: "2026-09-01T00:00:00.000Z", events: [{ type: "activity_started", eventId: "start", atMs: 0 }] };
const validate = async ({ endpoint, body }: { endpoint: string; body: unknown }) => {
  const request = new Request(`http://localhost${endpoint}`, { method: "POST", body: JSON.stringify(body) });
  const id = endpoint.split("/")[3];
  return (await (endpoint.includes("/activities/") ? activitySession(request, { params: Promise.resolve({ activityId: id }) }) : caseSession(request, { params: Promise.resolve({ caseId: id }) }))).ok;
};
const recover = (entries: [string, string][]) => findRecoverableRuns(entries, resources, validate);

it("replays a valid unfinished activity through the existing session endpoint", async () => {
  expect((await recover([[key, JSON.stringify(stored)]]))[0]?.href).toBe("/practice/activities/alpinefit-clarifying-v3?version=1");
});
it.each([
  { type: "selection_committed", eventId: "wrong", atMs: 1, interactionId: "nonexistent", selectedIds: ["nonexistent"] },
  { type: "takeaway_viewed", eventId: "early", atMs: 1 },
])("rejects schema-valid but unreplayable activity events: $type", async (event) => {
  expect(await recover([[key, JSON.stringify({ ...stored, events: [...stored.events, event] })]])).toEqual([]);
});
it("checks case mode capabilities before replay and keeps supported modes exact", async () => {
  const run = JSON.stringify({ contentVersion: 2, runStartedAtMs: 1, events: [], clarificationDraftIds: ["objective"] });
  const probe = vi.fn(validate);
  expect(await findRecoverableRuns([["casework:guest-session:paypilot-growth:interview", run]], resources, probe)).toEqual([]);
  expect(probe).not.toHaveBeenCalled();
  expect((await recover([["casework:guest-session:alpinefit-profitability:interview", run]]))[0]?.href).toBe("/cases/alpinefit-profitability?version=2&mode=interview");
});
it("rejects a case history that the existing engine cannot replay", async () => {
  expect(await recover([["casework:guest-session:alpinefit-profitability", JSON.stringify({ contentVersion: 2, runStartedAtMs: 1, events: [{ type: "node_investigated", nodeId: "nonexistent", atMs: 1 }] })]])).toEqual([]);
});
it("ignores completed, corrupted, unavailable, and nested storage entries", async () => {
  for (const entries of [
    [[key, JSON.stringify({ ...stored, completedAt: "2026-09-02T00:00:00.000Z" })]],
    [[key, "invalid"], [key + "99", JSON.stringify(stored)]],
    [[key, JSON.stringify({ ...stored, events: [{ type: "unknown" }] })]],
    [["casework:guest-session:alpinefit-profitability:cycle:opening", "{}"]],
  ] as [string, string][][]) expect(await recover(entries)).toEqual([]);
});
