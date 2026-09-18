"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ActivityAttempt } from "@/core/activity";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import type { ActivityAttemptRepository, V3Repository } from "@/data/v3-repository";

type ReviewView = {
  title: string;
  feedback?: { explanation?: string; principle?: string; nextAction?: string };
  takeaway?: string;
};

function Timeline({ attempt }: { attempt: ActivityAttempt }) {
  return <>
    <h2>Committed timeline</h2>
    <ol>{attempt.events.map((event) => <li key={event.eventId}>{event.type.replaceAll("_", " ")}</li>)}</ol>
  </>;
}

export function ActivityAttemptReview({
  attemptId,
  repository,
  userId,
}: {
  attemptId: string;
  repository?: ActivityAttemptRepository;
  userId?: string;
}) {
  const [result, setResult] = useState<{
    attempt: ActivityAttempt;
    view: ReviewView | null;
  } | null | "unavailable">(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const destination = repository && userId
        ? { repository, userId }
        : await getBrowserPracticeSession().then((session) => ({
            repository: session.repository as V3Repository,
            userId: session.userId,
          }));
      const attempt = await destination.repository.getActivityAttempt(destination.userId, attemptId);
      if (!attempt) return "unavailable" as const;
      const response = await fetch(`/api/activities/${attempt.activityId}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentVersion: attempt.contentVersion, events: attempt.events }),
      });
      if (!response.ok) return { attempt, view: null };
      return { attempt, view: await response.json() as ReviewView };
    })().then((value) => { if (active) setResult(value); }).catch(() => {
      if (active) setResult("unavailable");
    });
    return () => { active = false; };
  }, [attemptId, repository, userId]);

  if (result === null) return <p role="status">Loading attempt…</p>;
  if (result === "unavailable") return <section><h1>Attempt unavailable</h1><p>This attempt is missing or belongs to another account.</p></section>;
  if (result.view === null) return <section><h1>Historical content unavailable</h1><p>The exact activity version cannot be loaded. Your committed event history remains available below.</p><Timeline attempt={result.attempt} /></section>;
  return <section>
    <p>Completed {result.attempt.completedAt.slice(0, 10)} · V{result.attempt.contentVersion}</p>
    <h1>{result.view.title}</h1>
    {result.view.feedback?.explanation && <p>{result.view.feedback.explanation}</p>}
    {result.view.feedback?.principle && <p><strong>Principle:</strong> {result.view.feedback.principle}</p>}
    {result.view.feedback?.nextAction && <p><strong>Next:</strong> {result.view.feedback.nextAction}</p>}
    {result.view.takeaway && <p><strong>Takeaway:</strong> {result.view.takeaway}</p>}
    <Timeline attempt={result.attempt} />
    <Link href="/practice">Return to Practice</Link>
  </section>;
}
