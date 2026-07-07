import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const where: Record<string, unknown> = {};
    if (type && type !== "all") where.type = type;
    if (search) where.key = { contains: search };

    const entries = await db.memory.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Failed to fetch memory" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = await db.memory.create({
      data: {
        key: body.key,
        value: body.value || "",
        type: body.type || "short_term",
        tags: body.tags ? JSON.stringify(body.tags) : "[]",
        metadata: body.metadata ? JSON.stringify(body.metadata) : "{}",
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create memory entry" }, { status: 500 });
  }
}