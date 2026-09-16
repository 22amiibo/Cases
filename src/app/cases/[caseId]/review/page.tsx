import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewSession } from "@/components/review/CaseReplay";
import alpineFitContent from "@/content/cases/alpinefit-profitability.json";
import { CaseDefinitionSchema } from "@/core/schema";
import styles from "./review.module.css";

const alpineFit = CaseDefinitionSchema.parse(alpineFitContent);

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  if (caseId !== alpineFit.id) notFound();

  return (
    <main className={styles.page}>
      <header>
        <Link href={`/cases/${caseId}`}>← Return to case</Link>
        <span>Guest session review</span>
      </header>
      <section className={styles.intro} aria-labelledby="review-title">
        <p>AlpineFit profitability</p>
        <h1 id="review-title">Your case review</h1>
        <p>
          Replay your choices against the case graph, then use the scorecard to
          focus the next practice round.
        </p>
      </section>
      <ReviewSession caseId={caseId} />
    </main>
  );
}
