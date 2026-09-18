import { NextResponse } from "next/server";
import { getActivityDefinition } from "@/content/activities";
import {
  ActivityEventSchema,
  CourseContextSchema,
  evaluateActivityCompletion,
  replayActivityEvents,
} from "@/core/activity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const { activityId } = await params;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!Number.isInteger(body.contentVersion) || Number(body.contentVersion) < 1) {
      throw new Error("Invalid content version");
    }
    const definition = getActivityDefinition(activityId, Number(body.contentVersion));
    if (!definition) {
      return NextResponse.json({ error: "Activity version not found" }, { status: 404 });
    }
    if (body.courseContext !== undefined && body.courseContext !== null) {
      CourseContextSchema.parse(body.courseContext);
    }
    const events = ActivityEventSchema.array().parse(body.events);
    return NextResponse.json(evaluateActivityCompletion(
      definition,
      replayActivityEvents(definition, events),
    ));
  } catch {
    return NextResponse.json({ error: "Invalid activity completion" }, { status: 400 });
  }
}
