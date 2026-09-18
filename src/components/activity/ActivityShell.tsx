"use client";

import { courseRunSuffix, courseHref } from "@/core/course-progress";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ActivityEvent, CourseContext } from "@/core/activity";
import { ActivityEventSchema } from "@/core/activity";
import type { projectLearnerActivity } from "@/core/activity-projection";
import type { LearnerExhibitDefinition } from "@/core/learner-case";
import { bindLearnerStorage } from "@/data/learner-identity";
import { saveOwnedAttempt } from "@/data/owned-saves";
import { loadPendingAttempt, savePendingAttempt, clearPendingAttempt } from "@/data/pending-attempts";
import type { ActivityAttemptRepository } from "@/data/v3-repository";
import type { ActivityReview } from "@/core/activity-review";
import {
  InteractionRenderer,
  type InteractionCommit,
  type LearnerInteraction,
} from "./InteractionRenderer";
import styles from "./ActivityShell.module.css";
import { ActivityReviewSummary } from "./ActivityReviewSummary";

type LearnerActivity = ReturnType<typeof projectLearnerActivity>;
type ActivityEventInput = ActivityEvent extends infer Event
  ? Event extends ActivityEvent
    ? Omit<Event, "eventId" | "atMs">
    : never
  : never;
type StoredRun = {
  attemptId: string;
  userId?: string;
  startedAt: string;
  completedAt?: string;
  events: ActivityEvent[];
  courseContext?: CourseContext | null;
};

function readRun(key: string, storage: ReturnType<typeof bindLearnerStorage>): StoredRun | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(storage.getItem(key) ?? "null") as Partial<StoredRun> | null;
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
  nextActivityHref,
  createId = () => crypto.randomUUID(),
  now = () => new Date(),
}: {
  initial: LearnerActivity;
  repository?: ActivityAttemptRepository;
  userId?: string;
  courseContext?: CourseContext | null;
  exhibit?: LearnerExhibitDefinition;
  nextActivityHref?: string;
  createId?: () => string;
  now?: () => Date;
}) {
  const ready = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const [draftStorage] = useState(bindLearnerStorage);
  const originUserId = userId ?? draftStorage.userId;
  const storageKey = `casework:v3-activity:${initial.id}:${initial.contentVersion}${courseRunSuffix(courseContext)}`;
  const [pending] = useState(() => typeof window === "undefined" ? null : loadPendingAttempt<StoredRun>(window.sessionStorage, storageKey, originUserId));
  const [restored] = useState(() => pending ?? readRun(storageKey, draftStorage));
  const [attemptId] = useState(() => restored?.attemptId ?? createId());
  const [startedAt] = useState(() => restored?.startedAt ?? now().toISOString());
  const [completedAt, setCompletedAt] = useState(restored?.completedAt);
  const [events, setEvents] = useState<ActivityEvent[]>(restored?.events ?? []);
  const [view, setView] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "error">(pending ? "error" : "idle");
  const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);
  const [completionReview, setCompletionReview] = useState<ActivityReview | null>(null);
  const phaseHeading = useRef<HTMLHeadingElement>(null);
  const saved = useRef(false);

  useEffect(() => {
    if (events.length === 0 || saved.current) return;
    draftStorage.setItem(storageKey, JSON.stringify({
      attemptId,
      startedAt,
      ...(completedAt ? { completedAt } : {}),
      events,
      courseContext,
    } satisfies StoredRun));
  }, [attemptId, completedAt, events, startedAt, storageKey, courseContext, draftStorage]);

  useEffect(() => {
    if (events.length === 0) return;
    void fetch(`/api/activities/${initial.id}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentVersion: initial.contentVersion, events, courseContext }),
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

  async function saveCompletion(finalEvents: ActivityEvent[]) {
    setStatus("saving");
    const finishedAt = completedAt ?? now().toISOString();
    setCompletedAt(finishedAt);
    try {
      savePendingAttempt(window.sessionStorage, storageKey, { attemptId, userId: originUserId, startedAt, completedAt: finishedAt, events: finalEvents, courseContext });
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
        review: ActivityReview;
      };
      setCompletionReview(result.review);
      await saveOwnedAttempt({ method: "saveActivityAttempt", attempt: {
        attemptId,
        userId: originUserId,
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
      } }, repository);
      clearPendingAttempt(window.sessionStorage, storageKey, originUserId);
      saved.current = true;
      draftStorage.removeItem(storageKey);
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

  if (!ready) return null;

  return (
    <section className={styles.shell}>
      <div className={styles.activityNav}>
        <p className={styles.eyebrow}>{initial.labId} · {initial.estimatedMinutes} min</p>
        <Link href={courseContext ? courseHref({ id: courseContext.courseId, contentVersion: courseContext.courseVersion }) : `/practice/${initial.labId}`}>Exit Activity</Link>
      </div>
      {events.length > 0 && view.phase !== "complete" && <p className={styles.exitNote}>Committed steps are saved in this browser when you exit.</p>}
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
            orderSeedKey={`casework:choice-seed:v3-activity:${attemptId}`}
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
          <h2 ref={phaseHeading} tabIndex={-1}>Your result</h2>
          {completionReview && <ActivityReviewSummary review={completionReview} />}
          {status === "error" && (
            <button type="button" onClick={() => void saveCompletion(events)}>Retry save</button>
          )}
          {savedAttemptId && (
            <div className={styles.completionActions}>
              <Link href={`/practice/attempts/${savedAttemptId}`}>Review Answers</Link>
              <Link href={`/practice/activities/${initial.id}?version=${initial.contentVersion}`}>Practice Again</Link>
              {nextActivityHref && <Link href={nextActivityHref}>Next Exercise</Link>}
              <Link href="/practice">Return to Practice</Link>
              {courseContext && <Link href={courseHref({ id: courseContext.courseId, contentVersion: courseContext.courseVersion })}>Continue course</Link>}
            </div>
          )}
        </div>
      )}
      {status === "error" && <p role="alert">Your progress was not saved. Try again.</p>}
    </section>
  );
}

type ActivityAttemptParameters = Parameters<ActivityAttemptRepository["saveActivityAttempt"]>[0];
