"use client";

import { useEffect, useState } from "react";
import type { SkillAttempt } from "@/data/repository";
import type { ActivityAttempt } from "@/core/activity";
import type { V3CaseAttempt, V3Repository } from "@/data/v3-repository";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import { createBrowserSupabaseClient } from "@/data/supabase-repository";

const emptyV3Evidence = {
  enrollments: [],
  lessonEvents: [],
  activityAttempts: [],
  caseAttempts: [],
};

type PracticeProgressState =
  | { status: "loading"; history: SkillAttempt[]; activityAttempts: ActivityAttempt[]; v3CaseAttempts: V3CaseAttempt[] }
  | { status: "ready"; history: SkillAttempt[]; activityAttempts: ActivityAttempt[]; v3CaseAttempts: V3CaseAttempt[] }
  | { status: "error"; history: SkillAttempt[]; activityAttempts: ActivityAttempt[]; v3CaseAttempts: V3CaseAttempt[] };

export function usePracticeProgress() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<PracticeProgressState>({
    status: "loading",
    history: [],
    activityAttempts: [],
    v3CaseAttempts: [],
  });

  useEffect(() => {
    let active = true;

    void getBrowserPracticeSession()
      .then(async ({ repository, userId }) => {
        const history = await repository.getSkillHistory(userId);
        if (active) setState({ status: "ready", history, activityAttempts: [], v3CaseAttempts: [] });
        const v3Repository = repository as Partial<V3Repository>;
        const evidence = await (v3Repository.listCourseEvidence?.(userId) ?? Promise.resolve(emptyV3Evidence))
          .catch(() => emptyV3Evidence);
        return { history, activityAttempts: evidence.activityAttempts, v3CaseAttempts: evidence.caseAttempts };
      })
      .then((loaded) => {
        if (active) setState({ status: "ready", ...loaded });
      })
      .catch(() => {
        if (active) setState({ status: "error", history: [], activityAttempts: [], v3CaseAttempts: [] });
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
        setState({ status: "loading", history: [], activityAttempts: [], v3CaseAttempts: [] });
        setRevision((current) => current + 1);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return {
    ...state,
    retry() {
      setState({ status: "loading", history: [], activityAttempts: [], v3CaseAttempts: [] });
      setRevision((current) => current + 1);
    },
  };
}
