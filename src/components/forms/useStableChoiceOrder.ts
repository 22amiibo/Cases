"use client";

import { useMemo } from "react";
import { stableChoiceOrder, type ChoiceWithId } from "@/core/stable-choice-order";

function sessionSeed(storageKey: string) {
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

export function useStableChoiceOrder<T extends ChoiceWithId>(
  choices: readonly T[],
  seedKey: string,
  scope: string,
) {
  const seed = useMemo(() => sessionSeed(seedKey), [seedKey]);
  return useMemo(
    () => stableChoiceOrder(choices, seed, scope),
    [choices, scope, seed],
  );
}
