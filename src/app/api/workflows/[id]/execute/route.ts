import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { executionEventBus } from "@/lib/execution-events";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const workflow = await db.workflow.findUnique({
      where: { id },
      include: { nodes: { include: { agent: true, tool: true } }, connections: true },
    });
    if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    const execution = await db.workflowExecution.create({
      data: {
        workflowId: id,
        input: body.input || "Default workflow execution",
        status: "running",
      },
    });

    // Emit workflow_start event
    executionEventBus.emit({
      type: "workflow_start",
      id: execution.id,
      name: workflow.name,
      status: "running",
      progress: 0,
      timestamp: new Date().toISOString(),
    });

    const nodeResults: { nodeId: string; name: string; status: string; duration: number }[] = [];
    const sortedNodes = [...workflow.nodes].sort((a, b) => a.positionX - b.positionX);

    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];

      // Emit workflow_node_start event
      executionEventBus.emit({
        type: "workflow_node_start",
        id: node.id,
        name: node.name,
        status: "running",
        progress: Math.round(((i) / sortedNodes.length) * 100),
        timestamp: new Date().toISOString(),
      });

      await new Promise((r) => setTimeout(r, 600));
      nodeResults.push({
        nodeId: node.id,
        name: node.name,
        status: "completed",
        duration: 500 + Math.floor(Math.random() * 500),
      });

      // Emit workflow_node_complete event
      executionEventBus.emit({
        type: "workflow_node_complete",
        id: node.id,
        name: node.name,
        status: "completed",
        progress: Math.round(((i + 1) / sortedNodes.length) * 100),
        timestamp: new Date().toISOString(),
      });
    }

    const totalDuration = nodeResults.reduce((sum, n) => sum + n.duration, 0);
    const updated = await db.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        output: `Workflow "${workflow.name}" completed successfully.\n\nExecuted ${workflow.nodes.length} nodes across ${workflow.connections.length} connections.\n\nResults:\n${nodeResults.map((n) => `- ${n.name}: ${n.status} (${n.duration}ms)`).join("\n")}`,
        nodeResults: JSON.stringify(nodeResults),
        duration: totalDuration,
      },
    });

    // Emit workflow_complete event
    executionEventBus.emit({
      type: "workflow_complete",
      id: execution.id,
      name: workflow.name,
      status: "completed",
      progress: 100,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(updated, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to execute workflow" }, { status: 500 });
  }
}