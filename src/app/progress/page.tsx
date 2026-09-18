"use client";

import Link from "next/link";
import { buildProgressDashboard, buildRecommendedSession } from "@/core/progress-dashboard";
import { buildAchievements } from "@/core/progress-achievements";
import { diagnosticDefinitions } from "@/core/diagnostics";
import { V3_SKILL_LABELS } from "@/core/v3-taxonomy";
import { usePracticeProgress } from "@/components/progress/usePracticeProgress";
import styles from "./progress.module.css";

const caseLabels: Record<string, string> = {
  "alpinefit-profitability": "AlpineFit profitability",
  "paypilot-growth": "PayPilot growth",
  "goldenloaf-operations": "GoldenLoaf operations",
  "northstar-profitability": "NorthStar profitability",
  "fleetfix-market-entry": "FleetFix market entry",
  "morningjet-pricing-breakeven": "MorningJet pricing",
};

function date(value: string) {
  return new Date(value).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
}

function countLabel(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export default function ProgressPage() {
  const progress = usePracticeProgress();
  const dashboard = buildProgressDashboard(progress.history);
  const recommendation = buildRecommendedSession(progress.history);
  const activityAttempts = progress.activityAttempts ?? [];
  const v3CaseAttempts = progress.v3CaseAttempts ?? [];
  const caseReplays = [...new Map(
    progress.history.flatMap((attempt) => attempt.attemptType === "case" && attempt.caseId
      ? [[attempt.attemptId, attempt] as const]
      : []),
  ).values()];
  const recent = [
    ...activityAttempts.map((attempt) => ({
      id: attempt.attemptId,
      completedAt: attempt.completedAt,
      label: `${V3_SKILL_LABELS[attempt.primarySkillId]} practice`,
      href: `/practice/attempts/${attempt.attemptId}`,
    })),
    ...caseReplays.map((attempt) => ({
      id: attempt.attemptId,
      completedAt: attempt.completedAt,
      label: caseLabels[attempt.caseId!] ?? "Case practice",
      href: `/cases/${attempt.caseId}/attempts/${encodeURIComponent(attempt.attemptId)}`,
    })),
  ].sort((left, right) => right.completedAt.localeCompare(left.completedAt)).slice(0, 6);
  const achievements = buildAchievements(progress.history, activityAttempts, v3CaseAttempts);

  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.wordmark}>Casework</Link><span>Progress</span></header>
    <section className={styles.intro}>
      <p>Your practice</p><h1>Progress you can act on</h1>
      {progress.status === "loading" ? <span role="status">Loading your practice history…</span>
        : progress.status === "error" ? <span role="alert">Your practice history could not be loaded. <button type="button" onClick={progress.retry}>Try again</button></span>
          : <span>{countLabel(dashboard.v2.sessionsCompleted + activityAttempts.length, "focused practice")} · {countLabel(caseReplays.length + v3CaseAttempts.length, "completed case")}</span>}
    </section>

    {progress.status === "ready" && <>
      <section className={styles.recommendation} aria-labelledby="recommended-next-heading">
        <p>Your next useful rep</p><h2 id="recommended-next-heading">Recommended next</h2>
        <h3>{recommendation.title}</h3><span>{recommendation.explanation}</span>
        <div><Link href={recommendation.practice.href}>Practice {recommendation.practice.label} →</Link></div>
      </section>

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

      <section className={styles.replays} aria-labelledby="recent-activity-heading">
        <div className={styles.sectionIntro}><div><p>Latest work</p><h2 id="recent-activity-heading">Recent activity</h2></div><p>Reopen completed work to review your reasoning and coaching.</p></div>
        {recent.length > 0 ? <div className={styles.replayGrid}>{recent.map((item) => <article key={item.id}><p>{date(item.completedAt)}</p><h3>{item.label}</h3><Link href={item.href}>Review activity</Link></article>)}</div> : <p>Complete a practice activity or case to build your history.</p>}
      </section>

      <section className={styles.replays} aria-labelledby="case-history-heading">
        <div className={styles.sectionIntro}><div><p>Completed cases</p><h2 id="case-history-heading">Case history</h2></div><p>Each review reopens the exact case saved with the attempt.</p></div>
        {caseReplays.length > 0 ? <div className={styles.replayGrid}>{caseReplays.map((attempt) => <article key={attempt.attemptId}><p>{date(attempt.completedAt)}</p><h3>{caseLabels[attempt.caseId!] ?? attempt.caseId!.replaceAll("-", " ")}</h3><Link href={`/cases/${attempt.caseId}/attempts/${encodeURIComponent(attempt.attemptId)}`}>Review {caseLabels[attempt.caseId!] ?? "case"}</Link></article>)}</div> : <p>Complete a case to create your first case review.</p>}
      </section>

      <section className={styles.replays} aria-labelledby="achievements-heading">
        <div className={styles.sectionIntro}><div><p>Training milestones</p><h2 id="achievements-heading">Achievements</h2></div><p>Milestones recognize meaningful practice volume and stronger reasoning habits.</p></div>
        <div className={styles.replayGrid}>{achievements.map((achievement) => <article key={achievement.id}><p>{achievement.earned ? "Completed" : `${achievement.progress} of ${achievement.goal}`}</p><h3>{achievement.title}</h3><span>{achievement.description}</span></article>)}</div>
      </section>

      {dashboard.legacy.sessionsCompleted > 0 && <section className={styles.legacy} aria-labelledby="earlier-practice-heading"><div className={styles.sectionIntro}><div><p>Preserved results</p><h2 id="earlier-practice-heading">Earlier practice</h2></div><p>These older numeric results remain available for reference and do not change current coaching.</p></div><div className={styles.legacyGrid}>{dashboard.legacy.skills.map((skill) => <article key={skill.skillId}><p>{countLabel(skill.attemptsCompleted, "attempt")}</p><h3>{skill.label}</h3><strong>{skill.readiness}</strong><span>{skill.score === null ? "No score" : `Score ${skill.score}`}</span></article>)}</div></section>}
    </>}
  </main>;
}
