type PendingStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function pendingKey(key: string) {
  return `casework:pending:${key}`;
}

export function savePendingAttempt<T extends { attemptId: string }>(
  storage: PendingStorage,
  key: string,
  attempt: T,
) {
  storage.setItem(pendingKey(key), JSON.stringify(attempt));
}

export function loadPendingAttempt<T extends { attemptId: string }>(
  storage: PendingStorage,
  key: string,
): T | null {
  const serialized = storage.getItem(pendingKey(key));
  if (!serialized) return null;

  try {
    const parsed = JSON.parse(serialized) as unknown;
    return parsed &&
      typeof parsed === "object" &&
      "attemptId" in parsed &&
      typeof parsed.attemptId === "string" &&
      parsed.attemptId.length > 0
      ? (parsed as T)
      : null;
  } catch {
    return null;
  }
}

export function getOrCreatePendingAttempt<T extends { attemptId: string }>(
  storage: PendingStorage,
  key: string,
  create: () => T,
) {
  const pending = loadPendingAttempt<T>(storage, key);
  if (pending) return pending;
  const attempt = create();
  savePendingAttempt(storage, key, attempt);
  return attempt;
}

export function clearPendingAttempt(storage: PendingStorage, key: string) {
  storage.removeItem(pendingKey(key));
}
