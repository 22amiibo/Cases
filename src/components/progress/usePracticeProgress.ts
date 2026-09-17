"use client";

import { useEffect, useState } from "react";
import type { SkillAttempt } from "@/data/repository";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import { createBrowserSupabaseClient } from "@/data/supabase-repository";

type PracticeProgressState =
  | { status: "loading"; history: SkillAttempt[] }
  | { status: "ready"; history: SkillAttempt[] }
  | { status: "error"; history: SkillAttempt[] };

export function usePracticeProgress() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<PracticeProgressState>({
    status: "loading",
    history: [],
  });

  useEffect(() => {
    let active = true;

    void getBrowserPracticeSession()
      .then(async ({ repository, userId }) => repository.getSkillHistory(userId))
      .then((history) => {
        if (active) setState({ status: "ready", history });
      })
      .catch(() => {
        if (active) setState({ status: "error", history: [] });
      });

    return () => {
      active = false;
    };
  }, [revision]);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    if (!client) return;

    const { data } = client.auth.onAuthStateChange((event) => {
      if (event !== "INITIAL_SESSION") {
        setState({ status: "loading", history: [] });
        setRevision((current) => current + 1);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return {
    ...state,
    retry() {
      setState({ status: "loading", history: [] });
      setRevision((current) => current + 1);
    },
  };
}
