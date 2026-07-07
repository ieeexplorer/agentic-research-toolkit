import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await db.memory.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: "Memory entry not found" }, { status: 404 });
    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: "Failed to fetch memory entry" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const entry = await db.memory.update({
      where: { id },
      data: {
        ...(body.key !== undefined && { key: body.key }),
        ...(body.value !== undefined && { value: body.value }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.tags !== undefined && { tags: JSON.stringify(body.tags) }),
        ...(body.metadata !== undefined && { metadata: JSON.stringify(body.metadata) }),
      },
    });
    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: "Failed to update memory entry" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.memory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete memory entry" }, { status: 500 });
  }
}