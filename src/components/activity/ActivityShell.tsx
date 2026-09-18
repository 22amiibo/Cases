"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ActivityEvent, CourseContext } from "@/core/activity";
import { ActivityEventSchema } from "@/core/activity";
import type { projectLearnerActivity } from "@/core/activity-projection";
import type { LearnerExhibitDefinition } from "@/core/learner-case";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import type { ActivityAttemptRepository } from "@/data/v3-repository";
import type { V3Repository } from "@/data/v3-repository";
import {
  InteractionRenderer,
  type InteractionCommit,
  type LearnerInteraction,
} from "./InteractionRenderer";
import styles from "./ActivityShell.module.css";

type LearnerActivity = ReturnType<typeof projectLearnerActivity>;
type ActivityEventInput = ActivityEvent extends infer Event
  ? Event extends ActivityEvent
    ? Omit<Event, "eventId" | "atMs">
    : never
  : never;
type StoredRun = {
  attemptId: string;
  startedAt: string;
  completedAt?: string;
  events: ActivityEvent[];
};

function readRun(key: string): StoredRun | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(key) ?? "null") as Partial<StoredRun> | null;
    const events = ActivityEventSchema.array().safeParse(value?.events);
    return value && typeof value.attemptId === "string" &&
      typeof value.startedAt === "string" && events.success
      ? { ...value, events: events.data } as StoredRun
      : null;
  } catch {
    return null;
  }
}

