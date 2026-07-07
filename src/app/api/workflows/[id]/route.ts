import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workflow = await db.workflow.findUnique({
      where: { id },
      include: {
        nodes: { include: { agent: true, tool: true } },
        connections: true,
        executions: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    return NextResponse.json(workflow);
  } catch {
    return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const workflow = await db.workflow.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.config !== undefined && { config: JSON.stringify(body.config) }),
      },
    });
    return NextResponse.json(workflow);
  } catch {
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.workflow.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}