import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tool = await db.tool.findUnique({
      where: { id },
      include: { executions: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    return NextResponse.json(tool);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tool" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const tool = await db.tool.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.endpoint !== undefined && { endpoint: body.endpoint }),
        ...(body.config !== undefined && { config: JSON.stringify(body.config) }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });
    return NextResponse.json(tool);
  } catch {
    return NextResponse.json({ error: "Failed to update tool" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.tool.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete tool" }, { status: 500 });
  }
}