import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;
    if (source && source !== "all") where.source = source;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { fileName: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const documents = await db.document.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Documents GET error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const document = await db.document.create({
      data: {
        name: body.name || "Untitled Document",
        description: body.description || "",
        fileName: body.fileName || "",
        fileSize: body.fileSize || 0,
        mimeType: body.mimeType || "application/octet-stream",
        source: body.source || "upload",
        status: "pending",
        content: body.content || "",
        tags: body.tags ? JSON.stringify(body.tags) : "[]",
        metadata: body.metadata ? JSON.stringify(body.metadata) : "{}",
      },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Documents POST error:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}