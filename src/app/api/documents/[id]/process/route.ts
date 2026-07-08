import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Mark as processing
    await db.document.update({
      where: { id },
      data: { status: "processing" },
    });

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

    // Simulate extraction results
    const wordCount = Math.floor(Math.random() * 8000) + 2000;
    const pageCount = Math.max(1, Math.floor(doc.fileSize / 50000) + 1);
    const sections = Math.floor(Math.random() * 8) + 3;
    const entities = Math.floor(Math.random() * 40) + 10;

    const metadata = {
      wordCount,
      pageCount,
      sections,
      entities,
      language: "en",
      processedAt: new Date().toISOString(),
    };

    // Simulate extracted content preview
    const contentPreview = `Extracted content from "${doc.name}".\n\nThis document contains ${sections} main sections across ${pageCount} pages. Key topics include research methodology, data analysis, and findings.\n\nTotal words: ${wordCount}\nEntities extracted: ${entities}\nProcessing completed successfully.`;

    const updated = await db.document.update({
      where: { id },
      data: {
        status: "completed",
        content: contentPreview,
        metadata: JSON.stringify(metadata),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to process document" }, { status: 500 });
  }
}