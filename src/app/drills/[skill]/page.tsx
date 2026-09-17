import Link from "next/link";
import { notFound } from "next/navigation";
import {
  drillBanks,
  drillSkillIds,
  isDrillSkillId,
  isLegacyDrillSkillId,
  clarificationV2Definition,
} from "@/content/drills";
import { DrillSession } from "@/components/drills/DrillSession";
import { ClarificationDrillSession } from "@/components/drills/ClarificationDrillSession";
import { projectClarificationDrill } from "@/core/clarification-drill";
import styles from "./session.module.css";

export function generateStaticParams() {
  return drillSkillIds.map((skill) => ({ skill }));
}

export default async function DrillSkillPage({
  params,
}: {
  params: Promise<{ skill: string }>;
}) {
  const { skill } = await params;
  if (!isDrillSkillId(skill)) notFound();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/drills">← All drills</Link>
        <span>Casework / {skill}</span>
      </header>
      {isLegacyDrillSkillId(skill) ? (
        <DrillSession definitions={drillBanks[skill]} />
      ) : (
        <ClarificationDrillSession
          definition={projectClarificationDrill(clarificationV2Definition)}
        />
      )}
    </main>
  );
}
