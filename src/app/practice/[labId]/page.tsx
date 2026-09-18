import Link from "next/link";
import { notFound } from "next/navigation";
import { RecentActivity } from "@/components/activity/RecentActivity";
import { activeActivityDefinitions } from "@/content/activities";
import { SKILL_LAB_LABELS, SkillLabIdSchema } from "@/core/v3-taxonomy";
import styles from "../practice.module.css";

export default async function LabPage({ params }: { params: Promise<{ labId: string }> }) {
  const parsed = SkillLabIdSchema.safeParse((await params).labId);
  if (!parsed.success) notFound();
  const activities = activeActivityDefinitions.filter(({ labId }) => labId === parsed.data);
  if (activities.length === 0) notFound();
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/practice">← Practice</Link>
      <span>{activities.length} active repetitions</span>
    </header>
    <section className={styles.intro}>
      <p>Skill Lab</p>
      <h1>{SKILL_LAB_LABELS[parsed.data]}</h1>
      <span>Commit your reasoning before feedback, then retry the same context.</span>
    </section>
    <section className={styles.grid} aria-label="Available repetitions">
      {activities.map((activity) => <article className={styles.card} key={activity.id}>
        <span>{activity.difficulty} · {activity.estimatedMinutes} min</span>
        <h2>{activity.title}</h2>
        <p>{activity.takeaway}</p>
        <Link href={`/practice/activities/${activity.id}?version=${activity.contentVersion}`}>
          Start {activity.title}
        </Link>
      </article>)}
    </section>
    <RecentActivity className={styles.recent} activityIds={activities.map(({ id }) => id)} />
  </main>;
}
