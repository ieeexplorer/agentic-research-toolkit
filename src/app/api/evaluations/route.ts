import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const where = type && type !== "all" ? { type } : {};
    const evaluations = await db.evaluation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(evaluations);
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const evaluation = await db.evaluation.create({
      data: {
        name: body.name,
        type: body.type || "quality",
        metric: body.metric || "score",
        agentId: body.agentId || null,
        workflowId: body.workflowId || null,
        config: body.config ? JSON.stringify(body.config) : "{}",
      },
    });
    return NextResponse.json(evaluation, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create evaluation" }, { status: 500 });
  }
}