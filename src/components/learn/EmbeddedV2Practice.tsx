import { ClarificationDrillSession } from "@/components/drills/ClarificationDrillSession";
import { V2PracticeDrillSession } from "@/components/drills/V2PracticeDrillSession";
import { getDrillDefinition } from "@/content/drills";
import { projectClarificationDrill } from "@/core/clarification-drill";
import { projectV2PracticeDrill } from "@/core/v2-drill";

export function EmbeddedV2Practice({
  drillId,
  contentVersion,
}: {
  drillId: string;
  contentVersion: 2;
}) {
  const definition = getDrillDefinition(drillId, contentVersion);
  if (!definition || !("scoringVersion" in definition) || definition.scoringVersion !== "v2") {
    return null;
  }
  return definition.skillId === "clarification"
    ? <ClarificationDrillSession definition={projectClarificationDrill(definition)} />
    : <V2PracticeDrillSession definition={projectV2PracticeDrill(definition)} />;
}
