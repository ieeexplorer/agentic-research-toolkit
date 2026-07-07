import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const evaluation = await db.evaluation.findUnique({ where: { id } });
    if (!evaluation) return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    return NextResponse.json(evaluation);
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluation" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const evaluation = await db.evaluation.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.metric !== undefined && { metric: body.metric }),
        ...(body.config !== undefined && { config: JSON.stringify(body.config) }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.avgScore !== undefined && { avgScore: body.avgScore }),
      },
    });
    return NextResponse.json(evaluation);
  } catch {
    return NextResponse.json({ error: "Failed to update evaluation" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.evaluation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete evaluation" }, { status: 500 });
  }
}