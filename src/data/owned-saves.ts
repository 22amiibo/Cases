import { getBrowserPracticeSession } from "./browser-practice";
import type { DrillAttempt } from "./repository";
import type { ActivityAttempt } from "@/core/activity";
import type { V3CaseAttempt } from "./v3-repository";
import type { CaseAttempt, PracticeRepository } from "./repository";
import type { V3Repository } from "./v3-repository";

type Save = { method: "saveDrillAttempt"; attempt: DrillAttempt }
  | { method: "saveCaseAttempt"; attempt: CaseAttempt }
  | { method: "saveV3CaseAttempt"; attempt: V3CaseAttempt }
  | { method: "saveActivityAttempt"; attempt: ActivityAttempt };
type Destination = Partial<PracticeRepository & V3Repository>;

export async function saveOwnedAttempt(save: Save, destination?: Destination) {
  const key = `casework:pending:save:${save.attempt.userId}:${save.attempt.attemptId}`;
  // Journal before resolving the current Auth session; ownership never follows it.
  window.sessionStorage.setItem(key, JSON.stringify(save));
  const repository = destination ?? (await getBrowserPracticeSession(save.attempt.userId)).repository as Destination;
  switch (save.method) {
    case "saveDrillAttempt": await repository.saveDrillAttempt!(save.attempt); break;
    case "saveCaseAttempt": await repository.saveCaseAttempt!(save.attempt); break;
    case "saveV3CaseAttempt": await repository.saveV3CaseAttempt!(save.attempt); break;
    case "saveActivityAttempt": await repository.saveActivityAttempt!(save.attempt); break;
  }
  window.sessionStorage.removeItem(key);
}

export async function retryOwnedSaves(userId: string) {
  for (const key of Object.keys(window.sessionStorage)) {
    if (!key.startsWith(`casework:pending:save:${userId}:`)) continue;
    try {
      const save = JSON.parse(window.sessionStorage.getItem(key)!) as Save;
      if (save.attempt.userId !== userId || !["saveDrillAttempt", "saveCaseAttempt", "saveV3CaseAttempt", "saveActivityAttempt"].includes(save.method)) continue;
      await saveOwnedAttempt(save);
    } catch { /* Retain original payload on auth, network or validation failure. */ }
  }
}
