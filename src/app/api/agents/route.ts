import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const where = type && type !== "all" ? { type } : {};

    const agents = await db.agent.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { executions: true, workflowNodes: true } },
      },
    });

    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agent = await db.agent.create({
      data: {
        name: body.name,
        description: body.description || "",
        type: body.type || "research",
        systemPrompt: body.systemPrompt || "",
        model: body.model || "gpt-4o",
        temperature: body.temperature ?? 0.7,
        maxTokens: body.maxTokens || 4096,
        config: body.config ? JSON.stringify(body.config) : "{}",
        status: body.status || "active",
      },
    });
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}