export function ActivityShell({
  initial,
  repository,
  userId,
  courseContext = null,
  exhibit,
  createId = () => crypto.randomUUID(),
  now = () => new Date(),
}: {
  initial: LearnerActivity;
  repository?: ActivityAttemptRepository;
  userId?: string;
  courseContext?: CourseContext | null;
  exhibit?: LearnerExhibitDefinition;
  createId?: () => string;
  now?: () => Date;
}) {
  const storageKey = `casework:v3-activity:${initial.id}:${initial.contentVersion}`;
  const [restored] = useState(() => readRun(storageKey));
  const [attemptId] = useState(() => restored?.attemptId ?? createId());
  const [startedAt] = useState(() => restored?.startedAt ?? now().toISOString());
  const [completedAt, setCompletedAt] = useState(restored?.completedAt);
  const [events, setEvents] = useState<ActivityEvent[]>(restored?.events ?? []);
  const [view, setView] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);
  const phaseHeading = useRef<HTMLHeadingElement>(null);
  const saved = useRef(false);

  useEffect(() => {
    if (events.length === 0 || saved.current) return;
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      attemptId,
      startedAt,
      ...(completedAt ? { completedAt } : {}),
      events,
    } satisfies StoredRun));
  }, [attemptId, completedAt, events, startedAt, storageKey]);

  useEffect(() => {
    if (events.length === 0) return;
    void fetch(`/api/activities/${initial.id}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentVersion: initial.contentVersion, events }),
    }).then(async (response) => {
      if (!response.ok) throw new Error("Unable to restore activity");
      setView(await response.json() as LearnerActivity);
    }).catch(() => setStatus("error"));
    // Restored once; committed events are updated through sendEvent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view.phase !== "context") phaseHeading.current?.focus();
  }, [view.phase, view.reviewStep]);

  async function sendEvent(
    input: ActivityEventInput | InteractionCommit,
    baseEvents = events,
  ) {
    const event = ActivityEventSchema.parse({
      ...input,
      eventId: crypto.randomUUID(),
      atMs: Math.max(0, now().getTime() - new Date(startedAt).getTime()),
    });
    setStatus("saving");
    const response = await fetch(`/api/activities/${initial.id}/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentVersion: initial.contentVersion,
        events: baseEvents,
        event,
        courseContext,
      }),
    });
    if (!response.ok) {
      setStatus("error");
      throw new Error("Unable to commit activity event");
    }
    const nextEvents = [...baseEvents, event];
    setEvents(nextEvents);
    setView(await response.json() as LearnerActivity);
    setStatus("idle");
    return nextEvents;
  }

  async function repositoryForSave() {
    if (repository && userId) return { repository, userId };
    const session = await getBrowserPracticeSession();
    return {
      repository: session.repository as V3Repository,
      userId: session.userId,
    };
  }

  async function saveCompletion(finalEvents: ActivityEvent[]) {
    setStatus("saving");
    const finishedAt = completedAt ?? now().toISOString();
    setCompletedAt(finishedAt);
    try {
      const response = await fetch(`/api/activities/${initial.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentVersion: initial.contentVersion,
          events: finalEvents,
          courseContext,
        }),
      });
      if (!response.ok) throw new Error("Unable to evaluate activity");
      const result = await response.json() as {
        skillEvidence: ActivityAttemptParameters["skillEvidence"];
        diagnostics: ActivityAttemptParameters["diagnostics"];
      };
      const destination = await repositoryForSave();
      await destination.repository.saveActivityAttempt({
        attemptId,
        userId: destination.userId,
        activityId: initial.id,
        contentVersion: initial.contentVersion,
        eventSchemaVersion: 3,
        scoringVersion: "v3",
        startedAt,
        completedAt: finishedAt,
        primarySkillId: initial.primarySkillId,
        skillEvidence: result.skillEvidence,
        diagnostics: result.diagnostics,
        courseContext,
        events: finalEvents,
      });
      saved.current = true;
      window.sessionStorage.removeItem(storageKey);
      setSavedAttemptId(attemptId);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function finish() {
    try {
      const withTakeaway = await sendEvent({ type: "takeaway_viewed" });
      const completeEvents = await sendEvent(
        { type: "activity_completed" },
        withTakeaway,
      );
      await saveCompletion(completeEvents);
    } catch {
      setStatus("error");
    }
  }

  const feedback = "feedback" in view ? view.feedback : undefined;
  const interaction = view.interaction as LearnerInteraction;

  return (
    <section className={styles.shell}>
      <p className={styles.eyebrow}>{initial.labId} · {initial.estimatedMinutes} min</p>
      <h1>{initial.title}</h1>
      {view.phase === "context" && (
        <button type="button" disabled={status === "saving"} onClick={() => {
          void sendEvent({ type: "activity_started" }).catch(() => undefined);
        }}>Start activity</button>
      )}
      {view.phase === "interaction" && (
        <div className={styles.phase}>
          <h2 ref={phaseHeading} tabIndex={-1}>Make your commitment</h2>
          <InteractionRenderer
            interaction={interaction}
            disabled={status === "saving"}
            exhibit={exhibit}
            onCommit={(event) => void sendEvent(event).catch(() => undefined)}
          />
        </div>
      )}
      {view.phase === "feedback" && feedback && (
        <div className={styles.phase}>
          <h2 ref={phaseHeading} tabIndex={-1}>Review feedback</h2>
          <p>{feedback.explanation}</p>
          <p><strong>Principle:</strong> {feedback.principle}</p>
          <p><strong>Next:</strong> {feedback.nextAction}</p>
          <div className={styles.actions}>
            <button type="button" disabled={status === "saving"} onClick={() => {
              void sendEvent({
                type: "retry_decided",
                interactionId: interaction.interactionId,
                decision: "retry",
              }).catch(() => undefined);
            }}>Try again</button>
            <button type="button" disabled={status === "saving"} onClick={() => {
              void sendEvent({
                type: "retry_decided",
                interactionId: interaction.interactionId,
                decision: "continue",
              }).catch(() => undefined);
            }}>Continue</button>
          </div>
        </div>
      )}
      {view.phase === "takeaway" && (
        <div className={styles.phase}>
          <h2 ref={phaseHeading} tabIndex={-1}>Takeaway</h2>
          {"takeaway" in view && <p>{view.takeaway}</p>}
          <button type="button" disabled={status === "saving"} onClick={() => void finish()}>
            Finish activity
          </button>
        </div>
      )}
      {view.phase === "complete" && (
        <div className={styles.phase}>
          <h2 ref={phaseHeading} tabIndex={-1}>Activity complete</h2>
          <p>Your committed work and review are complete.</p>
          {status === "error" && (
            <button type="button" onClick={() => void saveCompletion(events)}>Retry save</button>
          )}
          {savedAttemptId && (
            <Link href={`/practice/attempts/${savedAttemptId}`}>Review completed attempt</Link>
          )}
        </div>
      )}
      {status === "error" && <p role="alert">Your progress was not saved. Try again.</p>}
    </section>
  );
}

type ActivityAttemptParameters = Parameters<ActivityAttemptRepository["saveActivityAttempt"]>[0];
