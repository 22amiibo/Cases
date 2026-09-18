"use client";
import Link from "next/link";
import { buildUnifiedHistory, type ProgressResource } from "@/core/v3-progress";
import { usePracticeProgress } from "./usePracticeProgress";
import styles from "@/app/progress/progress.module.css";

export function ProgressHistory({ resources }: { resources: ProgressResource[] }) {
  const progress = usePracticeProgress();
  const history = buildUnifiedHistory(progress.history, progress.activityAttempts ?? [], progress.v3CaseAttempts ?? [], resources);
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.wordmark}>Casework</Link><Link href="/progress">Progress</Link></header>
    <section className={styles.intro}><p>Your practice</p><h1>Activity history</h1><span>Reopen your saved work and coaching.</span></section>
    {progress.status === "loading" ? <p role="status">Loading your practice history…</p> : progress.status === "error" ? <p role="alert">Your practice history could not be loaded. <button type="button" onClick={progress.retry}>Try again</button></p> : <section className={styles.replays} aria-label="Completed activity">
      {history.length ? <div className={styles.replayGrid}>{history.map(item => <article key={`${item.kind}:${item.id}`}>
        <p>{new Date(item.completedAt).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}</p><h2>{item.title}</h2>
        {item.availability !== "available" && item.kind !== "drill" && <span>{item.availability === "retired" ? "Retired practice; your review is preserved." : "Original practice unavailable; saved work may still be reviewed."}</span>}
        {item.href ? <Link href={item.href}>Review {item.title}</Link> : <span>Earlier practice result. See your preserved results in Progress.</span>}
      </article>)}</div> : <p>Complete a practice activity or case to build your history.</p>}
    </section>}
  </main>;
}
