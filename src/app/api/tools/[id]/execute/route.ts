import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const TOOL_OUTPUTS: Record<string, string> = {
  api: `{"status": 200, "data": {"results": 15, "pages": 2, "items": [{"id": 1, "title": "Result 1", "score": 0.94}, {"id": 2, "title": "Result 2", "score": 0.87}]}, "meta": {"query_time_ms": 142}}`,
  search: `Found 23 results across 4 sources:\n\n1. "Agentic AI: A Comprehensive Survey" - arXiv 2024\n2. "Multi-Agent Systems for Research Automation" - Nature 2024\n3. "Tool-Enhanced Language Agents" - ACL 2024\n4. "Evaluation Frameworks for AI Agents" - NeurIPS 2023\n\nTop result relevance score: 96.2%`,
  document: `Document processed successfully.\n- Pages extracted: 24\n- Sections identified: 8\n- Key entities extracted: 156\n- Summary generated: The document presents a novel framework for coordinating multiple AI agents in research workflows, demonstrating a 40% improvement in task completion rates.`,
  database: `Query executed in 45ms.\n\nResults (5 rows):\n| id | name | score | date |\n|----|------|-------|------|\n| 1  | exp-a | 0.92  | 2024-01 |\n| 2  | exp-b | 0.88  | 2024-02 |\n| 3  | exp-c | 0.85  | 2024-03 |\n| 4  | exp-d | 0.91  | 2024-04 |\n| 5  | exp-e | 0.87  | 2024-05 |`,
  local: `Local execution completed.\n- Script: analyze.py\n- Runtime: 2.3s\n- Memory: 128MB\n- Output files: results.csv, chart.png`,
  mcp: `MCP tool invocation successful.\nServer: research-mcp-server\nTool: literature_search\nParameters: {query: "agentic systems", limit: 10}\nResponse: 10 documents retrieved with full metadata.`,
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const tool = await db.tool.findUnique({ where: { id } });
    if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });

    const execution = await db.toolExecution.create({
      data: { toolId: id, input: body.input || "Default tool execution", status: "running" },
    });

    await new Promise((r) => setTimeout(r, 800));

    const output = TOOL_OUTPUTS[tool.type] || TOOL_OUTPUTS.api;
    const updated = await db.toolExecution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        output,
        duration: 800 + Math.floor(Math.random() * 400),
      },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to execute tool" }, { status: 500 });
  }
}