import { NextResponse } from "next/server";
import { getDrillDefinition } from "@/content/drills";
import { revealClarificationAfterCommit } from "@/core/clarification-drill";
import { CommittedResponseSchema } from "@/core/schema";

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
    const body = (await request.json()) as { response?: unknown };
    const response = CommittedResponseSchema.safeParse(body.response);
    if (!response.success) throw new Error("Invalid response");
    return NextResponse.json(
      revealClarificationAfterCommit(definition, response.data),
    );
  } catch {
    return NextResponse.json({ error: "Invalid commitment" }, { status: 400 });
  }
}
