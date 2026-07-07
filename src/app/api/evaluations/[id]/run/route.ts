import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const evaluation = await db.evaluation.findUnique({ where: { id } });
    if (!evaluation) return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });

    await new Promise((r) => setTimeout(r, 1500));

    const scores = Array.from({ length: 5 }, () => 6 + Math.random() * 4);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const results = scores.map((score, i) => ({
      criterion: `Criterion ${i + 1}`,
      score: Math.round(score * 10) / 10,
      passed: score >= 7,
      notes: `Evaluation of criterion ${i + 1} for ${evaluation.name}`,
    }));

    const updated = await db.evaluation.update({
      where: { id },
      data: {
        results: JSON.stringify(results),
        avgScore: Math.round(avg * 100) / 100,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to run evaluation" }, { status: 500 });
  }
}