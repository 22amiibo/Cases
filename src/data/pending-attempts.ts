import { learnerIdentity } from "./learner-identity";
type PendingStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function pendingKey(key: string, userId: string) {
  return `casework:pending:${userId}:${key}`;
}

export function savePendingAttempt<T extends { attemptId: string; userId?: string }>(
  storage: PendingStorage,
  key: string,
  attempt: T,
) {
  const userId = attempt.userId ?? learnerIdentity();
  storage.setItem(pendingKey(key, userId), JSON.stringify({ ...attempt, userId }));
}

export function loadPendingAttempt<T extends { attemptId: string }>(
  storage: PendingStorage,
  key: string,
  userId = learnerIdentity(),
): T | null {
  const serialized = storage.getItem(pendingKey(key, userId)) ?? storage.getItem(`casework:pending:${key}`);
  if (!serialized) return null;

  try {
    const parsed = JSON.parse(serialized) as unknown;
    return parsed &&
      typeof parsed === "object" &&
      "userId" in parsed && parsed.userId === userId &&
      "attemptId" in parsed &&
      typeof parsed.attemptId === "string" &&
      parsed.attemptId.length > 0
      ? (parsed as T)
      : null;
  } catch {
    return null;
  }
}

export function getOrCreatePendingAttempt<T extends { attemptId: string; userId?: string }>(
  storage: PendingStorage,
  key: string,
  create: () => T,
) {
  const attempt = create();
  const pending = loadPendingAttempt<T>(storage, key, attempt.userId ?? learnerIdentity());
  if (pending) return pending;
  savePendingAttempt(storage, key, attempt);
  return attempt;
}

export function clearPendingAttempt(storage: PendingStorage, key: string, userId = learnerIdentity()) {
  storage.removeItem(pendingKey(key, userId));
  const legacy = storage.getItem(`casework:pending:${key}`);
  try { if (legacy && JSON.parse(legacy).userId === userId) storage.removeItem(`casework:pending:${key}`); } catch { /* Keep unattributed legacy data quarantined. */ }
}
