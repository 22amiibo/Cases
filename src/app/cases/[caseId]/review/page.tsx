import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewSession } from "@/components/review/CaseReplay";
import { getCaseDefinition } from "@/content/cases";
import styles from "./review.module.css";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ attemptId?: string | string[] }>;
}) {
  const { caseId } = await params;
  const query = await searchParams;
  const attemptId = typeof query.attemptId === "string"
    ? query.attemptId
    : undefined;
  const caseDefinition = getCaseDefinition(caseId);
  if (!caseDefinition && !attemptId) notFound();

  return (
    <main className={styles.page}>
      <header>
        <Link href={`/cases/${caseId}`}>← Return to case</Link>
        <span>{attemptId ? "Historical case review" : "Guest session review"}</span>
      </header>
      <section className={styles.intro} aria-labelledby="review-title">
        <p>{attemptId ? "Saved case attempt" : caseDefinition!.title}</p>
        <h1 id="review-title">Your case review</h1>
        <p>
          Replay your choices against the case graph, then use the scorecard to
          focus the next practice round.
        </p>
      </section>
      <ReviewSession caseId={caseId} attemptId={attemptId} />
    </main>
  );
}
