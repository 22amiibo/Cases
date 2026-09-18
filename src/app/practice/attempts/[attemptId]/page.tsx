import Link from "next/link";
import { ActivityAttemptReview } from "@/components/activity/ActivityAttemptReview";
import styles from "../../practice.module.css";

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/practice">← Practice</Link><span>Saved activity review</span></header>
    <section className={styles.intro}><p>Attempt history</p><ActivityAttemptReview attemptId={attemptId} /></section>
  </main>;
}
