import Link from "next/link";
import { notFound } from "next/navigation";
import {
  drillBanks,
  drillSkillIds,
  isDrillSkillId,
  isLegacyDrillSkillId,
  clarificationV2Definitions,
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
  searchParams,
}: {
  params: Promise<{ skill: string }>;
  searchParams: Promise<{ rep?: string | string[] }>;
}) {
  const { skill } = await params;
  if (!isDrillSkillId(skill)) notFound();
  const definitions = skill === "clarification"
    ? clarificationV2Definitions
    : v2PracticeDefinitions.filter((definition) => definition.skillId === skill);
  const requestedRep = (await searchParams).rep;
  const requestedId = Array.isArray(requestedRep) ? requestedRep[0] : requestedRep;
  const v2Definition = definitions.find(({ id }) => id === requestedId) ?? definitions[0];
  if (!v2Definition) notFound();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/drills">← All drills</Link>
        <span>Casework / {skill}</span>
      </header>
      <nav className={styles.repPicker} aria-label="V2 practice reps">
        <p>Choose a V2 rep</p>
        <div>
          {definitions.map((definition, index) => (
            <Link
              href={`/drills/${skill}?rep=${definition.id}`}
              aria-current={definition.id === v2Definition.id ? "page" : undefined}
              key={definition.id}
            >
              <span>Rep {index + 1}</span>
              {definition.title}
            </Link>
          ))}
        </div>
      </nav>
      {v2Definition.skillId === "clarification" ? (
        <ClarificationDrillSession
          definition={projectClarificationDrill(v2Definition)}
        />
      ) : (
        <>
          <V2PracticeDrillSession definition={projectV2PracticeDrill(v2Definition)} />
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
