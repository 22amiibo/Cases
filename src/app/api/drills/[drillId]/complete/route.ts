import { NextResponse } from "next/server";
import { getDrillDefinition } from "@/content/drills";
import { evaluateClarificationQuestions } from "@/core/clarification-drill";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ drillId: string }> },
) {
  const { drillId } = await params;
  const definition = getDrillDefinition(drillId, 2);
  if (!definition || !("scoringVersion" in definition) || definition.skillId !== "clarification") {
    return NextResponse.json({ error: "Drill not found" }, { status: 404 });
  }
  try {
    const body = (await request.json()) as {
      questionIds?: unknown;
      responseId?: unknown;
    };
    if (
      !Array.isArray(body.questionIds) ||
      body.questionIds.some((id) => typeof id !== "string") ||
      typeof body.responseId !== "string"
    ) {
      throw new Error("Invalid questions");
    }
    return NextResponse.json(
      evaluateClarificationQuestions(
        definition,
        body.questionIds as string[],
        body.responseId,
      ),
    );
  } catch {
    return NextResponse.json({ error: "Invalid questions" }, { status: 400 });
  }
}
