const identityKey = "casework:learner-identity";
let generation = 0;

export function learnerIdentity() {
  return typeof window === "undefined" ? "guest" : window.sessionStorage.getItem(identityKey) ?? "guest";
}

export function changeLearnerIdentity(userId: string) {
  const storage = window.sessionStorage;
  if (learnerIdentity() !== userId) {
    generation++;
    for (const key of Object.keys(storage)) {
      if (key.startsWith("casework:") && !key.startsWith("casework:pending:") && key !== "casework:practice-history") {
        storage.removeItem(key);
      }
    }
  }
  storage.setItem(identityKey, userId);
}

// A component retains this lease across awaits. Old callbacks cannot recreate
// discarded drafts, clear the next user's work, or act after A -> B -> A.
export function bindLearnerStorage() {
  const userId = learnerIdentity();
  const epoch = generation;
  const isCurrent = () => epoch === generation && userId === learnerIdentity();
  return {
    userId,
    isCurrent,
    get length() { return isCurrent() ? window.sessionStorage.length : 0; },
    key: (index: number) => isCurrent() ? window.sessionStorage.key(index) : null,
    getItem: (key: string) => isCurrent() && typeof window !== "undefined" ? window.sessionStorage.getItem(key) : null,
    setItem: (key: string, value: string) => { if (isCurrent()) window.sessionStorage.setItem(key, value); },
    removeItem: (key: string) => { if (isCurrent()) window.sessionStorage.removeItem(key); },
  };
}
