"use client";

import Link from "next/link";
import { buildProgressDashboard, buildRecommendedSession } from "@/core/progress-dashboard";
import { buildAchievements } from "@/core/progress-achievements";
import { diagnosticDefinitions } from "@/core/diagnostics";
import { buildUnifiedHistory, buildV3Progress, type ProgressResource } from "@/core/v3-progress";
import { activityHref, findRecoverableRuns, selectV3Recommendation, type PracticeOption, type CourseRecommendationStep } from "@/core/v3-recommendations";
import { usePracticeProgress } from "@/components/progress/usePracticeProgress";
import styles from "@/app/progress/progress.module.css";

function date(value: string) {
  return new Date(value).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
}

function countLabel(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export function ProgressDashboard({ resources, activities, courseStep = null }: { resources: ProgressResource[]; activities: PracticeOption[]; courseStep?: CourseRecommendationStep | null }) {
  const progress = usePracticeProgress();
  const dashboard = buildProgressDashboard(progress.history);
  const recommendation = buildRecommendedSession(progress.history);
  const activityAttempts = progress.activityAttempts ?? [];
  const v3CaseAttempts = progress.v3CaseAttempts ?? [];
  const history = buildUnifiedHistory(progress.history, activityAttempts, v3CaseAttempts, resources);
  const caseReplays = history.filter(item => item.kind === "case");
  const recent = history.slice(0, 6);
  const skills = buildV3Progress(activityAttempts, v3CaseAttempts);
  const runs = findRecoverableRuns(progress.localRuns ?? [], resources);
  const coaching = selectV3Recommendation({ activities, attempts: activityAttempts, skills, runs, courseStep });
  const useCurrent = activityAttempts.length > 0 || v3CaseAttempts.length > 0 || runs.length > 0 || !!courseStep || progress.history.length === 0;
  const primary = useCurrent ? coaching : { title: recommendation.title, explanation: recommendation.explanation, href: recommendation.practice.href };
  const quick = [...activities].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes || a.id.localeCompare(b.id)).slice(0, 3);
  const achievements = buildAchievements(progress.history, activityAttempts, v3CaseAttempts);

  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.wordmark}>Casework</Link><span>Progress</span></header>
    <section className={styles.intro}>
      <p>Your practice</p><h1>Progress you can act on</h1>
      {progress.status === "loading" ? <span role="status">Loading your practice history…</span>
        : progress.status === "error" ? <span role="alert">Your practice history could not be loaded. <button type="button" onClick={progress.retry}>Try again</button></span>
          : <span>{countLabel(dashboard.v2.sessionsCompleted + activityAttempts.length, "focused practice")} · {countLabel(history.filter(item => item.kind === "case").length, "completed case")}</span>}
    </section>

    {progress.status === "ready" && <>
      <section className={styles.replays} aria-labelledby="continue-heading">
        <div className={styles.sectionIntro}><div><h2 id="continue-heading">Continue</h2></div></div>
        {runs.length ? <div className={styles.replayGrid}>{runs.slice(0, 3).map(run => <article key={run.href}><h3>{run.title}</h3><Link href={run.href}>Resume practice</Link></article>)}</div> : <p>No unfinished practice saved in this browser.</p>}
      </section>
      <section className={styles.recommendation} aria-labelledby="recommended-next-heading">
        <p>Your next useful rep</p><h2 id="recommended-next-heading">Recommended next</h2>
        {primary ? <><h3>{primary.title}</h3><span>{primary.explanation}</span><div><Link href={primary.href}>{useCurrent ? "Open recommended practice" : `Practice ${recommendation.practice.label}`} →</Link></div></> : <span>You have explored every available short practice. Revisit a skill from the practice library.</span>}
      </section>
      <section className={styles.replays} aria-labelledby="quick-practice-heading">
        <div className={styles.sectionIntro}><div><h2 id="quick-practice-heading">Quick practice</h2></div></div>
        <div className={styles.replayGrid}>{quick.map(activity => <article key={activity.id}><p>{activity.estimatedMinutes} minutes</p><h3>{activity.title}</h3><Link href={activityHref(activity)}>Start practice</Link></article>)}</div>
      </section>
      <section className={styles.replays} aria-labelledby="skills-snapshot-heading">
        <div className={styles.sectionIntro}><div><h2 id="skills-snapshot-heading">Skills snapshot</h2></div><p>Reviewed practice, retries, and application in cases build consistent evidence.</p></div>
        <div className={styles.skills}>{skills.map(skill => <article className={styles.skill} key={skill.skillId}><div className={styles.skillHeading}><h3>{skill.label}</h3><strong>{skill.status}</strong></div><div className={styles.detail}><p>{skill.reviewed} reviewed · {skill.transferred} retried or applied in cases</p><div>{skill.diagnostics.slice(0, 2).map(d => <p key={`${d.source}:${d.code}`}><span className={styles.source}>{d.sourceLabel}</span> {d.explanation}</p>)}</div></div></article>)}</div>
      </section>

      <section className={styles.replays} aria-labelledby="recent-activity-heading">
        <div className={styles.sectionIntro}><div><p>Latest work</p><h2 id="recent-activity-heading">Recent activity</h2></div><p>Reopen completed work to review your reasoning and coaching.</p></div>
        {recent.length > 0 ? <div className={styles.replayGrid}>{recent.map((item) => <article key={`${item.kind}:${item.id}`}><p>{date(item.completedAt)}</p><h3>{item.title}</h3>{item.availability !== "available" && <span>{item.availability === "retired" ? "Retired practice; your review is preserved." : "Original practice unavailable; saved work may still be reviewed."}</span>}{item.href ? <Link href={item.href}>Review activity</Link> : <span>Earlier practice result</span>}</article>)}</div> : <p>Complete a practice activity or case to build your history.</p>}
        <Link href="/progress/history">View all activity</Link>
      </section>

      {progress.history.some(attempt => attempt.scoringVersion === "v2") && <>
      <section className={styles.sectionIntro}><div><p>Current evidence</p><h2>Skills</h2></div><p>Statuses reflect reviewed practice and application in cases. Coaching points explain what to work on next.</p></section>
      <section className={styles.skills} aria-label="Skill progress">
        {dashboard.v2.skills.map((skill) => <article className={styles.skill} key={skill.skillId}>
          <div className={styles.skillHeading}><div><p>{countLabel(skill.attemptsCompleted, "practice")}</p><h3>{skill.label}</h3></div><strong>{skill.status}</strong></div>
          <div className={styles.detail}>
            <div><h4>Practice evidence</h4><p>{skill.evidence.reviewed} reviewed · {skill.evidence.revised} improved through retry · {skill.evidence.transferred} applied in cases</p></div>
            <div><h4>Coaching</h4>{skill.diagnostics.length > 0 ? <ul>{skill.diagnostics.slice(0, 2).map((diagnostic) => <li key={`${diagnostic.source}:${diagnostic.code}`}><span className={styles.source}>{diagnostic.source === "self_assessment" ? "Your reflection" : "Coach feedback"}</span> {diagnosticDefinitions[diagnostic.code].explanation}</li>)}</ul> : <p>Complete a reviewed practice to see a coaching pattern.</p>}</div>
          </div>
        </article>)}
        <article className={styles.skill}>
          <div className={styles.skillHeading}><div><p>{countLabel(dashboard.v2.hypothesis.casesReviewed, "case review")}</p><h3>Hypothesis updates</h3></div><strong>{dashboard.v2.hypothesis.casesReviewed > 0 ? "Building" : "Not started"}</strong></div>
          <div className={styles.detail}><div><h4>Practice evidence</h4><p>Evidence shows whether you changed your thinking when the facts changed.</p></div><div><h4>Coaching</h4>{dashboard.v2.hypothesis.diagnostics.length > 0 ? <ul>{dashboard.v2.hypothesis.diagnostics.slice(0, 2).map((diagnostic) => <li key={`${diagnostic.source}:${diagnostic.code}`}>{diagnosticDefinitions[diagnostic.code].explanation}</li>)}</ul> : <p>Complete a case hypothesis update to see a coaching pattern.</p>}</div></div>
        </article>
      </section>

      </>}
      <section className={styles.replays} aria-labelledby="case-history-heading">
        <div className={styles.sectionIntro}><div><p>Completed cases</p><h2 id="case-history-heading">Case history</h2></div><p>Each review reopens the exact case saved with the attempt.</p></div>
        {caseReplays.length > 0 ? <div className={styles.replayGrid}>{caseReplays.map((attempt) => <article key={attempt.id}><p>{date(attempt.completedAt)}</p><h3>{attempt.title}</h3><Link href={attempt.href!}>Review {attempt.title}</Link></article>)}</div> : <p>Complete a case to create your first case review.</p>}
      </section>

      <section className={styles.replays} aria-labelledby="achievements-heading">
        <div className={styles.sectionIntro}><div><p>Training milestones</p><h2 id="achievements-heading">Achievements</h2></div><p>Milestones recognize meaningful practice volume and stronger reasoning habits.</p></div>
        <div className={styles.replayGrid}>{achievements.map((achievement) => <article key={achievement.id}><p>{achievement.earned ? "Completed" : `${achievement.progress} of ${achievement.goal}`}</p><h3>{achievement.title}</h3><span>{achievement.description}</span></article>)}</div>
      </section>

      {dashboard.legacy.sessionsCompleted > 0 && <section className={styles.legacy} aria-labelledby="earlier-practice-heading"><div className={styles.sectionIntro}><div><p>Preserved results</p><h2 id="earlier-practice-heading">Earlier practice</h2></div><p>These older numeric results remain available for reference and do not change current coaching.</p></div><div className={styles.legacyGrid}>{dashboard.legacy.skills.map((skill) => <article key={skill.skillId}><p>{countLabel(skill.attemptsCompleted, "attempt")}</p><h3>{skill.label}</h3><strong>{skill.readiness}</strong><span>{skill.score === null ? "No score" : `Score ${skill.score}`}</span></article>)}</div></section>}
    </>}
  </main>;
}
