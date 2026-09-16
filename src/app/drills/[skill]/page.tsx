import Link from "next/link";
import { notFound } from "next/navigation";
import {
  drillBanks,
  drillSkillIds,
  isDrillSkillId,
} from "@/content/drills";
import { DrillSession } from "@/components/drills/DrillSession";
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
      <DrillSession definitions={drillBanks[skill]} />
    </main>
  );
}
