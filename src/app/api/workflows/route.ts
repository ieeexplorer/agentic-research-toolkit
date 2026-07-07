import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const where = status && status !== "all" ? { status } : {};
    const workflows = await db.workflow.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { nodes: true, connections: true, executions: true } },
        executions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, duration: true, createdAt: true },
        },
      },
    });
    return NextResponse.json(workflows);
  } catch {
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workflow = await db.workflow.create({
      data: {
        name: body.name,
        description: body.description || "",
        status: body.status || "draft",
        config: body.config ? JSON.stringify(body.config) : "{}",
      },
    });
    return NextResponse.json(workflow, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}