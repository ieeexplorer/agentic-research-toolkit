import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const body = await req.json();
    const connection = await db.workflowConnection.create({
      data: {
        workflowId,
        sourceNodeId: body.sourceNodeId,
        targetNodeId: body.targetNodeId,
        label: body.label || "",
      },
    });
    return NextResponse.json(connection, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const body = await req.json();
    await db.workflowConnection.deleteMany({
      where: {
        workflowId,
        sourceNodeId: body.sourceNodeId,
        targetNodeId: body.targetNodeId,
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 });
  }
}