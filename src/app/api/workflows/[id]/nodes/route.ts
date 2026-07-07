import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const body = await req.json();

    const node = await db.workflowNode.create({
      data: {
        workflowId,
        name: body.name || "New Node",
        nodeType: body.nodeType || "agent",
        positionX: body.positionX ?? 100,
        positionY: body.positionY ?? 100,
        config: body.config ? JSON.stringify(body.config) : "{}",
        agentId: body.agentId || null,
        toolId: body.toolId || null,
      },
    });
    return NextResponse.json(node, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create node" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const body: { id: string; positionX?: number; positionY?: number; name?: string; nodeType?: string; agentId?: string | null; toolId?: string | null; config?: object }[] = await req.json();

    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map((node) =>
          db.workflowNode.update({
            where: { id: node.id, workflowId },
            data: {
              ...(node.positionX !== undefined && { positionX: node.positionX }),
              ...(node.positionY !== undefined && { positionY: node.positionY }),
              ...(node.name !== undefined && { name: node.name }),
              ...(node.nodeType !== undefined && { nodeType: node.nodeType }),
              ...(node.agentId !== undefined && { agentId: node.agentId }),
              ...(node.toolId !== undefined && { toolId: node.toolId }),
              ...(node.config !== undefined && { config: JSON.stringify(node.config) }),
            },
          })
        )
      );
      return NextResponse.json(results);
    }
    return NextResponse.json({ error: "Expected array" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to update nodes" }, { status: 500 });
  }
}