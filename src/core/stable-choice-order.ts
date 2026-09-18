export type ChoiceWithId = { id: string };

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandom(state: number) {
  let value = (state + 0x6d2b79f5) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return { state: value, value: ((value ^ (value >>> 14)) >>> 0) / 4294967296 };
}

export function stableChoiceOrder<T extends ChoiceWithId>(
  choices: readonly T[],
  sessionSeed: string,
  scope: string,
): T[] {
  const ordered = [...choices];
  let state = hashSeed(`${sessionSeed}:${scope}`);
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    const random = nextRandom(state);
    state = random.state;
    const target = Math.floor(random.value * (index + 1));
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  }
  return ordered;
}
