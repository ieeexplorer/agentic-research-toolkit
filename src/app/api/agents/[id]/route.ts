import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        executions: { orderBy: { createdAt: "desc" }, take: 20 },
        workflowNodes: true,
      },
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json(agent);
  } catch {
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const agent = await db.agent.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.systemPrompt !== undefined && { systemPrompt: body.systemPrompt }),
        ...(body.model !== undefined && { model: body.model }),
        ...(body.temperature !== undefined && { temperature: body.temperature }),
        ...(body.maxTokens !== undefined && { maxTokens: body.maxTokens }),
        ...(body.config !== undefined && { config: JSON.stringify(body.config) }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });
    return NextResponse.json(agent);
  } catch {
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.agent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}