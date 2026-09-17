export type VersionedRegistry<T extends { id: string }> = {
  get(id: string, contentVersion: number): T | undefined;
  getActive(id: string): T | undefined;
  getVersions(id: string): readonly number[];
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export function createVersionedRegistry<T extends { id: string }>(
  items: readonly T[],
  activeVersions: Readonly<Record<string, number>>,
  getContentVersion: (item: T) => number = (item) =>
    (item as T & { contentVersion: number }).contentVersion,
): VersionedRegistry<T> {
  const byKey = new Map<string, T>();
  const versionsById = new Map<string, number[]>();

  for (const item of items) {
    const contentVersion = getContentVersion(item);
    if (!Number.isInteger(contentVersion) || contentVersion < 1) {
      throw new Error(`Invalid content version for ${item.id}`);
    }
    const key = `${item.id}:${contentVersion}`;
    if (byKey.has(key)) throw new Error(`Duplicate content version ${key}`);
    byKey.set(key, deepFreeze(item));
    versionsById.set(item.id, [
      ...(versionsById.get(item.id) ?? []),
      contentVersion,
    ]);
  }

  for (const [id, contentVersion] of Object.entries(activeVersions)) {
    if (!byKey.has(`${id}:${contentVersion}`)) {
      throw new Error(`Active content version does not exist: ${id}:${contentVersion}`);
    }
  }

  return Object.freeze({
    get(id: string, contentVersion: number) {
      return byKey.get(`${id}:${contentVersion}`);
    },
    getActive(id: string) {
      const contentVersion = activeVersions[id];
      return contentVersion === undefined
        ? undefined
        : byKey.get(`${id}:${contentVersion}`);
    },
    getVersions(id: string) {
      return Object.freeze([...(versionsById.get(id) ?? [])].sort((a, b) => a - b));
    },
  });
}
