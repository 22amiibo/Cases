"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ActivityAttempt } from "@/core/activity";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import type { V3Repository } from "@/data/v3-repository";

export function RecentActivity({
  activityIds,
  className,
}: {
  activityIds: string[];
  className?: string;
}) {
  const [attempts, setAttempts] = useState<ActivityAttempt[] | null>(null);
  useEffect(() => {
    let active = true;
    void getBrowserPracticeSession().then(async ({ repository, userId }) =>
      (repository as V3Repository).listActivityAttempts(userId)
    ).then((history) => {
      if (active) setAttempts(history.filter(({ activityId }) => activityIds.includes(activityId)).slice(0, 3));
    }).catch(() => {
      if (active) setAttempts([]);
    });
    return () => { active = false; };
  }, [activityIds]);
  return <section className={className} aria-labelledby="recent-activity-heading">
    <h2 id="recent-activity-heading">Recent attempts</h2>
    {attempts === null ? <p role="status">Loading recent attempts…</p>
      : attempts.length === 0 ? <p>No completed attempts yet.</p>
        : <ul>{attempts.map((attempt) => <li key={attempt.attemptId}>
          <Link href={`/practice/attempts/${attempt.attemptId}`}>
            Review {attempt.activityId.replaceAll("-", " ")} · {attempt.completedAt.slice(0, 10)}
          </Link>
        </li>)}</ul>}
  </section>;
}
