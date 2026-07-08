import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { nodeId } = await params;
    const body = await req.json();
    const node = await db.workflowNode.update({
      where: { id: nodeId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.nodeType !== undefined && { nodeType: body.nodeType }),
        ...(body.positionX !== undefined && { positionX: body.positionX }),
        ...(body.positionY !== undefined && { positionY: body.positionY }),
        ...(body.config !== undefined && { config: JSON.stringify(body.config) }),
        ...(body.agentId !== undefined && { agentId: body.agentId || null }),
        ...(body.toolId !== undefined && { toolId: body.toolId || null }),
      },
    });
    return NextResponse.json(node);
  } catch {
    return NextResponse.json({ error: "Failed to update node" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { nodeId } = await params;
    await db.workflowConnection.deleteMany({
      where: {
        OR: [{ sourceNodeId: nodeId }, { targetNodeId: nodeId }],
      },
    });
    await db.workflowNode.delete({ where: { id: nodeId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete node" }, { status: 500 });
  }
}
