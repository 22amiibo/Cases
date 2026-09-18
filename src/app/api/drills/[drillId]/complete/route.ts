import { NextResponse } from "next/server";
import { getDrillDefinition } from "@/content/drills";
import { evaluateClarificationQuestions } from "@/core/clarification-drill";
import { validateCompletedLearningCycleState } from "@/core/learning-cycle";
import { evaluateV2Checkpoint } from "@/core/v2-drill";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ drillId: string }> },
) {
  const { drillId } = await params;
  const definition = getDrillDefinition(drillId, 2);
  if (!definition || !("scoringVersion" in definition) || definition.scoringVersion !== "v2") {
    return NextResponse.json({ error: "Drill not found" }, { status: 404 });
  }
  try {
    const body = (await request.json()) as {
      questionIds?: unknown;
      cycle?: unknown;
      submission?: unknown;
    };
    const cycle = validateCompletedLearningCycleState(
      body.cycle,
      definition.responseCycle,
    );
    const responseId = cycle?.responses.at(-1)?.responseId;
    if (!responseId) throw new Error("Invalid response");
    if (definition.skillId === "clarification") {
      if (
        !Array.isArray(body.questionIds) ||
        body.questionIds.some((id) => typeof id !== "string")
      ) throw new Error("Invalid questions");
      return NextResponse.json(evaluateClarificationQuestions(
        definition,
        body.questionIds as string[],
        responseId,
      ));
    }
    return NextResponse.json(
      evaluateV2Checkpoint(definition, body.submission as never, responseId),
    );
  } catch {
    return NextResponse.json({ error: "Invalid checkpoint" }, { status: 400 });
  }
}
