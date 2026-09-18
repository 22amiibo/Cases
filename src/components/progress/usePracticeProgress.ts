"use client";

import { useEffect, useRef, useState } from "react";
import { findRecoverableRuns, type RecoverableRun } from "@/core/v3-recommendations";
import type { ProgressResource } from "@/core/v3-progress";
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
  recoverableRuns: RecoverableRun[];
};
const emptyState = { history: [], activityAttempts: [], v3CaseAttempts: [], userId: null, courseEvidence: emptyV3Evidence, recoverableRuns: [] };

function localRunEntries(): [string, string][] {
  try {
    return Object.entries(window.sessionStorage).filter(([key]) => key.startsWith("casework:v3-activity:") || key.startsWith("casework:guest-session:"));
  } catch { return []; }
}

const noResources: ProgressResource[] = [];

export function usePracticeProgress(resources: ProgressResource[] = noResources) {
  const generation = useRef(0);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<PracticeProgressState>({
    status: "loading",
    ...emptyState,
  });

  useEffect(() => {
    let active = true;
    const requestGeneration = generation.current;

    void getBrowserPracticeSession()
      .then(async ({ repository, userId }) => {
        const history = await repository.getSkillHistory(userId);
        const v3Repository = repository as Partial<V3Repository>;
        const evidence = await (v3Repository.listCourseEvidence?.(userId) ?? Promise.resolve(emptyV3Evidence));
        const recoverableRuns = await findRecoverableRuns(localRunEntries(), resources, async ({ endpoint, body }) => (await fetch(endpoint, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })).ok);
        return { userId, history, activityAttempts: evidence.activityAttempts, v3CaseAttempts: evidence.caseAttempts, courseEvidence: evidence, recoverableRuns };
      })
      .then((loaded) => {
        if (active && requestGeneration === generation.current) setState({ status: "ready", ...loaded });
      })
      .catch(() => {
        if (active && requestGeneration === generation.current) setState({ status: "error", ...emptyState });
      });

    return () => {
      active = false;
    };
  }, [revision, resources]);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    if (!client) return;

    const { data } = client.auth.onAuthStateChange((event) => {
      if (event !== "INITIAL_SESSION") {
        generation.current++;
        setState({ status: "loading", ...emptyState });
        setRevision((current) => current + 1);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return {
    ...state,
    retry() {
      generation.current++;
      setState({ status: "loading", ...emptyState });
      setRevision((current) => current + 1);
    },
  };
}
