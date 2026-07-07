import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const where = type && type !== "all" ? { type } : {};
    const tools = await db.tool.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { executions: true, workflowNodes: true } },
      },
    });
    return NextResponse.json(tools);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tool = await db.tool.create({
      data: {
        name: body.name,
        description: body.description || "",
        type: body.type || "api",
        endpoint: body.endpoint || "",
        config: body.config ? JSON.stringify(body.config) : "{}",
        status: body.status || "active",
      },
    });
    return NextResponse.json(tool, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create tool" }, { status: 500 });
  }
}