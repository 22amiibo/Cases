import { NextResponse } from "next/server";
import { getActivityDefinition } from "@/content/activities";
import { ActivityEventSchema, replayActivityEvents } from "@/core/activity";
import { projectLearnerActivity } from "@/core/activity-projection";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const { activityId } = await params;
  try {
    const body = await request.json() as { contentVersion?: unknown; events?: unknown };
    if (!Number.isInteger(body.contentVersion) || Number(body.contentVersion) < 1) {
      return NextResponse.json({ error: "Invalid content version" }, { status: 400 });
    }
    const definition = getActivityDefinition(activityId, Number(body.contentVersion));
    if (!definition) {
      return NextResponse.json({ error: "Activity version not found" }, { status: 404 });
    }
    const parsed = ActivityEventSchema.array().safeParse(body.events);
    if (!parsed.success) throw new Error("Invalid activity history");
    return NextResponse.json(projectLearnerActivity(
      definition,
      replayActivityEvents(definition, parsed.data),
    ));
  } catch {
    return NextResponse.json({ error: "Invalid activity history" }, { status: 400 });
  }
}
