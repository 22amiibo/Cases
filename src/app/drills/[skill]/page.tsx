import Link from "next/link";
import { notFound } from "next/navigation";
import {
  drillBanks,
  drillSkillIds,
  isDrillSkillId,
  isLegacyDrillSkillId,
  clarificationV2Definition,
  v2PracticeDefinitions,
} from "@/content/drills";
import { DrillSession } from "@/components/drills/DrillSession";
import { ClarificationDrillSession } from "@/components/drills/ClarificationDrillSession";
import { V2PracticeDrillSession } from "@/components/drills/V2PracticeDrillSession";
import { projectClarificationDrill } from "@/core/clarification-drill";
import { projectV2PracticeDrill } from "@/core/v2-drill";
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
  const v2Definition = skill === "clarification"
    ? null
    : v2PracticeDefinitions.find((definition) => definition.skillId === skill);
  if (skill !== "clarification" && !v2Definition) notFound();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/drills">← All drills</Link>
        <span>Casework / {skill}</span>
      </header>
      {skill === "clarification" ? (
        <ClarificationDrillSession
          definition={projectClarificationDrill(clarificationV2Definition)}
        />
      ) : (
        <>
          <V2PracticeDrillSession definition={projectV2PracticeDrill(v2Definition!)} />
          {isLegacyDrillSkillId(skill) && (
            <details className={styles.legacy}>
              <summary>Open the 10-drill Legacy V1 library</summary>
              <p>Legacy scores remain separate from V2 diagnostic progress.</p>
              <DrillSession definitions={drillBanks[skill]} />
            </details>
          )}
        </>
      )}
    </main>
  );
}
