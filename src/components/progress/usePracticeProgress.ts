"use client";

import { useEffect, useState } from "react";
import type { SkillAttempt } from "@/data/repository";
import type { ActivityAttempt } from "@/core/activity";
import type { CourseEvidence, V3CaseAttempt, V3Repository } from "@/data/v3-repository";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import { createBrowserSupabaseClient } from "@/data/supabase-repository";

const emptyV3Evidence = {
  enrollments: [],
  lessonEvents: [],
  activityAttempts: [],
  caseAttempts: [],
};

type PracticeProgressState = {
  status: "loading" | "ready" | "error";
  userId: string | null;
  history: SkillAttempt[];
  activityAttempts: ActivityAttempt[];
  v3CaseAttempts: V3CaseAttempt[];
  courseEvidence: CourseEvidence;
  localRuns: [string, string][];
};
const emptyState = { history: [], activityAttempts: [], v3CaseAttempts: [], userId: null, courseEvidence: emptyV3Evidence, localRuns: [] };

function localRunEntries(): [string, string][] {
  try {
    return Object.entries(window.sessionStorage).filter(([key]) => key.startsWith("casework:v3-activity:") || key.startsWith("casework:guest-session:"));
  } catch { return []; }
}

export function usePracticeProgress() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<PracticeProgressState>({
    status: "loading",
    ...emptyState,
  });

  useEffect(() => {
    let active = true;

    void getBrowserPracticeSession()
      .then(async ({ repository, userId }) => {
        const history = await repository.getSkillHistory(userId);
        const v3Repository = repository as Partial<V3Repository>;
        const evidence = await (v3Repository.listCourseEvidence?.(userId) ?? Promise.resolve(emptyV3Evidence));
        return { userId, history, activityAttempts: evidence.activityAttempts, v3CaseAttempts: evidence.caseAttempts, courseEvidence: evidence, localRuns: localRunEntries() };
      })
      .then((loaded) => {
        if (active) setState({ status: "ready", ...loaded });
      })
      .catch(() => {
        if (active) setState({ status: "error", ...emptyState });
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
        setState({ status: "loading", ...emptyState });
        setRevision((current) => current + 1);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return {
    ...state,
    retry() {
      setState({ status: "loading", ...emptyState });
      setRevision((current) => current + 1);
    },
  };
}
